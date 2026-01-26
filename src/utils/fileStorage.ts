import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const uploadDir = process.env.UPLOAD_DIR || './uploads';

/**
 * Ensures upload directory exists
 */
export const ensureUploadDir = (): void => {
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }
};

/**
 * Generates a unique filename
 */
export const generateUniqueFilename = (originalFilename: string): string => {
    const ext = path.extname(originalFilename);
    return `${uuidv4()}${ext}`;
};

/**
 * Gets the full file path
 */
export const getFilePath = (filename: string): string => {
    return path.join(uploadDir, filename);
};

/**
 * Checks if file exists
 */
export const fileExists = (filename: string): boolean => {
    const filePath = getFilePath(filename);
    return fs.existsSync(filePath);
};

/**
 * Deletes a file
 */
export const deleteFile = (filename: string): void => {
    const filePath = getFilePath(filename);
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
};

/**
 * Validates file type
 */
export const isAllowedFileType = (mimetype: string): boolean => {
    const allowedTypes = (process.env.ALLOWED_FILE_TYPES || 'application/pdf,image/jpeg,image/png').split(',');
    return allowedTypes.includes(mimetype);
};

/**
 * Validates file size
 */
export const isAllowedFileSize = (size: number): boolean => {
    const maxSize = parseInt(process.env.MAX_FILE_SIZE || '5242880'); // 5MB default
    return size <= maxSize;
};
