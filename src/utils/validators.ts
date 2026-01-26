/**
 * Utility functions for validation and data processing
 */

// ==================== WORD COUNT ====================

/**
 * Count words in a string
 * @param text The text to count words in
 * @returns Number of words
 */
export function countWords(text: string): number {
    if (!text || typeof text !== 'string') return 0;

    // Normalize whitespace and count words
    const trimmed = text.trim();
    if (trimmed.length === 0) return 0;

    // Split on whitespace and filter empty strings
    return trimmed.split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Validate word count is within range
 * @param text Text to validate
 * @param min Minimum words required
 * @param max Maximum words allowed
 * @returns Boolean indicating validity
 */
export function validateWordCount(text: string, min: number, max: number): boolean {
    const count = countWords(text);
    return count >= min && count <= max;
}

// ==================== KENYAN VALIDATIONS ====================

/**
 * Validate Kenyan National ID (exactly 8 digits)
 */
export function validateKenyanNationalId(id: string): boolean {
    if (!id) return false;
    return /^\d{8}$/.test(id);
}

/**
 * Validate Kenyan phone number (07XX or 01XX format)
 */
export function validateKenyanPhone(phone: string): boolean {
    if (!phone) return false;
    // Remove spaces and common prefixes
    const normalized = normalizeKenyanPhone(phone);
    return /^(07|01)\d{8}$/.test(normalized);
}

/**
 * Normalize Kenyan phone number to standard format
 * Handles: +254, 254, 07, 01 formats
 */
export function normalizeKenyanPhone(phone: string): string {
    if (!phone) return '';

    // Remove all non-digits
    let cleaned = phone.replace(/\D/g, '');

    // Handle +254 or 254 prefix
    if (cleaned.startsWith('254')) {
        cleaned = '0' + cleaned.substring(3);
    }

    return cleaned;
}

// ==================== FEE BALANCE VALIDATION ====================

/**
 * Validate fee balance is within acceptable range (1,000 - 10,000,000 KES)
 */
export function validateFeeBalance(balance: number): boolean {
    return balance >= 1000 && balance <= 10000000;
}

// ==================== FILE VALIDATION ====================

const ALLOWED_MIME_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
];

const ALLOWED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png'];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Validate file type by MIME type
 */
export function validateFileMimeType(mimeType: string): boolean {
    return ALLOWED_MIME_TYPES.includes(mimeType.toLowerCase());
}

/**
 * Validate file extension
 */
export function validateFileExtension(filename: string): boolean {
    const ext = filename.split('.').pop()?.toLowerCase();
    return ext ? ALLOWED_EXTENSIONS.includes(ext) : false;
}

/**
 * Validate file size
 */
export function validateFileSize(size: number): boolean {
    return size > 0 && size <= MAX_FILE_SIZE;
}

/**
 * Validate entire file upload
 */
export function validateFileUpload(file: {
    originalname: string;
    mimetype: string;
    size: number;
}): { valid: boolean; error?: string } {
    if (!validateFileExtension(file.originalname)) {
        return { valid: false, error: 'Invalid file extension. Allowed: PDF, JPG, JPEG, PNG' };
    }

    if (!validateFileMimeType(file.mimetype)) {
        return { valid: false, error: 'Invalid file type. Allowed: PDF, JPG, JPEG, PNG' };
    }

    if (!validateFileSize(file.size)) {
        return { valid: false, error: `File size must be between 1 byte and 5MB. Got: ${(file.size / 1024 / 1024).toFixed(2)}MB` };
    }

    return { valid: true };
}

// ==================== SANITIZATION ====================

/**
 * Sanitize filename for storage
 * Removes special characters, keeps alphanumerics and basic punctuation
 */
export function sanitizeFilename(filename: string): string {
    // Get extension
    const parts = filename.split('.');
    const ext = parts.pop()?.toLowerCase() || '';
    const name = parts.join('.');

    // Sanitize name: keep alphanumerics, replace spaces with underscores
    const sanitized = name
        .replace(/[^a-zA-Z0-9\s_-]/g, '')
        .replace(/\s+/g, '_')
        .substring(0, 50); // Limit length

    return `${sanitized}.${ext}`;
}

/**
 * Strip HTML from text input
 */
export function stripHtml(text: string): string {
    if (!text) return '';
    return text.replace(/<[^>]*>/g, '').trim();
}

// ==================== AGE CALCULATION ====================

/**
 * Calculate age from date of birth
 */
export function calculateAge(dateOfBirth: Date): number {
    const today = new Date();
    let age = today.getFullYear() - dateOfBirth.getFullYear();
    const monthDiff = today.getMonth() - dateOfBirth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
        age--;
    }

    return age;
}

/**
 * Get age range category for analytics
 */
export function getAgeRange(age: number): string {
    if (age < 18) return 'Under 18';
    if (age <= 22) return '18-22';
    if (age <= 27) return '23-27';
    if (age <= 32) return '28-32';
    return '33+';
}

// ==================== APPLICATION NUMBER ====================

/**
 * Generate unique application number
 * Format: STF-YYYY-NNNNN
 */
export function generateApplicationNumber(sequenceNumber: number): string {
    const year = new Date().getFullYear();
    const paddedSequence = sequenceNumber.toString().padStart(5, '0');
    return `STF-${year}-${paddedSequence}`;
}

// ==================== DATE HELPERS ====================

/**
 * Check if a date string is valid ISO format
 */
export function isValidISODate(dateString: string): boolean {
    const date = new Date(dateString);
    return !isNaN(date.getTime());
}

/**
 * Format date to ISO string (date only)
 */
export function formatDateISO(date: Date): string {
    return date.toISOString().split('T')[0];
}
