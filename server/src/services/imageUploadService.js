import fs from 'fs/promises';
import path from 'path';
import { Readable } from 'stream';

import { cloudinary, isCloudinaryConfigured } from '../config/cloudinary.js';
import ApiError from '../utils/ApiError.js';

const uploadDirectory = path.resolve('uploads');
const defaultProductFolder = process.env.CLOUDINARY_UPLOAD_FOLDER || 'customized-tshirt/products';
const defaultAvatarFolder = process.env.CLOUDINARY_AVATAR_FOLDER || 'customized-tshirt/avatars';
const defaultCustomizationFolder =
  process.env.CLOUDINARY_CUSTOMIZATION_FOLDER || 'customized-tshirt/customizations';

const buildSafeFilename = (file) => {
  const originalName = file?.originalname || 'image';
  const extension = path.extname(originalName) || '.png';
  const baseName = originalName
    .replace(extension, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return `${Date.now()}-${baseName || 'upload'}${extension}`;
};

const saveLocally = async (file) => {
  const filename = buildSafeFilename(file);
  await fs.mkdir(uploadDirectory, { recursive: true });
  await fs.writeFile(path.join(uploadDirectory, filename), file.buffer);

  return {
    url: `/uploads/${filename}`,
    filename,
  };
};

const uploadToCloudinary = (file, { folder, prefix }) =>
  new Promise((resolve, reject) => {
    const uniquePublicId = `${prefix}-${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        public_id: uniquePublicId,
        overwrite: false,
        unique_filename: false,
        use_filename: false,
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(result);
      }
    );

    Readable.from(file.buffer).pipe(uploadStream);
  });

const storeImage = async (file, { folder, prefix }) => {
  if (!file) return '';

  let localUpload = null;

  try {
    localUpload = await saveLocally(file);
  } catch (localError) {
    // Local storage is best-effort only; cloud upload should still proceed.
    console.error('Local image save failed:', localError.message);
  }

  if (isCloudinaryConfigured) {
    try {
      const cloudResult = await uploadToCloudinary(file, { folder, prefix });
      return cloudResult.secure_url;
    } catch (cloudError) {
      if (localUpload?.url) {
        console.error('Cloudinary upload failed, using local image fallback:', cloudError.message);
        return localUpload.url;
      }

      throw new ApiError(500, 'Failed to upload product image to Cloudinary', cloudError.message);
    }
  }

  if (localUpload?.url) {
    return localUpload.url;
  }

  throw new ApiError(
    500,
    'Image upload failed. Configure Cloudinary or ensure local uploads are writable.'
  );
};

export const storeProductImage = async (file) =>
  storeImage(file, {
    folder: defaultProductFolder,
    prefix: 'product',
  });

export const storeUserAvatar = async (file) =>
  storeImage(file, {
    folder: defaultAvatarFolder,
    prefix: 'avatar',
  });

export const storeCustomizationImage = async (file, prefix = 'customization') =>
  storeImage(file, {
    folder: defaultCustomizationFolder,
    prefix,
  });
