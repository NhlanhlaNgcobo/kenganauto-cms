const transunionService = require('./transunion_service');

'use strict';

const fs = require('fs');
const path = require('path');

// Fallback pricing guide (In production, admin would upload a CSV representing this or use TransUnion)
const BASE_PRICES = {
    // Make -> Model -> Year Base Price
    'vw': {
        'polo vivo': 140000,
        'polo': 190000,
        'golf': 250000
    },
    'toyota': {
        'hilux': 350000,
        'corolla': 200000,
        'fortuner': 400000,
        'starlet': 160000
    },
    'ford': {
        'ranger': 320000,
        'ecosport': 180000
    }
};

/**
 * Estimate trade-in value (conservative to optimistic range)
 *
 * @param {Object} details
 * @param {number} details.year
 * @param {string} details.make
 * @param {string} details.model
 * @param {number} details.mileage
 * @param {string} details.condition - 'Excellent', 'Good', 'Fair', 'Needs work'
 * @param {string} details.accidentDamage - 'Yes', 'No'
 * @param {string} [details.vin] - Optional VIN for TransUnion lookup
 * @returns {Promise<Object>} { min, max, baseValue }
 */
async function calculateTradeInRange({ year, make, model, mileage, condition, accidentDamage, vin }) {
    // 1. Try TransUnion first if VIN is provided
    if (vin) {
        const tuData = await transunionService.getVehicleValuation({ vin, make, model, year, mileage });
        if (tuData.success) {
            return {
                min: Math.round(tuData.valuation.trade * 0.94),
                max: Math.round(tuData.valuation.retail * 1.06),
                baseValue: tuData.valuation.trade,
                source: 'TransUnion Live',
                note: 'Live valuation via TransUnion API. Subject to physical inspection.'
            };
        }
    }
    const defaultYear = new Date().getFullYear();
    const vehYear = parseInt(year) || defaultYear;
    const makeKey = (make || '').toLowerCase();
    const modelKey = (model || '').toLowerCase();
    const age = Math.max(0, defaultYear - vehYear);

    // Get base price from simple lookup or default fallback based on age
    let baseValue = 200000;

    if (BASE_PRICES[makeKey]) {
        // Try to match exact or partial model
        const matchedModel = Object.keys(BASE_PRICES[makeKey]).find(k => modelKey.includes(k) || k.includes(modelKey));
        if (matchedModel) {
            baseValue = BASE_PRICES[makeKey][matchedModel];
        } else {
            // Unmatched model for a known make
            baseValue = 180000;
        }
    } else {
        // Unrecognized make/model
        baseValue = 150000;
    }

    // Apply depreciation based on age (e.g. 10% per year from base value 'new' logic)
    // Actually, let's treat the baseValue as a 2024 value and adjust
    const ageDiff = Math.max(0, 2024 - vehYear);
    const valueAfterAge = baseValue * Math.pow(0.88, ageDiff); // 12% drop per year older than 2024

    // Mileage deduction
    // Average mileage is 15k-20k per year.
    const expectedMileage = age * 18000;
    const actualMileage = parseInt(mileage) || expectedMileage;
    let mileageFactor = 1.0;
    if (actualMileage > expectedMileage) {
        // deduct 3% for every 10k km over
        const overage = (actualMileage - expectedMileage) / 10000;
        mileageFactor = Math.max(0.6, 1 - (overage * 0.03));
    } else {
        // slight bump for low mileage
        const underage = (expectedMileage - actualMileage) / 10000;
        mileageFactor = Math.min(1.15, 1 + (underage * 0.02));
    }

    // Condition multiplier
    let conditionMultiplier = 1.0;
    const lowerCond = (condition || '').toLowerCase();
    if (lowerCond.includes('excellent')) conditionMultiplier = 1.05;
    else if (lowerCond.includes('good')) conditionMultiplier = 0.95;
    else if (lowerCond.includes('fair')) conditionMultiplier = 0.80;
    else if (lowerCond.includes('needs work') || lowerCond.includes('poor')) conditionMultiplier = 0.65;
    else conditionMultiplier = 0.90; // Default to good/fair

    // Accident damage deduction
    let damageFactor = 1.0;
    const isDamaged = (accidentDamage || '').toLowerCase().includes('yes') || (accidentDamage || '').toLowerCase().includes('true');
    if (isDamaged) {
        damageFactor = 0.75; // 25% drop for previous accident damage
    }

    const estimatedValue = valueAfterAge * mileageFactor * conditionMultiplier * damageFactor;

    // Build the range (e.g., -8% to +5%)
    // Round to nearest R1000
    const roundedEstimate = Math.round(estimatedValue / 1000) * 1000;

    // Safety check for very old/cheap cars
    const finalValue = Math.max(15000, roundedEstimate);

    const min = Math.round((finalValue * 0.90) / 1000) * 1000;
    const max = Math.round((finalValue * 1.06) / 1000) * 1000;

    return {
        min,
        max,
        baseValue: finalValue,
        note: 'Subject to physical inspection and detailed appraisal.'
    };
}

module.exports = {
    calculateTradeInRange
};
