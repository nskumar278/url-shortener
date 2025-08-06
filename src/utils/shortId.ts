import { customAlphabet } from 'nanoid';

// Define alphabet with only alphanumeric characters (no special characters)
const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

// Create custom nanoid generator with 8 characters length
const generateShortId = customAlphabet(alphabet, 8);

/**
 * Generates a unique 8-character alphanumeric short ID
 * @returns {string} 8-character alphanumeric string
 */
export function createShortId(): string {
    return generateShortId();
}