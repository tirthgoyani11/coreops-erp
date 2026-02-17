const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

/**
 * Storage Service — Abstraction layer
 * 
 * Switches between local disk and Cloudinary based on STORAGE_PROVIDER env var.
 * - Development: STORAGE_PROVIDER=local (default) → saves to backend/uploads/
 * - Production:  STORAGE_PROVIDER=cloudinary → uploads to Cloudinary CDN
 */

const PROVIDER = process.env.STORAGE_PROVIDER || 'local';
const UPLOADS_DIR = path.join(__dirname, '../../uploads');

// ── Local Storage Helpers ──────────────────────────────────

function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

async function uploadLocal(file, folder = '') {
    const targetDir = path.join(UPLOADS_DIR, folder);
    ensureDir(targetDir);

    const ext = path.extname(file.originalname);
    const filename = `${uuidv4()}${ext}`;
    const filePath = path.join(targetDir, filename);

    // If file is in memory (memoryStorage), write buffer to disk
    if (file.buffer) {
        fs.writeFileSync(filePath, file.buffer);
    } else if (file.path) {
        // If file is already on disk (diskStorage), move it
        fs.renameSync(file.path, filePath);
    }

    const relativePath = path.join(folder, filename).replace(/\\/g, '/');
    const url = `/uploads/${relativePath}`;

    return {
        url,
        publicId: relativePath,
        storagePath: filePath,
    };
}

async function deleteLocal(publicIdOrUrl) {
    try {
        let filePath;
        if (publicIdOrUrl.startsWith('/uploads/')) {
            filePath = path.join(UPLOADS_DIR, publicIdOrUrl.replace('/uploads/', ''));
        } else {
            filePath = path.join(UPLOADS_DIR, publicIdOrUrl);
        }

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    } catch (err) {
        logger.warn(`Failed to delete local file: ${publicIdOrUrl}`, err.message);
    }
}

// ── Cloudinary Helpers ─────────────────────────────────────

let cloudinary = null;

function getCloudinary() {
    if (!cloudinary) {
        const cloudinaryModule = require('cloudinary').v2;
        cloudinaryModule.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET,
        });
        cloudinary = cloudinaryModule;
    }
    return cloudinary;
}

async function uploadCloudinary(file, folder = '') {
    const cl = getCloudinary();

    return new Promise((resolve, reject) => {
        const uploadOptions = {
            folder: `coreops/${folder}`,
            resource_type: 'auto',
            public_id: uuidv4(),
        };

        const uploadStream = cl.uploader.upload_stream(
            uploadOptions,
            (error, result) => {
                if (error) {
                    logger.error('Cloudinary upload error:', error);
                    return reject(error);
                }
                resolve({
                    url: result.secure_url,
                    publicId: result.public_id,
                    storagePath: result.public_id,
                });
            }
        );

        // Pipe the buffer into the upload stream
        const { Readable } = require('stream');
        const bufferStream = new Readable();
        bufferStream.push(file.buffer);
        bufferStream.push(null);
        bufferStream.pipe(uploadStream);
    });
}

async function deleteCloudinary(publicId) {
    try {
        const cl = getCloudinary();
        await cl.uploader.destroy(publicId);
    } catch (err) {
        logger.warn(`Failed to delete from Cloudinary: ${publicId}`, err.message);
    }
}

// ── Public API ─────────────────────────────────────────────

module.exports = {
    /**
     * Upload a file
     * @param {Object} file - Multer file object (must have .buffer or .path)
     * @param {String} folder - Subfolder (e.g., 'avatars', 'documents')
     * @returns {Promise<{url: string, publicId: string, storagePath: string}>}
     */
    async upload(file, folder = '') {
        if (PROVIDER === 'cloudinary') {
            return uploadCloudinary(file, folder);
        }
        return uploadLocal(file, folder);
    },

    /**
     * Delete a file
     * @param {String} publicIdOrUrl - publicId (cloudinary) or URL/path (local)
     */
    async delete(publicIdOrUrl) {
        if (!publicIdOrUrl) return;
        if (PROVIDER === 'cloudinary') {
            return deleteCloudinary(publicIdOrUrl);
        }
        return deleteLocal(publicIdOrUrl);
    },

    /**
     * Get the serving URL for a stored file
     * @param {String} storedPath - The url or path stored in the database
     * @returns {String} Public-accessible URL
     */
    getUrl(storedPath) {
        if (!storedPath) return null;
        // Cloudinary URLs are already absolute
        if (storedPath.startsWith('http')) return storedPath;
        // Local URLs are relative — prepend the backend base URL
        const baseUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
        return `${baseUrl}${storedPath}`;
    },

    /** Current provider name */
    provider: PROVIDER,
};
