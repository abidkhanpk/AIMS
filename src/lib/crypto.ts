import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';

// Generate a random 32-byte key for your environment variable (e.g. using crypto.randomBytes(32).toString('hex'))
// The ENCRYPTION_KEY environment variable should be exactly 32 bytes (64 hex characters)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY ? Buffer.from(process.env.ENCRYPTION_KEY, 'hex') : null;

export function encrypt(text: string): string {
  if (!text) return text;
  if (!ENCRYPTION_KEY) {
    console.warn('ENCRYPTION_KEY is not set. Saving password as plain text.');
    return text;
  }

  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    // Store the IV alongside the encrypted text, separated by a colon
    return `${iv.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('Encryption error:', error);
    return text;
  }
}

export function decrypt(encryptedText: string): string {
  if (!encryptedText) return encryptedText;
  if (!ENCRYPTION_KEY) {
    return encryptedText;
  }

  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 2) {
      // It might not be encrypted (e.g. plain text from before encryption was added)
      return encryptedText;
    }

    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    // If decryption fails, it might be plain text or an invalid key
    console.error('Decryption error (might be plain text):', error);
    return encryptedText;
  }
}
