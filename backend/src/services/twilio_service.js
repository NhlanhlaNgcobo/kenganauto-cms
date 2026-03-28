const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

/**
 * Send an SMS via Twilio
 * @param {string} to - Recipient phone number
 * @param {string} body - SMS body
 */
async function sendSMS(to, body) {
    if (!client) {
        console.warn('[Twilio] Client not initialized. Check TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.');
        return { success: false, error: 'Twilio not configured' };
    }
    try {
        const message = await client.messages.create({
            body,
            from: process.env.TWILIO_PHONE_NUMBER,
            to
        });
        return { success: true, sid: message.sid };
    } catch (error) {
        console.error('[Twilio] Error sending SMS:', error);
        return { success: false, error: error.message };
    }
}

module.exports = { sendSMS };
