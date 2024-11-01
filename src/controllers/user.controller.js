import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
// import { validate } from "uuid";
import jwt from 'jsonwebtoken'
import { Subscription } from "../models/subscriptions.model.js";

const registerUser = asyncHandler(async (req, res) => {
     console.log(req.files);
     const { fullname, email, username, password } = req.body;

     if (
          [fullname, email, password, username].some((field) => field?.trim() === "")
     ) {
          throw new ApiError(400, "all fields are required");
     }

     // Check if user exists or not
     const existedUser = await User.findOne({
          $or: [{ username }, { email }],
     });

     if (existedUser) {
          throw new ApiError(409, "username or email already exist");
     }

     // Image handling
     const avatarLocalPath = req.files?.avatar?.[0]?.path;
     const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

     // Check if avatar is present
     if (!avatarLocalPath) {
          throw new ApiError(400, "avatar is required");
     }

     // Upload to Cloudinary
     const avatar = await uploadOnCloudinary(avatarLocalPath);
     const coverImage = coverImageLocalPath
          ? await uploadOnCloudinary(coverImageLocalPath)
          : null;

     if (!avatar) {
          throw new ApiError(500, "failed to upload avatar on cloudinary");
     }
     if (coverImageLocalPath && !coverImage) {
          throw new ApiError(500, "failed to upload cover image on cloudinary");
     }

     const user = await User.create({
          fullname,
          email,
          username: username.toLowerCase(),
          password,
          avatar: avatar.url,
          coverImage: coverImage?.url || "",
     });

     const createdUser = await User.findById(user._id).select(
          "-password -refreshToken"
     );
     if (!createdUser) {
          throw new ApiError(500, "something went wrong while creating the user");
     }

     return res
          .status(201)
          .json(new ApiResponse(200, createdUser, "user created successfully"));
});

const generateAccessAndRefreshToken = async (userId) => {
     try {
          const user = await User.findById(userId);
          const accessToken = user.generateAccessToken();
          const refreshToken = user.generateReferenceToken();
          user.refreshToken = refreshToken;
          await user.save({ validateBeforeSave: false });

          return { accessToken, refreshToken };
     } catch (error) {
          throw new ApiError(
               500,
               "Something went wrong while generating and refresh and acsess Token "
          );
     }
};

const loginUser = asyncHandler(async (req, res) => {
     // extract username or email and password from request,
     // validate the email and password
     // check email or email exist in database or not
     // check password
     // access and refresh Token generation
     // send these token in secure-cookies and a response to user

     const { email, username, password } = req.body;
     // if (!username && !email) {
     //      throw new ApiError(400, "username or email is required");
     // }
     if (!email) {
          throw new ApiError(400, "email is required");
     }
     const user = await User.findOne({
          $or: [{ email }, { username }],
     });

     if (!user) {
          throw new ApiError(404, "User do not exist");
     }

     const isPasswordValid = await user.isPasswordCorrect(password);

     if (!isPasswordValid) {
          throw new ApiError(401, "Invalid Password");
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
                    { user: loggedInUser, accessToken, refreshToken },
                    "User logged in successfully"
               )
          );
});


const logoutUser = asyncHandler(async (req, res) => {
     await User.findByIdAndUpdate(
          req.user._id,
          {
               $set: { refreshToken: undefined },
          },
          { new: true }
     )

     const options = {
          httpOnly: true,
          secure: true,
     };

     return res
          .status(200)
          .clearCookie('accessToken', options)
          .clearCookie('refreshToken', options)
          .json(new ApiResponse(200, {}, "User logged out successfully"))
})

const refreshAccessToken = asyncHandler(async (req, res) => {
     const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
     if (!incomingRefreshToken) {
          throw new ApiError(401, 'Anauthorized request');
     }

     const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
     const user = await User.findById(decodedToken?._id)

     if (!user) {
          throw new ApiError(401, 'Invalid refresh Token')
     }

     try {
          const { accessToken, refreshToken } = generateAccessAndRefreshToken(user._id);
          const options = {
               httpOnly: true,
               secure: true
          }
          return res
               .status(200)
               .cookie('accessToken', accessToken, options)
               .cookie('refresh', refreshToken, options)
               .json(
                    new ApiResponse(
                         200,
                         refreshToken,   // it can be give error
                         "Access token and refresh token generated successfully"
                    )
               )
     } catch (error) {
          throw new ApiError(401, error?.message || 'Invalid refresh Token')
     }
})

const changeCurrentPassword = asyncHandler(async (req, res) => {
     const { oldPassword, newPassword } = req.body;
     const userId = req.user?._id
     const user = await findById(userId)
     const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)
     if (!isPasswordCorrect) {
          throw new ApiError(400, 'Please  enter correct old password')
     }
     user.password = newPassword;
     await user.save({ validateBeforeSave: false });

     return res
          .status(200)
          .json(
               new ApiResponse(200, {}, 'Password changed successfully')
          )
})

const getCurrentUser = asyncHandler(async (req, res) => {
     const currentUser = req.user;
     if (!currentUser) {
          throw new ApiError(404, 'User not found')
     }
     return res
          .status(200)
          .json(new ApiResponse(200, currentUser, 'User found successfully'))
})


const updateAccountDetail = asyncHandler(async (req, res) => {
     const { fullname, email } = req.body;
     if (!fullname && !email) {
          throw new ApiError(400, 'Please provide all fields')
     }
     const user = await User.findByIdAndUpdate(
          req.user?._id,
          {
               $set: {
                    fullname,
                    email
               }
          },
          { new: true }
     ).select("-password")

     return res
          .status(200)
          .json(new ApiResponse(200, user, 'Account details updated successfully'))
})

const updateUserAvatar = asyncHandler(async (req, res) => {
     const avatarLocalPath = req.file?.path
     if (!avatarLocalPath) {
          throw new ApiError(400, 'Avatar file is missing')
     }
     const avatar = await uploadOnCloudinary(avatarLocalPath)
     if (!avatar.url) {
          throw new ApiError(400, 'Error while  uploading avatar')
     }
     const user = await User.findByIdAndUpdate(
          req.user?._id,
          {
               $set: {
                    avatar: avatar.url
               }
          },
          {
               new: true
          }
     ).select('-password')

     return res
          .status(200)
          .json(new ApiResponse(200, user, 'Avatar updated successfully'))
})

const updateUserCoverImage = asyncHandler(async (req, res) => {
     const coverImageLocalPath = req.file?.path
     if (!coverImageLocalPath) {
          throw new ApiError(400, 'Cover image file is missing')
     }
     const coverImage = await uploadOnCloudinary(coverImageLocalPath)
     if (!coverImage.url) {
          throw new ApiError(400, 'Error while  uploading cover image')
     }
     const user = await User.findByIdAndUpdate(
          req.user?._id,
          {
               $set: {
                    coverImage: coverImage.url
               }
          },
          {
               new: true
          }
     ).select('-password')

     return res
          .status(200)
          .json(new ApiResponse(200, user, 'CoverImage updated successfully'))
})


const getUserChannelProfile = asyncHandler(async (req, res) => {
     const { username } = req.params;
     if (!username?.trim()) {
          throw new ApiError(400, 'Username is missing ');
     }
     // getting channel deitals 
     const channel = await User.aggregate([
          {
               $match: {
                    username: username?.toLowerCase()
               }
          },
          {
               $lookup: {
                    from: "subscriptions",
                    localField: "_id",
                    foreignField: "channel",
                    as: 'subscribers'
               }
          },
          {
               $lookup: {
                    from: "subscriptions",
                    localField: "_id",
                    foreignField: "subscriber",
                    as: 'subcribedTo'
               }
          },
          {
               $addFields: {
                    subscribersCount: {
                         $size: "$subscribers"
                    },
                    channelsSubcribedToCount: {
                         $size: "$subcribedTo"
                    },
                    isSubscribed: {
                         $cond: {
                              if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                              then: true,
                              else: false
                         }
                    },
               }
          },
          {
               $project: {
                    fullname: 1,
                    username: 1,
                    subscribersCount: 1,
                    channelsSubcribedToCount: 1,
                    isSubscribed: 1,
                    avatar: 1,
                    coverImage: 1,
                    email: 1,
               }
          }
     ])

     if (!channel?.length) {
          throw new ApiError(404, 'Channel not found')
     }
     return res
          .status(200)
          .json(new ApiResponse(200, channel[0], 'User channel fetched  successfully'))
})



export {
     registerUser,
     loginUser,
     logoutUser,
     refreshAccessToken,
     changeCurrentPassword,
     getCurrentUser,
     updateAccountDetail,
     updateUserCoverImage,
     updateUserAvatar,
     getUserChannelProfile
};
