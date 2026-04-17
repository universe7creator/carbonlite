// Carbon emission factors (kg CO2e)
const FACTORS = {
  transport: {
    car_gas: 0.21,       // per km
    car_electric: 0.05,  // per km
    car_hybrid: 0.11,    // per km
    motorcycle: 0.10,    // per km
    bus: 0.089,          // per km
    train: 0.041,        // per km
    flight_short: 0.255, // per km (<1500km)
    flight_long: 0.147,  // per km (>1500km)
  },
  energy: {
    electricity: 0.233,  // per kWh (global avg)
    natural_gas: 2.0,    // per m³
    heating_oil: 2.68,   // per liter
    lpg: 1.51,           // per liter
  },
  lifestyle: {
    meat_lover: 3300,    // kg/year food
    average: 2100,       // kg/year food
    vegetarian: 1500,    // kg/year food
    vegan: 1000,         // kg/year food
  },
  housing: {
    apartment: 2500,     // kg/year
    house: 4500,         // kg/year
    shared: 1800,        // kg/year
  },
};

// Global averages for comparison
const GLOBAL_AVG = 4000;   // kg CO2e per person per year
const TARGET = 2000;       // kg CO2e target for 2030

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-License-Key');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { transport, energy, lifestyle, housing } = req.body || {};

    // Transport calculation
    let transportTotal = 0;
    const transportBreakdown = {};
    if (transport) {
      if (transport.vehicle_type && transport.km_per_year) {
        const factor = FACTORS.transport[transport.vehicle_type] || FACTORS.transport.car_gas;
        transportTotal = factor * transport.km_per_year;
        transportBreakdown.daily = transportTotal;
      }
      if (transport.flight_hours) {
        const flightEmission = transport.flight_hours * 90; // avg kg/hr
        transportTotal += flightEmission;
        transportBreakdown.flights = flightEmission;
      }
    }

    // Energy calculation
    let energyTotal = 0;
    const energyBreakdown = {};
    if (energy) {
      if (energy.electricity_kwh) {
        const elecEmission = energy.electricity_kwh * FACTORS.energy.electricity;
        energyTotal += elecEmission;
        energyBreakdown.electricity = elecEmission;
      }
      if (energy.gas_m3) {
        const gasEmission = energy.gas_m3 * FACTORS.energy.natural_gas;
        energyTotal += gasEmission;
        energyBreakdown.gas = gasEmission;
      }
    }

    // Lifestyle calculation
    let lifestyleTotal = 0;
    if (lifestyle && lifestyle.diet_type) {
      lifestyleTotal = FACTORS.lifestyle[lifestyle.diet_type] || FACTORS.lifestyle.average;
    }

    // Housing calculation
    let housingTotal = 0;
    if (housing && housing.type) {
      housingTotal = FACTORS.housing[housing.type] || FACTORS.housing.apartment;
    }

    const total = Math.round(transportTotal + energyTotal + lifestyleTotal + housingTotal);
    const vsGlobal = ((total / GLOBAL_AVG - 1) * 100).toFixed(0);
    const vsTarget = ((total / TARGET - 1) * 100).toFixed(0);

    // Rating
    let rating, ratingColor;
    if (total <= TARGET) {
      rating = 'excellent'; ratingColor = '#22c55e';
    } else if (total <= GLOBAL_AVG) {
      rating = 'good'; ratingColor = '#eab308';
    } else {
      rating = 'high'; ratingColor = '#ef4444';
    }

    // Tips
    const tips = [];
    if (transportTotal > 1000) tips.push('Consider switching to electric/hybrid transport');
    if (energyTotal > 500) tips.push('Switch to renewable energy sources');
    if (lifestyleTotal > 2000) tips.push('Reducing meat consumption can significantly lower your footprint');
    if (housingTotal > 3000) tips.push('Better insulation and efficient heating can reduce housing emissions');
    if (tips.length === 0) tips.push('Great job! Keep up your sustainable lifestyle');

    return res.status(200).json({
      total_kg_co2e: total,
      total_tonnes: (total / 1000).toFixed(2),
      breakdown: {
        transport: Math.round(transportTotal),
        energy: Math.round(energyTotal),
        lifestyle: Math.round(lifestyleTotal),
        housing: Math.round(housingTotal),
      },
      comparison: {
        vs_global_average: `${vsGlobal > 0 ? '+' : ''}${vsGlobal}%`,
        vs_2030_target: `${vsTarget > 0 ? '+' : ''}${vsTarget}%`,
      },
      rating: { level: rating, color: ratingColor },
      tips,
    });
  } catch (error) {
    return res.status(400).json({ error: 'Invalid input', details: error.message });
  }
};
