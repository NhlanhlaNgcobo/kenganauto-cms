const crypto = require('crypto');

// Use environment variable, or fallback (only for dev! real app needs secure 32 byte string)
const ALGORITHM = 'aes-256-gcm';
const SECRET_KEY = process.env.ENCRYPTION_KEY || crypto.createHash('sha256').update(process.env.JWT_SECRET || 'secret-fallback').digest('base64').slice(0, 32);

/**
 * Encrypts a plain text string securely using AES-256-GCM.
 * @param {string} text - The unencrypted API key or sensitive data.
 * @returns {Object} - An object containing the hex strings: { iv, encrypted_key, authTag }
 */
function encrypt(text) {
    if (!text) return null;
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(SECRET_KEY), iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    // Concatenate authTag to the end of the encrypted key for storage
    return {
        iv: iv.toString('hex'),
        encrypted_key: encrypted + '.' + authTag
    };
}

/**
 * Decrypts data encrypted with the above encrypt function.
 * @param {string} encryptedKeyAuth - The cipher text combined with the authTag (e.g. cipher.tag)
 * @param {string} ivHex - The initialization vector as hex
 * @returns {string} - The exact original plain text string
 */
function decrypt(encryptedKeyAuth, ivHex) {
    if (!encryptedKeyAuth || !ivHex) return null;
    try {
        const parts = encryptedKeyAuth.split('.');
        const encrypted = parts[0];
        const authTag = parts[1];

        const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(SECRET_KEY), Buffer.from(ivHex, 'hex'));
        decipher.setAuthTag(Buffer.from(authTag, 'hex'));

        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (err) {
        console.error('Decryption failed. Hash/key mismatch or tampered data:', err.message);
        return null; // Don't throw to avoid crashing app on bad keys
    }
}

module.exports = { encrypt, decrypt };
