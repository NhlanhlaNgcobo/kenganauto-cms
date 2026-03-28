const axios = require('axios');

const TRANSUNION_API_KEY = process.env.TRANSUNION_API_KEY;
const TRANSUNION_BASE_URL = 'https://api.transunion.co.za/v1'; // Example URL

/**
 * Fetch vehicle valuation from TransUnion
 * @param {Object} vehicle - { vin, make, model, year, mileage }
 */
async function getVehicleValuation(vehicle) {
    if (!TRANSUNION_API_KEY) {
        console.warn('[TransUnion] API Key not found. Using fallback valuation.');
        return { success: false, error: 'Not configured' };
    }

    try {
        const response = await axios.get(`${TRANSUNION_BASE_URL}/vehicle/valuation`, {
            params: {
                vin: vehicle.vin,
                make: vehicle.make,
                model: vehicle.model,
                year: vehicle.year,
                mileage: vehicle.mileage
            },
            headers: {
                'Authorization': `Bearer ${TRANSUNION_API_KEY}`
            }
        });

        return {
            success: true,
            valuation: {
                retail: response.data.retail_value,
                trade: response.data.trade_value,
                market: response.data.market_average
            }
        };
    } catch (error) {
        console.error('[TransUnion] Error fetching valuation:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Fetch vehicle history (accident reports, etc.)
 */
async function getVehicleHistory(vin) {
    if (!TRANSUNION_API_KEY) return { success: false, error: 'Not configured' };

    try {
        const response = await axios.get(`${TRANSUNION_BASE_URL}/vehicle/history/${vin}`, {
            headers: { 'Authorization': `Bearer ${TRANSUNION_API_KEY}` }
        });
        return { success: true, history: response.data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

module.exports = {
    getVehicleValuation,
    getVehicleHistory
};
