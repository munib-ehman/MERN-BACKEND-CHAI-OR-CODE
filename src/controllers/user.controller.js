import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/Cloudinary.js"
import { ApiResponse} from "../utils/ApiResponse.js"

const registerUser = asyncHandler(async (req, res) => {
  // get data from front-end
  // req validate
  // check user exist
  // check images, check for avatar
  // upload to server
  // uplaod cloudinary, avatar
  // create user object-create entry
  // remove password and refresh tokens from response

  const { username, email, fullname, password } = req.body;


  if (
    [fullname, username, email, password].some((field) => field.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  const existingUser =  await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existingUser) {
    throw new ApiError(409, "User with this username and email already exist");
  }

  const avatarLocalPath = req.files.avatar ? req.files.avatar[0]?.path: null;
  let coverImageLocalPath = req.files?.coverImage;
  if(coverImageLocalPath && Array.isArray(coverImageLocalPath)){
    coverImageLocalPath=coverImageLocalPath[0]?.path
  }


  if(!avatarLocalPath){
    throw new ApiError(400,"Avatar Image is required")
  }

  const cloudinaryAvatar = await uploadOnCloudinary(avatarLocalPath);
  const cloudinaryCoverImage = await uploadOnCloudinary(coverImageLocalPath);

  if(!cloudinaryAvatar){
    throw new ApiError(500,"Failed to upload on cloudinary")
  }

 const user = await User.create({
    fullname,
    username: username.toLowerCase(),
    email,
    password,
    avatar: cloudinaryAvatar.url,
    coverImage : cloudinaryCoverImage?.url || ""
  })

  const createdUser = await User.findById(user._id).select("-password -refreshToken");

  if(!createdUser){
    throw new ApiError(500,"Failed to create user")
  }
   

  res.status(200).json(new ApiResponse(200,createdUser,"User Registered successfuly" ));
});

export { registerUser };
 