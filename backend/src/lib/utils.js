import jwt from "jsonwebtoken";
import mongoose from "mongoose";

// The only fields of another user that a logged-in user may see.
// email, sessionId, pushSubscriptions and password stay private.
export const PUBLIC_USER_FIELDS = "_id fullName profilePic lastSeen createdAt";

export const generateToken = (userId, res, sessionId) => {
  const token = jwt.sign({ userId, sessionId }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

  res.cookie("jwt", token, {
    maxAge: 7 * 24 * 60 * 60 * 1000, // MS
    httpOnly: true, // prevent XSS attacks cross-site scripting attacks
    sameSite: "strict", // CSRF attacks cross-site request forgery attacks
    secure: process.env.NODE_ENV !== "development",
  });

  return token;
};

// mongoose.Types.ObjectId.isValid also accepts any 12-character string,
// so the 24-hex-character form is required as well.
export const isValidObjectId = (id) =>
  typeof id === "string" && /^[0-9a-fA-F]{24}$/.test(id) && mongoose.Types.ObjectId.isValid(id);

// The logged-in user's own profile. Never includes password, sessionId or pushSubscriptions.
export const buildOwnUserResponse = (user) => ({
  _id: user._id,
  fullName: user.fullName,
  email: user.email,
  profilePic: user.profilePic,
  lastSeen: user.lastSeen,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

// Only the start of the value is inspected, so a multi-megabyte upload is not scanned in full.
const BASE64_DATA_URI_PREFIX = /^data:([a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+)(?:;[a-z0-9!#$&^_.+-]+=[a-z0-9!#$&^_.+-]+)*;base64,/i;

const getDataUriMimeType = (value) => {
  const match = BASE64_DATA_URI_PREFIX.exec(value.slice(0, 256));
  return match ? match[1].toLowerCase() : null;
};

// Forwarded messages re-send URLs of files already uploaded to this app's Cloudinary account.
// Anything else is rejected so the server cannot be used to pull arbitrary URLs into Cloudinary.
const isOwnCloudinaryUrl = (value) => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  if (!cloudName) return false;

  let parsedUrl;
  try {
    parsedUrl = new URL(value);
  } catch {
    return false;
  }

  return (
    parsedUrl.href === value &&
    parsedUrl.protocol === "https:" &&
    parsedUrl.hostname === "res.cloudinary.com" &&
    parsedUrl.port === "" &&
    !parsedUrl.username &&
    !parsedUrl.password &&
    parsedUrl.pathname.startsWith(`/${cloudName}/`)
  );
};

export const isImageDataUri = (value) =>
  typeof value === "string" && Boolean(getDataUriMimeType(value)?.startsWith("image/"));

export const isAllowedImageInput = (value) =>
  typeof value === "string" && (isImageDataUri(value) || isOwnCloudinaryUrl(value));

// The voice recorder produces audio/webm; some browsers label WebM recordings video/webm.
export const isAllowedAudioInput = (value) => {
  if (typeof value !== "string") return false;
  const mimeType = getDataUriMimeType(value);
  if (mimeType) return mimeType.startsWith("audio/") || mimeType === "video/webm";
  return isOwnCloudinaryUrl(value);
};
