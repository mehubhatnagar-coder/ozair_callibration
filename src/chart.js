/**
 * Ozone ORP Calibration Dynamic SVG Chart Renderer
 */

export function renderCalibrationChart(containerEl, calData) {
  if (!containerEl) return;

  if (!calData || !calData.isValid) {
    containerEl.innerHTML = `
      <div class="chart-error">
        <svg class="icon-warning" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
        </svg>
        <span>Invalid calibration parameters. Enter valid ORP values to render curve.</span>
      </div>
    `;
    return;
  }

  const { zeroMv, gainMv, gainPpm, currentMv, actualPpm } = calData;

  // Calculate dynamic axis bounds
  const minMv = Math.floor(Math.min(zeroMv, gainMv, currentMv, 200) / 50) * 50 - 50;
  const maxMv = Math.ceil(Math.max(zeroMv, gainMv, currentMv, 900) / 50) * 50 + 50;

  const maxPpmVal = Math.max(gainPpm, actualPpm, 2.0);
  const minPpm = 0;
  const maxPpm = Math.ceil((maxPpmVal * 1.2) * 10) / 10;

  // Chart dimensions
  const width = 640;
  const height = 340;
  const padding = { top: 30, right: 40, bottom: 50, left: 65 };

  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  // Map coordinates
  const mapX = (mv) => padding.left + ((mv - minMv) / (maxMv - minMv)) * plotW;
  const mapY = (ppm) => padding.top + plotH - ((ppm - minPpm) / (maxPpm - minPpm)) * plotH;

  // Grid Ticks
  const xTickStep = Math.max(50, Math.round((maxMv - minMv) / 6 / 25) * 25);
  const xTicks = [];
  for (let mv = Math.ceil(minMv / xTickStep) * xTickStep; mv <= maxMv; mv += xTickStep) {
    xTicks.push(mv);
  }

  const yTickStep = Math.max(0.2, Math.round((maxPpm / 5) * 10) / 10);
  const yTicks = [];
  for (let ppm = 0; ppm <= maxPpm + 0.05; ppm += yTickStep) {
    yTicks.push(parseFloat(ppm.toFixed(2)));
  }

  // Points coordinates
  const zeroX = mapX(zeroMv);
  const zeroY = mapY(0);

  const gainX = mapX(gainMv);
  const gainY = mapY(gainPpm);

  const currentX = mapX(currentMv);
  const currentY = mapY(actualPpm);

  // Line points extended to edge of chart
  const lineStartMv = minMv;
  const lineStartPpm = (lineStartMv - zeroMv) * calData.slope;
  const lineEndMv = maxMv;
  const lineEndPpm = (lineEndMv - zeroMv) * calData.slope;

  const lineStartX = mapX(lineStartMv);
  const lineStartY = mapY(lineStartPpm);
  const lineEndX = mapX(lineEndMv);
  const lineEndY = mapY(lineEndPpm);

  let svgHtml = `
    <svg viewBox="0 0 ${width} ${height}" class="calibration-svg" preserveAspectRatio="xMidYMid meet">
      <defs>
        <!-- Gradients -->
        <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#38bdf8" />
          <stop offset="50%" stop-color="#4facfe" />
          <stop offset="100%" stop-color="#00f2fe" />
        </linearGradient>
        <linearGradient id="areaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#00f2fe" stop-opacity="0.25" />
          <stop offset="100%" stop-color="#00f2fe" stop-opacity="0.0" />
        </linearGradient>

        <!-- Filters -->
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <filter id="pulseGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      <!-- Background Grid -->
      <g class="chart-grid">
  `;

  // Horizontal grid lines (Y ticks)
  yTicks.forEach((ppm) => {
    const y = mapY(ppm);
    if (y >= padding.top && y <= padding.top + plotH) {
      svgHtml += `
        <line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="rgba(255,255,255,0.07)" stroke-dasharray="3,3" />
        <text x="${padding.left - 10}" y="${y + 4}" class="tick-label y-label">${ppm.toFixed(1)}</text>
      `;
    }
  });

  // Vertical grid lines (X ticks)
  xTicks.forEach((mv) => {
    const x = mapX(mv);
    if (x >= padding.left && x <= width - padding.right) {
      svgHtml += `
        <line x1="${x}" y1="${padding.top}" x2="${x}" y2="${height - padding.bottom}" stroke="rgba(255,255,255,0.07)" stroke-dasharray="3,3" />
        <text x="${x}" y="${height - padding.bottom + 20}" class="tick-label x-label">${mv}</text>
      `;
    }
  });

  // Axes Labels & Titles
  svgHtml += `
      <!-- Axes Lines -->
      <line x1="${padding.left}" y1="${height - padding.bottom}" x2="${width - padding.right}" y2="${height - padding.bottom}" stroke="rgba(255,255,255,0.3)" stroke-width="1.5" />
      <line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${height - padding.bottom}" stroke="rgba(255,255,255,0.3)" stroke-width="1.5" />

      <!-- Axis Titles -->
      <text x="${width / 2}" y="${height - 12}" class="axis-title">ORP Sensor Output (mV)</text>
      <text x="${-height / 2 + 10}" y="20" class="axis-title" transform="rotate(-90)">Dissolved Ozone O₃ (ppm)</text>
    </g>

    <!-- Fill under slope curve -->
    <polygon points="${zeroX},${zeroY} ${gainX},${gainY} ${gainX},${zeroY}" fill="url(#areaGrad)" />

    <!-- Calibration Slope Line -->
    <line x1="${lineStartX}" y1="${lineStartY}" x2="${lineEndX}" y2="${lineEndY}" stroke="url(#lineGrad)" stroke-width="3.5" filter="url(#glow)" />

    <!-- Crosshairs for Live Current Point -->
    <line x1="${currentX}" y1="${height - padding.bottom}" x2="${currentX}" y2="${currentY}" stroke="#ef4444" stroke-dasharray="4,4" stroke-width="1.5" />
    <line x1="${padding.left}" y1="${currentY}" x2="${currentX}" y2="${currentY}" stroke="#ef4444" stroke-dasharray="4,4" stroke-width="1.5" />

    <!-- Point 1: Zero Point -->
    <g class="chart-point-group" transform="translate(${zeroX}, ${zeroY})">
      <circle r="7" fill="#38bdf8" stroke="#0f172a" stroke-width="2.5" filter="url(#glow)" />
      <text x="0" y="22" class="point-annotation" text-anchor="middle">Zero (0.0 ppm)</text>
    </g>

    <!-- Point 2: Gain Point -->
    <g class="chart-point-group" transform="translate(${gainX}, ${gainY})">
      <circle r="7" fill="#10b981" stroke="#0f172a" stroke-width="2.5" filter="url(#glow)" />
      <text x="0" y="-14" class="point-annotation" text-anchor="middle">Gain (${gainPpm.toFixed(2)} ppm)</text>
    </g>

    <!-- Point 3: Live Current Reading -->
    <g class="chart-point-group live-point" transform="translate(${currentX}, ${currentY})">
      <circle r="12" fill="#ef4444" opacity="0.3" class="ping-circle" />
      <circle r="8" fill="#ef4444" stroke="#ffffff" stroke-width="2.5" filter="url(#pulseGlow)" />
      <rect x="-45" y="-36" width="90" height="22" rx="4" fill="rgba(15, 23, 42, 0.85)" stroke="#ef4444" stroke-width="1" />
      <text x="0" y="-21" class="live-tooltip" text-anchor="middle">${actualPpm.toFixed(3)} ppm</text>
    </g>
  </svg>
  `;

  containerEl.innerHTML = svgHtml;
}
