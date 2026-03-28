const Anthropic = require('@anthropic-ai/sdk');
const pino = require('pino');

const logger = pino({ name: 'ai-service' });

/**
 * AI Service for KenganAuto
 * Handles WhatsApp, Website chat and Manual analysis
 * Using Claude Sonnet 4-6 (claude-sonnet-4.6 model mock or sdk)
 */
class AIService {
    constructor() {
        this.anthropic = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY || 'sk-ant-dummy-key',
        });
        this.model = 'claude-3-5-sonnet-20241022'; // Using the latest Claude Sonnet
    }

    /**
     * Generates a dealership-aware response to customer queries
     */
    async generateChatResponse(tenant, message, history = [], context = {}) {
        logger.info({ tenant: tenant.id, message }, 'Generating AI Response');

        const systemPrompt = `
      You are an expert South African automotive assistant for ${tenant.name}.
      Your tone is helpful, professional, and culturally aware of South African nuances (Sandton, Gauteng etc).
      The price is always in ZAR (South African Rand).
      
      Dealership: ${tenant.name}
      Modules: Lead Pipeline, AI Chatbot, Finance (with calculator), Trade-Ins, Stock, Service, Parts, Analytics.
      AI Support: You have access to vehicle manuals (embedding context).
      
      Rule: Keep response under 60 seconds (latency-wise) and concise.
      Role: Act as the first point of contact for Leads, Service Bookings or Parts Enquiries.
    `;

        try {
            // Mocking for now to avoid actual API costs/failures during scaffolding
            /*
            const response = await this.anthropic.messages.create({
              model: this.model,
              max_tokens: 1024,
              system: systemPrompt,
              messages: [
                ...history,
                { role: 'user', content: message }
              ],
            });
            return response.content[0].text;
            */

            // Scaffolding mock logic
            if (message.toLowerCase().includes('finance')) {
                return `Hello! At ${tenant.name}, we offer competitive finance through major banks. Our interest rates currently start from approx. 11.75% based on your credit profile. Would you like me to run a quick calculation for you? (ZAR)`;
            }

            if (message.toLowerCase().includes('stock') || message.toLowerCase().includes('car')) {
                return `We have a wide range of luxury pre-owned vehicles in our ${tenant.name} branch. Let me check our live stock for you. Anything specific?`;
            }

            return `Hi! I'm your AI assistant at ${tenant.name}. How can I assist you with your vehicle needs today?`;

        } catch (err) {
            logger.error('AI Processing Error:', err);
            throw new Error('Claude AI Unavailable');
        }
    }
}

module.exports = new AIService();
