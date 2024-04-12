import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import User from '../models/user.model.js'
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import jwt from 'jsonwebtoken';



const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        // console.log("accessToken : ", accessToken);
        const refreshToken = user.generateRefreshToken();
        // console.log("refreshToken : ", refreshToken);

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (err) {
        throw new ApiError(500, "Something went wrong while generating access and refresh token");
    }
}

const registerUser = asyncHandler(async (req, res) => {
    // step 1 : get user details from frontend
    const { email, username, password, fullname } = req.body;

    // step 2 : validation on data
    if ([email, username, password, fullname].some((field) => field?.trim === "")) {
        throw new ApiError(400, "All fields are mandatory")
    }

    // step 3 : check if user already exists (username and email)
    let alreadyUser = await User.findOne({
        $or: [{ username }, { email }]
    });
    if (alreadyUser) {
        throw new ApiError(409, `User with username or email already exists`);
    }

    // step 4 : check for images, check for avatar

    // console.log("req.files : ",req.files);

    const avatarLocalPath = req.files?.avatar[0]?.path
    let coverImageLocalPath;
    //  if we pass nothing in coverImage ?. operator will give undefined error.
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }

    // step 5 : upload them to cloudinary, avatar check
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar is required")
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    // console.log("avatar : ",avatar);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    if (!avatar) {
        throw new ApiError(400, "Avatar is required")
    }

    // step 6 : create user object - create entry in db
    const user = await User.create({
        fullname,
        email,
        password,
        username: username.toLowerCase(),
        avatar: avatar.url,
        coverImage: coverImage?.url || ""
    })

    // step 7 : remove password and referesh token from response
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    // step 8 : check for user creation
    if (!createdUser) {
        throw new ApiError(500, "Something went wrong, User is not registered 😥")
    }
    // step 9 : return res or any error if exists
    res.status(201).json(
        new ApiResponse(201, createdUser, "User registered Successfully 🥳")
    )
})

const loginUser = asyncHandler(async (req, res) => {
    // email and username from user
    let { username, email, password } = req.body;

    // validation
    if (!(username || email)) {
        throw new ApiError(400, "Invalid username or email");
    }

    // check if user with this email exists or not
    const user = await User.findOne({
        $or: [{ email }, { username }]
    })

    if (!user) {
        throw new ApiError(404, "User does not Exist");
    }

    // check password 
    const isPasswordValid = await user.isPasswordCorrect(password);
    if (!isPasswordValid) {
        throw new ApiError(400, "Incorrect user credentials");
    }
    // if password is correct then generate access an refresh token
    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    // send them in cookies 

    const cookieOptions = {
        httpOnly: true, // only modifyable through server
        secure: true
    }

    return res.status(200)
        .cookie("accessToken", accessToken, cookieOptions)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .json(
            new ApiResponse(
                200,
                {
                    user: { loggedInUser, accessToken, refreshToken }
                },
                "User logged in successfully"
            )
        )
})

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: { refreshToken: undefined }
        },
    )

    const cookieOptions = {
        httpOnly: true,
        secure: true
    }


    res.status(200)
        .clearCookie("accessToken", cookieOptions)
        .clearCookie("refreshToken", cookieOptions)
        .json(new ApiResponse(200, {}, "User Logged out successfully"));
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    let incomingRefreshToken = req.cookie.refreshToken || req.body.refreshToken;
    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized Request");
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
        const user = await User.findById(decodedToken?._id);
    
        if(!user){
            throw new ApiError(401, "Invalid Rfersh Token");
        }
    
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401, "Refresh token is expired or used");
        }
    
        const cookieOptions = {
            httpOnly :true,
            secure : true
        }
    
        const {accessToken, newRefreshToken} = await generateAccessAndRefreshToken(user._id);
    
        res.status(200)
        .cookie("accessToken", accessToken, cookieOptions)
        .cookie("refreshToken", newRefreshToken, cookieOptions)
        .json(
            new ApiResponse(
                200,
                {accessToken, newRefreshToken},
                "Access token refreshed successfully"
            )
        )
    } catch (error) {
        throw new ApiError(500, error?.message || "Invalid refrsh token");
    }

})

const changePassword = asyncHandler( async (req,res) => {
    let {oldPassword, newPassword} = req.body;
    
    const user = await User.find(req.user._id);
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

    if(!isPasswordCorrect){
        throw new ApiError(400, "Wrong Password");
    }

    user.password = newPassword;
    await user.save({validateBeforeSave : false})

    res.status(200).json(
        new ApiResponse(
            200,
            {},
            "Password changed successfully"
        )
    )
})

const getCurrentUser = asyncHandler(async (req,res) => {
    return res.status(200)
            .json(
                new ApiResponse(
                    200,
                    req.user,
                    "Current user fetched successfully"
                )
            )
})

const changeUserDetails = asyncHandler(async (req,res) => {
    let {fullname, email} = req.body;

    if(!fullname || !email){
        throw new ApiError(400, "Invalid Input");
    }

    const user = await User.findByIdAndUpdate(
        req.user._id, 
        {
            $set : {
                fullname,
                email
            },
        },
        {
            new : true,
        }
    ).select("-password")

    res.status(200).json(
        new ApiResponse(
            200,
            user,
            "Details updated sucessfully"
        )
    )
})

export { registerUser, loginUser, logoutUser, refreshAccessToken, changePassword, getCurrentUser };
