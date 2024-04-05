import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import User from '../models/user.model.js'
import { uploadOnCloudinary } from '../utils/cloudinary.js';

const registerUser = asyncHandler(async (req,res) => {
    // step 1 : get user details from frontend
    const {email, username, password, fullname} = req.body;

    // step 2 : validation on data
    if( [email,username,password,fullname].some((field) => field?.trim === "") ){
        throw new ApiError(400,"All fields are mandatory")
    }

    // step 3 : check if user already exists (username and email)
    let alreadyUser = await User.findOne({
        $or : [ { username } , { email } ]
    });
    if(alreadyUser){
        throw new ApiError(409, `User with username or email already exists`);
    }

    // step 4 : check for images, check for avatar
    const avatarLocalPath = req.files?.avatar[0]?.path
    const coverImageLocalPath = req.files?.coverImage[0]?.path

    // step 5 : upload them to cloudinary, avatar check
    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar is required")
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    if(!avatar){
        throw new ApiError(400,"Avatar is required")
    }

    // step 6 : create user object - create entry in db
    const user = await User.create({
        fullname,
        email,
        password,
        username : username.toLowerCase(),
        avatar : avatar.url,
        coverImage : coverImage?.url || ""
    })

    // step 7 : remove password and referesh token from response
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    
    // step 8 : check for user creation
    if(!createdUser){
        throw new ApiError(500, "Something went wrong, User is not registered 😥")
    }
    // step 9 : return res or any error if exists
    res.status(201).json(
        new ApiResponse(201,createdUser,"User registered Successfully 🥳")
    )
})

export {registerUser}
