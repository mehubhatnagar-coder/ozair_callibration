import { calculateOzoneCalibration, CALIBRATION_PRESETS } from './calculator.js';
import { renderCalibrationChart } from './chart.js';

// State
let calibrationHistory = [];

// DOM Element References
const zeroMvInput = document.getElementById('zeroMv');
const gainMvInput = document.getElementById('gainMv');
const gainPpmInput = document.getElementById('gainPpm');
const currentMvInput = document.getElementById('currentMv');
const orpSlider = document.getElementById('orpSlider');
const presetSelect = document.getElementById('presetSelect');

const displayOzonePpm = document.getElementById('displayOzonePpm');
const statusBadge = document.getElementById('statusBadge');
const statusLevelText = document.getElementById('statusLevelText');
const gaugeFill = document.getElementById('gaugeFill');
const statusDescription = document.getElementById('statusDescription');

const chartContainer = document.getElementById('chartContainer');

const diagSlope = document.getElementById('diagSlope');
const diagSensitivity = document.getElementById('diagSensitivity');
const diagDeltaMv = document.getElementById('diagDeltaMv');
const diagFormula = document.getElementById('diagFormula');

const btnSaveLog = document.getElementById('btnSaveLog');
const btnCopyEquation = document.getElementById('btnCopyEquation');
const historyTableBody = document.getElementById('historyTableBody');

const toastNotification = document.getElementById('toastNotification');
const toastMessage = document.getElementById('toastMessage');

// Initialize Presets
function initPresets() {
  presetSelect.innerHTML = '<option value="">-- Select Standard Preset --</option>';
  CALIBRATION_PRESETS.forEach((p, idx) => {
    const opt = document.createElement('option');
    opt.value = idx;
    opt.textContent = `${p.name} (${p.description})`;
    presetSelect.appendChild(opt);
  });

  presetSelect.addEventListener('change', (e) => {
    const selectedIdx = e.target.value;
    if (selectedIdx !== '') {
      const preset = CALIBRATION_PRESETS[selectedIdx];
      zeroMvInput.value = preset.zeroMv;
      gainMvInput.value = preset.gainMv;
      gainPpmInput.value = preset.gainPpm;
      currentMvInput.value = preset.currentMv;
      orpSlider.value = preset.currentMv;
      updateCalculator();
      showToast(`Loaded "${preset.name}" profile.`);
    }
  });
}

// Master Update Function
function updateCalculator() {
  const zeroMv = zeroMvInput.value;
  const gainMv = gainMvInput.value;
  const gainPpm = gainPpmInput.value;
  const currentMv = currentMvInput.value;

  // Sync slider
  if (orpSlider.value !== currentMv) {
    orpSlider.value = currentMv;
  }

  const result = calculateOzoneCalibration(zeroMv, gainMv, gainPpm, currentMv);

  if (!result.isValid) {
    displayOzonePpm.textContent = '---';
    statusLevelText.textContent = 'Invalid Calibration';
    statusBadge.className = 'status-badge badge-red';
    gaugeFill.style.width = '0%';
    statusDescription.textContent = result.errors.join(' ');
    renderCalibrationChart(chartContainer, null);
    return;
  }

  // Update Hero Metrics
  displayOzonePpm.textContent = result.actualPpm.toFixed(3);
  statusLevelText.textContent = result.statusInfo.level;
  statusBadge.className = `status-badge ${result.statusInfo.badgeClass}`;
  statusDescription.textContent = result.statusInfo.description;

  // Gauge bar update
  gaugeFill.style.width = `${result.statusInfo.gaugePercent}%`;
  gaugeFill.style.backgroundColor = result.statusInfo.color;

  // Diagnostics
  diagSlope.textContent = `${result.slope.toFixed(6)} ppm/mV`;
  diagSensitivity.textContent = `${result.sensitivity.toFixed(1)} mV/ppm`;
  diagDeltaMv.textContent = `${result.deltaMv.toFixed(1)} mV`;
  diagFormula.textContent = result.formulaString;

  // Render SVG Chart
  renderCalibrationChart(chartContainer, result);
}

// Event Listeners for inputs
[zeroMvInput, gainMvInput, gainPpmInput, currentMvInput].forEach((input) => {
  input.addEventListener('input', updateCalculator);
});

orpSlider.addEventListener('input', (e) => {
  currentMvInput.value = e.target.value;
  updateCalculator();
});

// Quick adjust chip buttons
document.querySelectorAll('.btn-chip').forEach((btn) => {
  btn.addEventListener('click', () => {
    const delta = btn.getAttribute('data-delta');
    const setType = btn.getAttribute('data-set');

    if (delta) {
      const val = parseFloat(currentMvInput.value) || 0;
      currentMvInput.value = val + parseFloat(delta);
    } else if (setType === 'zero') {
      currentMvInput.value = zeroMvInput.value;
    } else if (setType === 'gain') {
      currentMvInput.value = gainMvInput.value;
    }
    updateCalculator();
  });
});

// History Log
btnSaveLog.addEventListener('click', () => {
  const result = calculateOzoneCalibration(
    zeroMvInput.value,
    gainMvInput.value,
    gainPpmInput.value,
    currentMvInput.value
  );

  if (!result.isValid) {
    showToast('Cannot save invalid calibration snapshot.');
    return;
  }

  const logEntry = {
    timestamp: new Date().toLocaleTimeString(),
    zeroMv: result.zeroMv,
    gainMv: result.gainMv,
    gainPpm: result.gainPpm,
    slope: result.slope,
    currentMv: result.currentMv,
    actualPpm: result.actualPpm
  };

  calibrationHistory.unshift(logEntry);
  renderHistoryTable();
  showToast('Calibration snapshot recorded.');
});

function renderHistoryTable() {
  if (calibrationHistory.length === 0) {
    historyTableBody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; color: var(--text-dim); padding: 20px;">
          No calibration snapshots recorded yet. Click "Save Calibration Snapshot" above.
        </td>
      </tr>
    `;
    return;
  }

  historyTableBody.innerHTML = calibrationHistory
    .map(
      (item) => `
    <tr>
      <td>${item.timestamp}</td>
      <td>${item.zeroMv} mV</td>
      <td>${item.gainMv} mV (${item.gainPpm} ppm)</td>
      <td>${item.slope.toFixed(6)}</td>
      <td>${item.currentMv} mV</td>
      <td style="color: var(--accent-cyan); font-weight: 700;">${item.actualPpm.toFixed(3)} ppm</td>
    </tr>
  `
    )
    .join('');
}

// Copy Equation
btnCopyEquation.addEventListener('click', () => {
  const result = calculateOzoneCalibration(
    zeroMvInput.value,
    gainMvInput.value,
    gainPpmInput.value,
    currentMvInput.value
  );

  if (!result.isValid) return;

  const textToCopy = `O3 Calibration Equation:\n${result.formulaString}\nSlope: ${result.slope.toFixed(
    6
  )} ppm/mV\nSensitivity: ${result.sensitivity.toFixed(1)} mV/ppm`;

  navigator.clipboard.writeText(textToCopy).then(() => {
    showToast('Calibration parameters copied to clipboard!');
  });
});

// Toast notification helper
function showToast(msg) {
  toastMessage.textContent = msg;
  toastNotification.classList.add('show');
  setTimeout(() => {
    toastNotification.classList.remove('show');
  }, 3000);
}

// App Initialization
document.addEventListener('DOMContentLoaded', () => {
  initPresets();
  updateCalculator();
});
