import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/Cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

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
    console.log("in");

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
      user._id
    );
    console.log(accessToken, refreshToken);

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
    throw new ApiError(500, "something went wrong while refreshing token");
  }
});

const changePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user?._id);

  const isValidPassword = await user.isPasswordCorrect(oldPassword);

  if (!isValidPassword) {
    throw new ApiError(401, "Invalid old password");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password updated successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "current user found successfully"));
});

const updateAccountDetail = asyncHandler(async (req, res) => {
  const { fullname, email } = req.body;

  if (!fullname || !email) {
    throw new ApiError(401, "fullname and email is required");
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      fullname,
      email,
    },
    {
      new: true,
    }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(
      new ApiResponse(200, user, "user account details updated successfully")
    );
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarFile = req.file?.path;

  if (!avatarFile) {
    throw new ApiError(401, "Avatar is required");
  }

  const avatar = await uploadOnCloudinary(avatarFile);
  if (!avatar.url) {
    throw new ApiError(401, "Error while uploading avatar");
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar updated successfully"));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageFile = req.file?.path;

  if (!coverImageFile) {
    throw new ApiError(401, "Cover Image is required");
  }

  const coverImage = await uploadOnCloudinary(coverImageFile);
  if (!coverImage.url) {
    throw new ApiError(401, "Error while uploading cover Image");
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    { new: true }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Cover Image updated successfully"));
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;
  if (!username) {
    throw new ApiError(401, "Username is missing");
  }

  const channel = await User.aggregate([
    {
      $match: { username: username.toLowerCase() },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscriptionCount: {
          $size: "$subscribers",
        },
        channelSubscribedToCount: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullname: 1,
        email: 1,
        username: 1,
        subscriptionCount: 1,
        channelSubscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
      },
    },
  ]);

  if (channel?.length < 1) {
    throw new ApiError(401, "channel not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, channel[0], "channel get successfully"));
});

const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullname: 1,
                    email: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
  ]);
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user[0].watchHistory,
        "user watch history fetched successfully"
      )
    );
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changePassword,
  getCurrentUser,
  updateAccountDetail,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getWatchHistory,
};
