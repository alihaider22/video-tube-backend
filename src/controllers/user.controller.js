import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import User from "../models/user.model.js";

const registerUser = asyncHandler(async (req, res) => {
  // Get user details from frontend
  const { username, email, fullName, password } = req.body;

  console.log("body: ", req.body);

  // Validation - check if all required fields are provided
  if (
    [username, email, fullName, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  // Validate email format
  if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
    throw new ApiError(400, "Invalid email format");
  }

  // Check if user already exists
  const existingUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existingUser) {
    throw new ApiError(409, "User with email or username already exists");
  }

  // Handle file uploads if provided
  let avatarLocalPath;
  if (req.files && req.files.avatar) {
    avatarLocalPath = req.files.avatar[0]?.path;
  }

  let coverImageLocalPath;
  if (req.files && req.files.coverImage) {
    coverImageLocalPath = req.files.coverImage[0]?.path;
  }

  let avatarUrl = "";
  if (avatarLocalPath) {
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    if (!avatar) {
      throw new ApiError(400, "Avatar file upload failed");
    }
    avatarUrl = avatar.url;
  }

  let coverImageUrl = "";
  if (coverImageLocalPath) {
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    if (coverImage) {
      coverImageUrl = coverImage.url;
    }
  }

  // Create user object
  const user = await User.create({
    fullName,
    username: username.toLowerCase(),
    email: email.toLowerCase(),
    password,
    avatar: avatarUrl,
    coverImage: coverImageUrl,
  });

  // Check if user was created successfully and return without sensitive data
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered Successfully"));
});

export { registerUser };
