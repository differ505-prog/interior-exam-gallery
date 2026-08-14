import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export const cloudinaryCloudName = process.env.CLOUDINARY_CLOUD_NAME || null;
export const cloudinaryFolder = process.env.CLOUDINARY_FOLDER || "draft-gallery";

export const hasCloudinaryEnv = Boolean(
  cloudinaryCloudName &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET,
);

export { cloudinary };
