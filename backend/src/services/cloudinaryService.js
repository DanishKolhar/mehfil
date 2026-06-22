const fs = require('fs');
const path = require('path');
const cloudinary = require('cloudinary').v2;

const isCloudinaryConfigured =
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET;

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
  console.log('Cloudinary Service Configured.');
} else {
  console.log('Cloudinary credentials missing. Falling back to Local Disk storage.');
  // Ensure local upload folder exists
  const uploadDir = path.join(__dirname, '../../public/uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
}

/**
 * Uploads a file (from multer buffer or path) to Cloudinary or falls back to disk.
 * @param {Object} file Multer file object
 * @returns {Promise<string>} Image URL
 */
async function uploadImage(file) {
  if (!file) return null;

  if (isCloudinaryConfigured) {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'mehfil' },
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            reject(error);
          } else {
            resolve(result.secure_url);
          }
        }
      );
      uploadStream.end(file.buffer);
    });
  } else {
    // Local storage fallback
    const fileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    const destPath = path.join(__dirname, '../../public/uploads', fileName);
    
    // Write buffer to file
    fs.writeFileSync(destPath, file.buffer);
    
    // Return relative/absolute url
    // The server will host static files from /uploads
    return `/uploads/${fileName}`;
  }
}

module.exports = {
  uploadImage
};
