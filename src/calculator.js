/**
 * Ozone Dissolved Monitor - ORP Calibration & Math Module
 */

export function calculateOzoneCalibration(zeroMv, gainMv, gainPpm, currentMv) {
  const zMv = parseFloat(zeroMv);
  const gMv = parseFloat(gainMv);
  const gPpm = parseFloat(gainPpm);
  const cMv = parseFloat(currentMv);

  // Validation
  const errors = [];
  if (isNaN(zMv)) errors.push('Invalid Zero Point ORP (mV)');
  if (isNaN(gMv)) errors.push('Invalid Gain Point ORP (mV)');
  if (isNaN(gPpm) || gPpm <= 0) errors.push('Gain Ozone concentration must be greater than 0 ppm');
  if (isNaN(cMv)) errors.push('Invalid Current ORP reading (mV)');

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  const deltaMv = gMv - zMv;
  if (Math.abs(deltaMv) < 0.001) {
    return {
      isValid: false,
      errors: ['Gain ORP (mV) must be distinct from Zero ORP (mV) to establish a slope.']
    };
  }

  // Slope m = ppm / mV
  const slope = gPpm / deltaMv;
  
  // Sensitivity in mV per 1.0 ppm
  const sensitivity = deltaMv / gPpm;

  // Uncapped ppm calculation: (currentMv - zeroMv) * slope
  const rawPpm = (cMv - zMv) * slope;
  
  // Physical ppm (cannot be negative)
  const actualPpm = Math.max(0, rawPpm);

  // Offset equation string: O3 (ppm) = (ORP - zeroMv) * slope
  const formulaString = `O₃ (ppm) = (ORP - ${zMv.toFixed(1)}) × ${slope.toFixed(6)}`;

  // Status classification
  const statusInfo = getOzoneStatusInfo(actualPpm);

  return {
    isValid: true,
    zeroMv: zMv,
    gainMv: gMv,
    gainPpm: gPpm,
    currentMv: cMv,
    deltaMv,
    slope, // ppm/mV
    sensitivity, // mV/ppm
    rawPpm,
    actualPpm,
    formulaString,
    statusInfo
  };
}

export function getOzoneStatusInfo(ppm) {
  if (ppm < 0.05) {
    return {
      level: 'Negligible',
      description: 'Zero / Trace Ozone level detected.',
      color: '#94a3b8',
      badgeClass: 'badge-grey',
      gaugePercent: Math.min(100, (ppm / 2.0) * 100)
    };
  } else if (ppm < 0.20) {
    return {
      level: 'Low Sanitation',
      description: 'Minimum ozone activity. Suitable for gentle bio-control.',
      color: '#38bdf8',
      badgeClass: 'badge-blue',
      gaugePercent: Math.min(100, (ppm / 2.0) * 100)
    };
  } else if (ppm <= 0.80) {
    return {
      level: 'Optimal Treatment',
      description: 'Standard target range for water disinfection & viral inactivation.',
      color: '#10b981',
      badgeClass: 'badge-green',
      gaugePercent: Math.min(100, (ppm / 2.0) * 100)
    };
  } else if (ppm <= 1.50) {
    return {
      level: 'High Oxidation',
      description: 'Strong sanitization level. Typical for CIP (Clean-in-place) loops.',
      color: '#f59e0b',
      badgeClass: 'badge-amber',
      gaugePercent: Math.min(100, (ppm / 2.0) * 100)
    };
  } else {
    return {
      level: 'Elevated / Danger',
      description: 'Very high dissolved ozone concentration. Check off-gas ambient safety.',
      color: '#ef4444',
      badgeClass: 'badge-red',
      gaugePercent: Math.min(100, (ppm / 2.0) * 100)
    };
  }
}

export const CALIBRATION_PRESETS = [
  {
    name: 'Standard Municipal Water',
    description: 'Zero: 400 mV | Gain: 750 mV @ 1.00 ppm',
    zeroMv: 400,
    gainMv: 750,
    gainPpm: 1.0,
    currentMv: 575
  },
  {
    name: 'Ultrapure Water (UPW)',
    description: 'Zero: 350 mV | Gain: 850 mV @ 2.00 ppm',
    zeroMv: 350,
    gainMv: 850,
    gainPpm: 2.0,
    currentMv: 600
  },
  {
    name: 'Bottling / Rinse Disinfection',
    description: 'Zero: 420 mV | Gain: 820 mV @ 1.50 ppm',
    zeroMv: 420,
    gainMv: 820,
    gainPpm: 1.5,
    currentMv: 720
  }
];
