const axios = require('axios');

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

/**
 * Geocode an address to lat/lng
 */
async function geocodeAddress(address) {
    if (!GOOGLE_MAPS_API_KEY) return { success: false, error: 'Google Maps not configured' };

    try {
        const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
            params: {
                address,
                key: GOOGLE_MAPS_API_KEY
            }
        });

        if (response.data.status === 'OK') {
            return {
                success: true,
                location: response.data.results[0].geometry.location,
                formatted_address: response.data.results[0].formatted_address
            };
        }
        return { success: false, error: response.data.status };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Calculate distance and time between two points
 */
async function getDistance(origin, destination) {
    if (!GOOGLE_MAPS_API_KEY) return { success: false, error: 'Google Maps not configured' };

    try {
        const response = await axios.get('https://maps.googleapis.com/maps/api/distancematrix/json', {
            params: {
                origins: origin,
                destinations: destination,
                key: GOOGLE_MAPS_API_KEY
            }
        });

        if (response.data.status === 'OK') {
            const element = response.data.rows[0].elements[0];
            return {
                success: true,
                distance: element.distance.text,
                duration: element.duration.text
            };
        }
        return { success: false, error: response.data.status };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

module.exports = {
    geocodeAddress,
    getDistance
};
