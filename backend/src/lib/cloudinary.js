import { v2 as cloudinary } from "cloudinary";

// index.js imports "dotenv/config" before any other module, so process.env is populated here.
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME?.trim(),
  api_key: process.env.CLOUDINARY_API_KEY?.trim(),
  api_secret: process.env.CLOUDINARY_API_SECRET?.trim(),
});

export default cloudinary;
