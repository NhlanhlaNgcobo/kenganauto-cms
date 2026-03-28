const axios = require('axios');

const FB_ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN;
const FB_API_VERSION = 'v19.0';
const FB_BASE_URL = `https://graph.facebook.com/${FB_API_VERSION}`;

/**
 * Fetch lead details from Facebook Lead Ads
 * @param {string} leadId
 */
async function getLeadDetails(leadId) {
    if (!FB_ACCESS_TOKEN) return { success: false, error: 'Facebook not configured' };

    try {
        const response = await axios.get(`${FB_BASE_URL}/${leadId}`, {
            params: { access_token: FB_ACCESS_TOKEN }
        });
        return { success: true, data: response.data };
    } catch (error) {
        console.error('[Facebook] Error fetching lead:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Send a message via Facebook Messenger (if opted in)
 */
async function sendMessengerMessage(recipientId, text) {
    if (!FB_ACCESS_TOKEN) return { success: false, error: 'Facebook not configured' };

    try {
        const response = await axios.post(`${FB_BASE_URL}/me/messages`, {
            recipient: { id: recipientId },
            message: { text }
        }, {
            params: { access_token: FB_ACCESS_TOKEN }
        });
        return { success: true, data: response.data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

module.exports = {
    getLeadDetails,
    sendMessengerMessage
};
