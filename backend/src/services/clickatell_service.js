const axios = require('axios');

const CLICKATELL_API_KEY = process.env.CLICKATELL_API_KEY;

/**
 * Send an SMS via Clickatell
 * @param {string} to - Recipient phone number
 * @param {string} content - SMS content
 */
async function sendSMS(to, content) {
    if (!CLICKATELL_API_KEY) {
        console.warn('[Clickatell] API Key not found.');
        return { success: false, error: 'Clickatell not configured' };
    }
    try {
        const response = await axios.post('https://platform.clickatell.com/messages/http/send', null, {
            params: {
                apiKey: CLICKATELL_API_KEY,
                to,
                content
            }
        });
        return { success: true, data: response.data };
    } catch (error) {
        console.error('[Clickatell] Error sending SMS:', error);
        return { success: false, error: error.message };
    }
}

module.exports = { sendSMS };
