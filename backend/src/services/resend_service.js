const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY || 're_placeholder');

/**
 * Send an email via Resend
 * @param {Object} options
 * @param {string} options.from - Sender email
 * @param {string|string[]} options.to - Recipient(s)
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML content
 */
async function sendEmail({ from, to, subject, html }) {
    try {
        const data = await resend.emails.send({
            from: from || 'KenganAuto <notifications@resend.dev>', // Default to resend domain if not set
            to: Array.isArray(to) ? to : [to],
            subject,
            html,
        });
        return { success: true, data };
    } catch (error) {
        console.error('[Resend] Error sending email:', error);
        return { success: false, error: error.message };
    }
}

module.exports = { sendEmail };
