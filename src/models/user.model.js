import mongoose, {Schema} from 'mongoose';

const userSchema = new Schema({
    username : {
        type : String,
        required : true,
        unique : true,
        lowercase : true,
        trim : true, // removes leading or trailing spaces
        index : true // Indexes are essentially data structures that help MongoDB quickly locate documents based on specific field values.
        // Creating an index on username can significantly improve performance when searching for users by username
    },
    email : {
        type : String,
        required : true,
        unique : true,
        lowercase : true,
        trim : true
    },
    fullname : {
        type : String,
        required : true,
        trim : true,
        index : true
    },
    avatar : {
        type : String, // cloudinary url
        required : true,
    },
    coverImage : {
        type : String, // cloudinary url
    },
    watchHistory : [
        {
            type : Schema.Types.ObjectId,
            ref : "Video"
        }
    ],
    password : {
        type : String,
        required : [true, "Password is required"]
    },
    refreshToken : {
        type : string
    }

},{timestamps : true})

const User = mongoose.model("User", userSchema);

export default User;