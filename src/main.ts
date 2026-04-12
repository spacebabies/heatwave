import './style.css';
import type { RoomDimensions, SoundSource, AcousticSettings } from './acousticModel';
import { evaluateGrid } from './acousticModel';

// Application State
export interface AppState {
  projectName: string;
  roomWidthM: number;
  roomHeightM: number;

  sub1Enabled: boolean;
  sub1X: number;
  sub1Y: number;
  sub1Z: number;
  sub1CardioidEnabled: boolean;
  sub1DirectionDeg: number;

  sub2Enabled: boolean;
  sub2X: number;
  sub2Y: number;
  sub2Z: number;
  sub2CardioidEnabled: boolean;
  sub2DirectionDeg: number;

  frequency: number;
  speedOfSound: number;
  wallReflectionAmplitudeLeft: number;
  wallReflectionAmplitudeRight: number;
  wallReflectionAmplitudeTop: number;
  wallReflectionAmplitudeBottom: number;
  floorReflectionAmplitude: number;
  enableWallReflectionLeft: boolean;
  enableWallReflectionRight: boolean;
  enableWallReflectionTop: boolean;
  enableWallReflectionBottom: boolean;
  enableFloorReflection: boolean;
  listenerHeightM: number;

  dynamicRangeDb: number;
}

const appState: AppState = {
  projectName: 'Heatwave Study',
  roomWidthM: 40,
  roomHeightM: 20,

  sub1Enabled: true,
  sub1X: 3,
  sub1Y: 3,
  sub1Z: 0.5,
  sub1CardioidEnabled: true,
  sub1DirectionDeg: 90,

  sub2Enabled: false,
  sub2X: 3,
  sub2Y: 9,
  sub2Z: 0.5,
  sub2CardioidEnabled: true,
  sub2DirectionDeg: 90,

  frequency: 63.0,
  speedOfSound: 343.0,
  wallReflectionAmplitudeLeft: 0.8,
  wallReflectionAmplitudeRight: 0.8,
  wallReflectionAmplitudeTop: 0.8,
  wallReflectionAmplitudeBottom: 0.8,
  floorReflectionAmplitude: 0.8,
  enableWallReflectionLeft: true,
  enableWallReflectionRight: true,
  enableWallReflectionTop: true,
  enableWallReflectionBottom: true,
  enableFloorReflection: true,
  listenerHeightM: 1.5,

  dynamicRangeDb: 50,
};

// --- UI Helpers ---

function createCheckbox(label: string, stateKey: keyof AppState) {
  const isChecked = appState[stateKey] as boolean;
  return `
    <label>
      <input type="checkbox" id="${stateKey}" ${isChecked ? 'checked' : ''}>
      ${label}
    </label><br/>
  `;
}

function createNumberInput(label: string, stateKey: keyof AppState, step: string) {
  const value = appState[stateKey] as number;
  return `
    <label>
      ${label}:
      <input type="number" id="${stateKey}" value="${value}" class="number-input" step="${step}">
    </label><br/>
  `;
}

function createTextInput(label: string, stateKey: keyof AppState) {
  const value = appState[stateKey] as string;
  return `
    <label>
      ${label}:
      <input type="text" id="${stateKey}" value="${value}" class="text-input">
    </label><br/>
  `;
}

// --- DOM Setup ---

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div class="canvas-container">
    <canvas id="roomCanvas" width="800" height="400"></canvas>
  </div>
  <div id="controls">
    <fieldset class="fieldset-complex">
      <legend>Project</legend>
      ${createTextInput('Project Name', 'projectName')}
    </fieldset>

    <fieldset class="fieldset-complex">
      <legend>Subwoofers</legend>
      <div>
        <strong>Sub 1</strong><br/>
        ${createCheckbox('Enabled', 'sub1Enabled')}
        ${createNumberInput('X (m)', 'sub1X', '0.1')}
        ${createNumberInput('Y (m)', 'sub1Y', '0.1')}
        ${createNumberInput('Z (m)', 'sub1Z', '0.1')}
        ${createCheckbox('Cardioid', 'sub1CardioidEnabled')}
        ${createNumberInput('Direction (°)', 'sub1DirectionDeg', '1')}
      </div>
      <div>
        <strong>Sub 2</strong><br/>
        ${createCheckbox('Enabled', 'sub2Enabled')}
        ${createNumberInput('X (m)', 'sub2X', '0.1')}
        ${createNumberInput('Y (m)', 'sub2Y', '0.1')}
        ${createNumberInput('Z (m)', 'sub2Z', '0.1')}
        ${createCheckbox('Cardioid', 'sub2CardioidEnabled')}
        ${createNumberInput('Direction (°)', 'sub2DirectionDeg', '1')}
      </div>
      <div>
        <strong>Heights & Display</strong><br/>
        ${createNumberInput('Listener Height (m)', 'listenerHeightM', '0.1')}
        ${createNumberInput('Display Range (dB below peak)', 'dynamicRangeDb', '1')}
      </div>
    </fieldset>

    <fieldset class="fieldset-complex">
      <legend>Wall Reflections</legend>
      <div>
        <strong>Left Wall</strong><br/>
        ${createCheckbox('Enabled', 'enableWallReflectionLeft')}
        ${createNumberInput('Amp. Coeff', 'wallReflectionAmplitudeLeft', '0.1')}
      </div>
      <div>
        <strong>Right Wall</strong><br/>
        ${createCheckbox('Enabled', 'enableWallReflectionRight')}
        ${createNumberInput('Amp. Coeff', 'wallReflectionAmplitudeRight', '0.1')}
      </div>
      <div>
        <strong>Top Wall</strong><br/>
        ${createCheckbox('Enabled', 'enableWallReflectionTop')}
        ${createNumberInput('Amp. Coeff', 'wallReflectionAmplitudeTop', '0.1')}
      </div>
      <div>
        <strong>Bottom Wall</strong><br/>
        ${createCheckbox('Enabled', 'enableWallReflectionBottom')}
        ${createNumberInput('Amp. Coeff', 'wallReflectionAmplitudeBottom', '0.1')}
      </div>
    </fieldset>

    <fieldset class="fieldset-complex">
      <legend>Room characteristics</legend>
      <div>
        <strong>Dimensions</strong><br/>
        ${createNumberInput('Width (X) (m)', 'roomWidthM', '1')}
        ${createNumberInput('Length (Y) (m)', 'roomHeightM', '1')}
      </div>
      <div>
        <strong>Floor Reflection</strong><br/>
        ${createCheckbox('Enabled', 'enableFloorReflection')}
        ${createNumberInput('Amp. Coeff', 'floorReflectionAmplitude', '0.1')}
      </div>

      <div class="note-text">
        <ul>
          <li>Glass ~0.95</li>
          <li>Parquet/Hardwood ~0.90</li>
          <li>Concrete/Hard drywall ~0.80</li>
        </ul>
        <p>Note: These are rough starting points, not absolute material constants.</p>
      </div>
    </fieldset>

    <div class="export-container">
      <button id="exportBtn">Export PNG</button>
    </div>
  </div>
`;

const canvas = document.getElementById('roomCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const PIXELS_PER_METER = 20;

// --- State Extractors ---

function buildActiveSources(): SoundSource[] {
  const sources: SoundSource[] = [];
  if (appState.sub1Enabled) {
    sources.push({
      x: appState.sub1X, y: appState.sub1Y, z: appState.sub1Z,
      cardioidEnabled: appState.sub1CardioidEnabled, directionDeg: appState.sub1DirectionDeg
    });
  }
  if (appState.sub2Enabled) {
    sources.push({
      x: appState.sub2X, y: appState.sub2Y, z: appState.sub2Z,
      cardioidEnabled: appState.sub2CardioidEnabled, directionDeg: appState.sub2DirectionDeg
    });
  }
  return sources;
}

function buildAcousticSettings(): AcousticSettings {
  return {
    frequency: appState.frequency,
    speedOfSound: appState.speedOfSound,
    wallReflectionAmplitudeLeft: appState.wallReflectionAmplitudeLeft,
    wallReflectionAmplitudeRight: appState.wallReflectionAmplitudeRight,
    wallReflectionAmplitudeTop: appState.wallReflectionAmplitudeTop,
    wallReflectionAmplitudeBottom: appState.wallReflectionAmplitudeBottom,
    floorReflectionAmplitude: appState.floorReflectionAmplitude,
    enableWallReflectionLeft: appState.enableWallReflectionLeft,
    enableWallReflectionRight: appState.enableWallReflectionRight,
    enableWallReflectionTop: appState.enableWallReflectionTop,
    enableWallReflectionBottom: appState.enableWallReflectionBottom,
    enableFloorReflection: appState.enableFloorReflection,
    listenerHeightM: appState.listenerHeightM,
  };
}

// --- Rendering ---

function renderToContext(
  targetCtx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  pixelsPerMeter: number,
  cellSizePx: number,
  isExport: boolean
) {
  const room: RoomDimensions = { width: appState.roomWidthM, height: appState.roomHeightM };
  const sources = buildActiveSources();
  const settings = buildAcousticSettings();

  if (!isExport) {
    targetCtx.clearRect(0, 0, canvasWidth, canvasHeight);
  }

  const cols = Math.ceil(canvasWidth / cellSizePx);
  const rows = Math.ceil(canvasHeight / cellSizePx);

  const { data, maxSPL } = evaluateGrid(room, sources, settings, cols, rows, cellSizePx, pixelsPerMeter);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const spl = data[row * cols + col];
      const relativeSPL = spl - maxSPL;

      const t = Math.max(0, (relativeSPL + appState.dynamicRangeDb) / appState.dynamicRangeDb);
      const hue = (1 - t) * 240;

      targetCtx.fillStyle = `hsl(${hue}, 100%, 50%)`;
      targetCtx.fillRect(col * cellSizePx, row * cellSizePx, cellSizePx, cellSizePx);
    }
  }

  const widthPx = room.width * pixelsPerMeter;
  const heightPx = room.height * pixelsPerMeter;
  targetCtx.strokeStyle = '#333';
  targetCtx.lineWidth = isExport ? 4 : 2;
  targetCtx.strokeRect(0, 0, widthPx, heightPx);

  if (!isExport) {
    targetCtx.fillStyle = 'black';
    targetCtx.font = '14px sans-serif';
    const textPad = 10;

    targetCtx.textAlign = 'left';
    targetCtx.textBaseline = 'top';
    targetCtx.fillText('Y', textPad, textPad);

    targetCtx.textAlign = 'right';
    targetCtx.textBaseline = 'bottom';
    targetCtx.fillText('X', widthPx - textPad, heightPx - textPad);
  }

  targetCtx.fillStyle = 'red';
  targetCtx.strokeStyle = 'white';

  const markerSize = isExport ? 16 : 10;
  const lineLength = isExport ? 20 : 10;

  for (const source of sources) {
    const xPx = source.x * pixelsPerMeter;
    const yPx = (room.height - source.y) * pixelsPerMeter;
    targetCtx.beginPath();
    targetCtx.fillRect(xPx - markerSize / 2, yPx - markerSize / 2, markerSize, markerSize);
    targetCtx.lineWidth = isExport ? 2 : 1;
    targetCtx.strokeRect(xPx - markerSize / 2, yPx - markerSize / 2, markerSize, markerSize);

    if (source.cardioidEnabled) {
      const deg = source.directionDeg ?? 90;
      const rad = deg * Math.PI / 180;
      const dx = Math.sin(rad);
      const dy = -Math.cos(rad);

      targetCtx.beginPath();
      targetCtx.moveTo(xPx, yPx);
      targetCtx.lineTo(xPx + dx * lineLength, yPx + dy * lineLength);
      targetCtx.lineWidth = isExport ? 4 : 2;
      targetCtx.stroke();
    }
  }
}

function render() {
  canvas.width = appState.roomWidthM * PIXELS_PER_METER;
  canvas.height = appState.roomHeightM * PIXELS_PER_METER;
  renderToContext(ctx, canvas.width, canvas.height, PIXELS_PER_METER, 4, false);
}

// --- Wire Controls ---

function wireText(stateKey: keyof AppState) {
  const el = document.getElementById(stateKey) as HTMLInputElement;
  if (!el) return;
  el.addEventListener('input', () => {
    (appState as any)[stateKey] = el.value;
  });
}

function wireCheckbox(stateKey: keyof AppState) {
  const el = document.getElementById(stateKey) as HTMLInputElement;
  if (!el) return;
  el.addEventListener('change', () => {
    (appState as any)[stateKey] = el.checked;
    render();
  });
}

// Angle convention: 0 = up, 90 = right, 180 = down, 270 = left
function normalizeAngleDeg(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

function wireNumber(stateKey: keyof AppState, min?: number, max?: number) {
  const el = document.getElementById(stateKey) as HTMLInputElement;
  if (!el) return;
  el.addEventListener('input', () => {
    const val = parseFloat(el.value);
    if (!isNaN(val)) {
      let finalVal = val;

      // Enforce bounds
      if (min !== undefined && finalVal < min) finalVal = min;
      if (max !== undefined && finalVal > max) finalVal = max;

      // Enforce room limits for coordinates
      if (stateKey.endsWith('X')) {
        if (finalVal < 0) finalVal = 0;
        if (finalVal > appState.roomWidthM) finalVal = appState.roomWidthM;
      }
      if (stateKey.endsWith('Y')) {
        if (finalVal < 0) finalVal = 0;
        if (finalVal > appState.roomHeightM) finalVal = appState.roomHeightM;
      }

      // Normalize direction angles
      if (stateKey.endsWith('DirectionDeg')) {
        finalVal = normalizeAngleDeg(finalVal);
      }

      (appState as any)[stateKey] = finalVal;
      render();
    }
  });
}

// Attach event listeners
wireText('projectName');

wireCheckbox('sub1Enabled');
wireNumber('sub1X');
wireNumber('sub1Y');
wireNumber('sub1Z', 0, 20);
wireCheckbox('sub1CardioidEnabled');
wireNumber('sub1DirectionDeg');

wireCheckbox('sub2Enabled');
wireNumber('sub2X');
wireNumber('sub2Y');
wireNumber('sub2Z', 0, 20);
wireCheckbox('sub2CardioidEnabled');
wireNumber('sub2DirectionDeg');

wireNumber('roomWidthM', 1);
wireNumber('roomHeightM', 1);

wireCheckbox('enableWallReflectionLeft');
wireNumber('wallReflectionAmplitudeLeft', 0, 1);
wireCheckbox('enableWallReflectionRight');
wireNumber('wallReflectionAmplitudeRight', 0, 1);
wireCheckbox('enableWallReflectionTop');
wireNumber('wallReflectionAmplitudeTop', 0, 1);
wireCheckbox('enableWallReflectionBottom');
wireNumber('wallReflectionAmplitudeBottom', 0, 1);

wireCheckbox('enableFloorReflection');
wireNumber('floorReflectionAmplitude', 0, 1);

wireNumber('listenerHeightM', 0, 20); // Clamp listener to room height
wireNumber('dynamicRangeDb', 10, 120); // Clamp dB range 10-120

// Initial render
render();

// --- Export ---

function exportToPng() {
  const exportCanvas = document.createElement('canvas');
  // A4 portrait at ~150 DPI
  exportCanvas.width = 1240;
  exportCanvas.height = 1754;
  const exCtx = exportCanvas.getContext('2d');
  if (!exCtx) return;

  // Draw white background for A4 page
  exCtx.fillStyle = '#ffffff';
  exCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

  const marginX = 50;
  const marginY = 50;
  const drawWidth = exportCanvas.width - marginX * 2;
  const pixelsPerMeter = drawWidth / appState.roomWidthM;
  const drawHeight = appState.roomHeightM * pixelsPerMeter;

  exCtx.save();
  exCtx.translate(marginX, marginY);
  // Re-render high-res heatmap directly instead of copying the screen canvas
  renderToContext(exCtx, drawWidth, drawHeight, pixelsPerMeter, 4, true);
  exCtx.restore();

  // --- Scale Bar (Bottom Left) ---
  const scaleBarMeters = 10;
  const scaleBarPixels = scaleBarMeters * pixelsPerMeter;
  const scaleX = marginX;
  const scaleY = exportCanvas.height - marginY - 40;

  exCtx.strokeStyle = '#000000';
  exCtx.fillStyle = '#000000';
  exCtx.lineWidth = 2;
  exCtx.font = '16px sans-serif';
  exCtx.textAlign = 'center';
  exCtx.textBaseline = 'top';

  exCtx.beginPath();
  exCtx.moveTo(scaleX, scaleY);
  exCtx.lineTo(scaleX + scaleBarPixels, scaleY);
  exCtx.stroke();

  for (let m = 0; m <= scaleBarMeters; m += 5) {
    const tickX = scaleX + m * pixelsPerMeter;
    exCtx.beginPath();
    exCtx.moveTo(tickX, scaleY - 10);
    exCtx.lineTo(tickX, scaleY + 10);
    exCtx.stroke();
    exCtx.fillText(`${m} m`, tickX, scaleY + 15);
  }

  // --- Title Block (Bottom Right) ---
  function formatNum(n: number) { return Number(n.toFixed(2)); }

  const titleLines: string[] = [
    `Project: ${appState.projectName}`,
    `Date: ${new Date().toISOString()}`,
    `Room: ${formatNum(appState.roomWidthM)} m x ${formatNum(appState.roomHeightM)} m`,
    `Frequency: ${formatNum(appState.frequency)} Hz`,
    `Wall Refl: L:${appState.enableWallReflectionLeft ? formatNum(appState.wallReflectionAmplitudeLeft) : 'Off'} R:${appState.enableWallReflectionRight ? formatNum(appState.wallReflectionAmplitudeRight) : 'Off'} T:${appState.enableWallReflectionTop ? formatNum(appState.wallReflectionAmplitudeTop) : 'Off'} B:${appState.enableWallReflectionBottom ? formatNum(appState.wallReflectionAmplitudeBottom) : 'Off'}`,
    `Floor Reflection: ${appState.enableFloorReflection ? formatNum(appState.floorReflectionAmplitude) : 'Off'}`,
    `Listener Height: ${formatNum(appState.listenerHeightM)} m`,
    `Dynamic Range: ${formatNum(appState.dynamicRangeDb)} dB`,
    '',
    'Subwoofers:'
  ];

  if (appState.sub1Enabled) {
    const mode = appState.sub1CardioidEnabled ? `Cardioid (${formatNum(appState.sub1DirectionDeg)}°)` : 'Omni';
    titleLines.push(`  Sub 1: [X: ${formatNum(appState.sub1X)}m, Y: ${formatNum(appState.sub1Y)}m, Z: ${formatNum(appState.sub1Z)}m] - ${mode}`);
  }
  if (appState.sub2Enabled) {
    const mode = appState.sub2CardioidEnabled ? `Cardioid (${formatNum(appState.sub2DirectionDeg)}°)` : 'Omni';
    titleLines.push(`  Sub 2: [X: ${formatNum(appState.sub2X)}m, Y: ${formatNum(appState.sub2Y)}m, Z: ${formatNum(appState.sub2Z)}m] - ${mode}`);
  }

  const lineHeight = 24;
  const padding = 20;
  const blockWidth = 550;
  const maxLines = 13; // Fixed block height for stability regardless of enabled subs
  const blockHeight = maxLines * lineHeight + padding * 2;
  const blockX = exportCanvas.width - marginX - blockWidth;
  const blockY = exportCanvas.height - marginY - blockHeight;

  exCtx.textAlign = 'left';
  exCtx.textBaseline = 'top';
  exCtx.font = '16px monospace';
  exCtx.strokeStyle = '#000000';
  exCtx.lineWidth = 2;

  exCtx.strokeRect(blockX, blockY, blockWidth, blockHeight);

  titleLines.forEach((line, i) => {
    exCtx.fillText(line, blockX + padding, blockY + padding + i * lineHeight);
  });

  // Trigger download
  const dataUrl = exportCanvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.href = dataUrl;

  // Format filename safely
  const safeName = appState.projectName.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'export';
  link.download = `heatwave_${safeName}.png`;
  link.click();
}

document.getElementById('exportBtn')?.addEventListener('click', exportToPng);
