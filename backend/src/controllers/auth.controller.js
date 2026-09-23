import { buildOwnUserResponse, generateToken, isImageDataUri } from "../lib/utils.js";
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import cloudinary from "../lib/cloudinary.js";
import { io, isUserOnline } from "../lib/socket.js";
import crypto from "crypto";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;
const MAX_FULL_NAME_LENGTH = 50;
const MIN_PASSWORD_LENGTH = 6;
const MAX_PASSWORD_LENGTH = 128;

// Emails are stored lowercased from now on, but accounts created earlier may keep
// their original letter case. The lookup is case-insensitive (same collation as the
// signup duplicate check), and a candidate is only accepted when its password matches,
// so older accounts that differ only by letter case can each still log in.
const findUserByCredentials = async (email, password) => {
  const candidates = await User.find({ email: email.trim() })
    .collation({ locale: "en", strength: 2 })
    .limit(5);

  for (const candidate of candidates) {
    if (await bcrypt.compare(password, candidate.password)) {
      return candidate;
    }
  }

  return null;
};

export const signup = async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    if (typeof fullName !== "string" || typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({ message: "All fields are required" });
    }

    const trimmedFullName = fullName.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (!trimmedFullName || !normalizedEmail || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (trimmedFullName.length > MAX_FULL_NAME_LENGTH) {
      return res.status(400).json({ message: `Full name must be at most ${MAX_FULL_NAME_LENGTH} characters` });
    }

    if (normalizedEmail.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(normalizedEmail)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    if (password.length > MAX_PASSWORD_LENGTH) {
      return res.status(400).json({ message: `Password must be at most ${MAX_PASSWORD_LENGTH} characters` });
    }

    // Case-insensitive match, so a new account cannot differ from an older
    // mixed-case account only by letter case.
    const user = await User.findOne({ email: normalizedEmail }).collation({ locale: "en", strength: 2 });

    if (user) return res.status(400).json({ message: "Email already exists" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const sessionId = crypto.randomUUID();

    const newUser = new User({
      fullName: trimmedFullName,
      email: normalizedEmail,
      password: hashedPassword,
      sessionId,
    });

    if (newUser) {
      // generate jwt token here
      generateToken(newUser._id, res, sessionId);
      await newUser.save();

      res.status(201).json({
        _id: newUser._id,
        fullName: newUser.fullName,
        email: newUser.email,
        profilePic: newUser.profilePic,
        createdAt: newUser.createdAt,
      });
    } else {
      res.status(400).json({ message: "Invalid user data" });
    }
  } catch (error) {
    console.log("Error in signup controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Lookup inputs only: format and length rules are enforced at signup, so
    // applying them here could only lock out accounts that already exist.
    if (typeof email !== "string" || typeof password !== "string" || !email.trim() || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const user = await findUserByCredentials(email, password);

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Single Active Session check
    if (isUserOnline(user._id)) {
      return res.status(400).json({ message: "Account is currently active on another device." });
    }

    const sessionId = crypto.randomUUID();
    user.sessionId = sessionId;
    await user.save();

    generateToken(user._id, res, sessionId);

    res.status(200).json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      profilePic: user.profilePic,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.log("Error in login controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const logout = async (req, res) => {
  try {
    if (req.user) {
      await User.findByIdAndUpdate(req.user._id, { sessionId: "" });
      // Sockets opened with the ended session would otherwise keep receiving
      // messages and keep the account marked as active.
      io.in(req.user._id.toString()).disconnectSockets(true);
    }
    res.cookie("jwt", "", { maxAge: 0 });
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.log("Error in logout controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { profilePic } = req.body;
    const userId = req.user._id;

    if (!profilePic) {
      return res.status(400).json({ message: "Profile pic is required" });
    }

    if (!isImageDataUri(profilePic)) {
      return res.status(400).json({ message: "Profile pic must be an image" });
    }

    const uploadResponse = await cloudinary.uploader.upload(profilePic);
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { profilePic: uploadResponse.secure_url },
      { new: true }
    );

    res.status(200).json(buildOwnUserResponse(updatedUser));
  } catch (error) {
    console.log("error in update profile:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const checkAuth = (req, res) => {
  try {
    res.status(200).json(buildOwnUserResponse(req.user));
  } catch (error) {
    console.log("Error in checkAuth controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
