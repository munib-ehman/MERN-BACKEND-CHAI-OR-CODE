import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/Cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

// helper function

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while creating access and refresh token"
    );
  }
};

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

  const existingUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existingUser) {
    throw new ApiError(409, "User with this username and email already exist");
  }

  const avatarLocalPath = req.files.avatar ? req.files.avatar[0]?.path : null;
  let coverImageLocalPath = req.files?.coverImage;
  if (coverImageLocalPath && Array.isArray(coverImageLocalPath)) {
    coverImageLocalPath = coverImageLocalPath[0]?.path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar Image is required");
  }

  const cloudinaryAvatar = await uploadOnCloudinary(avatarLocalPath);
  const cloudinaryCoverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!cloudinaryAvatar) {
    throw new ApiError(500, "Failed to upload on cloudinary");
  }

  const user = await User.create({
    fullname,
    username: username.toLowerCase(),
    email,
    password,
    avatar: cloudinaryAvatar.url,
    coverImage: cloudinaryCoverImage?.url || "",
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "Failed to create user");
  }

  res
    .status(200)
    .json(new ApiResponse(200, createdUser, "User Registered successfuly"));
});

const loginUser = asyncHandler(async (req, res) => {
  // data from forntend
  // validate data
  // check for user crrendtials
  // create accessToken and refresh token
  // end cookies

  const { username, email, password } = req.body;

  if (!(username || email)) {
    throw new ApiError(400, "username or email is required");
  }

  const user = await User.findOne({
    $or: [{ email }],
  });
  if (!user) {
    throw new ApiError(400, "User does not exist");
  }

  const isPassowrdValid = await user.isPasswordCorrect(password);

  if (!isPassowrdValid) {
    throw new ApiError(401, "Invalid user credentials");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "user logged in successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );
  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "logout successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  try {
    const incomingRefreshToken =
      req.cookies.refreshToken || req.body.refreshToken;
  
    if (!incomingRefreshToken) {
      throw new ApiError(401, "Unauthorize request");
    }
  
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
  
    const user = await User.findById(decodedToken?._id);
  
    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }
    if (incomingRefreshToken !== user.refreshToken) {
      throw new ApiError(401, "Invald or expired refresh token");
    }
    console.log('in');
  
    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(
      user._id
    );
    console.log(accessToken,refreshToken);
  
    const options = {
      httpOnly: true,
      secure: true,
    };
  
    res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken },
          "access token refresh"
        )
      );
  } catch (error) {
    throw new ApiError(500,  "something went wrong while refreshing token")
  }
});

export { registerUser, loginUser, logoutUser, refreshAccessToken };
