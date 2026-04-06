import './style.css';
import type { RoomDimensions, SoundSource, AcousticSettings } from './acousticModel';
import { evaluateGrid } from './acousticModel';

// Application State
export interface AppState {
  roomWidthM: number;
  roomHeightM: number;
  
  sub1Enabled: boolean;
  sub1X: number;
  sub1Y: number;
  sub1Z?: number;
  
  sub2Enabled: boolean;
  sub2X: number;
  sub2Y: number;
  sub2Z?: number;
  
  frequency: number;
  speedOfSound: number;
  wallReflectionCoefficient: number;
  floorReflectionCoefficient: number;
  enableWallReflections: boolean;
  enableFloorReflection: boolean;
  listenerHeightM: number;
  defaultSourceHeightM: number;
  
  dynamicRangeDb: number;
}

const appState: AppState = {
  roomWidthM: 40,
  roomHeightM: 20,
  
  sub1Enabled: true,
  sub1X: 1,
  sub1Y: 1,
  
  sub2Enabled: false,
  sub2X: 15,
  sub2Y: 1,
  
  frequency: 63.0,
  speedOfSound: 343.0,
  wallReflectionCoefficient: 0.8,
  floorReflectionCoefficient: 0.8,
  enableWallReflections: true,
  enableFloorReflection: true,
  listenerHeightM: 1.5,
  defaultSourceHeightM: 0.5,
  
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
      <input type="number" id="${stateKey}" value="${value}" style="width: 60px" step="${step}">
    </label><br/>
  `;
}

// --- DOM Setup ---

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <canvas id="roomCanvas" width="800" height="400"></canvas>
  <div id="controls" style="margin-top: 16px; display: flex; flex-direction: column; gap: 12px; font-family: sans-serif; font-size: 14px; max-width: 800px; text-align: left;">
    <div style="display: flex; gap: 24px; padding-bottom: 12px; border-bottom: 1px solid #ccc;">
      <div>
        <strong>Sub 1</strong><br/>
        ${createCheckbox('Enabled', 'sub1Enabled')}
        ${createNumberInput('X (m)', 'sub1X', '0.1')}
        ${createNumberInput('Y (m)', 'sub1Y', '0.1')}
      </div>
      <div>
        <strong>Sub 2</strong><br/>
        ${createCheckbox('Enabled', 'sub2Enabled')}
        ${createNumberInput('X (m)', 'sub2X', '0.1')}
        ${createNumberInput('Y (m)', 'sub2Y', '0.1')}
      </div>
      <div>
        <strong>Heights & Display</strong><br/>
        ${createNumberInput('Listener Height (m)', 'listenerHeightM', '0.1')}
        ${createNumberInput('Sub Height (m)', 'defaultSourceHeightM', '0.1')}
        ${createNumberInput('Range (dB)', 'dynamicRangeDb', '1')}
      </div>
    </div>
    
    <div style="display: flex; gap: 24px;">
      <div>
        <strong>Wall Reflections</strong><br/>
        ${createCheckbox('Enabled', 'enableWallReflections')}
        ${createNumberInput('Coefficient', 'wallReflectionCoefficient', '0.1')}
      </div>
      <div>
        <strong>Floor Reflection</strong><br/>
        ${createCheckbox('Enabled', 'enableFloorReflection')}
        ${createNumberInput('Coefficient', 'floorReflectionCoefficient', '0.1')}
      </div>
    </div>

    <div style="font-size: 12px; color: #555;">
      Note: These coefficients are rough starting points, not absolute material constants.<br/>
      Examples: Glass ~0.95, Parquet/Hardwood ~0.90, Concrete/Hard drywall ~0.80
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
    sources.push({ x: appState.sub1X, y: appState.sub1Y, z: appState.sub1Z });
  }
  if (appState.sub2Enabled) {
    sources.push({ x: appState.sub2X, y: appState.sub2Y, z: appState.sub2Z });
  }
  return sources;
}

function buildAcousticSettings(): AcousticSettings {
  return {
    frequency: appState.frequency,
    speedOfSound: appState.speedOfSound,
    wallReflectionCoefficient: appState.wallReflectionCoefficient,
    floorReflectionCoefficient: appState.floorReflectionCoefficient,
    enableWallReflections: appState.enableWallReflections,
    enableFloorReflection: appState.enableFloorReflection,
    listenerHeightM: appState.listenerHeightM,
    defaultSourceHeightM: appState.defaultSourceHeightM,
  };
}

// --- Rendering ---

function render() {
  const room: RoomDimensions = { width: appState.roomWidthM, height: appState.roomHeightM };
  const sources = buildActiveSources();
  const settings = buildAcousticSettings();

  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw heatmap base
  const CELL_SIZE_PX = 4; // Coarse grid for rendering performance
  const cols = Math.ceil(canvas.width / CELL_SIZE_PX);
  const rows = Math.ceil(canvas.height / CELL_SIZE_PX);
  
  // 1. Run simulation step
  const { data, maxSPL } = evaluateGrid(room, sources, settings, cols, rows, CELL_SIZE_PX, PIXELS_PER_METER);
  
  // 2. Render data
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const spl = data[row * cols + col];
      const relativeSPL = spl - maxSPL; // 0 at max, negative elsewhere
      
      // Map relative SPL to [0, 1] for coloring
      const t = Math.max(0, (relativeSPL + appState.dynamicRangeDb) / appState.dynamicRangeDb);
      
      // Map t to hue: 0 (red) for loud, 240 (blue) for quiet
      const hue = (1 - t) * 240;
      
      ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
      ctx.fillRect(col * CELL_SIZE_PX, row * CELL_SIZE_PX, CELL_SIZE_PX, CELL_SIZE_PX);
    }
  }

  // Draw room outline on top
  const widthPx = room.width * PIXELS_PER_METER;
  const heightPx = room.height * PIXELS_PER_METER;
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, widthPx, heightPx);

  // Draw subwoofer markers on top
  ctx.fillStyle = 'red';
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 1;
  
  for (const source of sources) {
    const xPx = source.x * PIXELS_PER_METER;
    const yPx = (room.height - source.y) * PIXELS_PER_METER;
    ctx.beginPath();
    ctx.fillRect(xPx - 5, yPx - 5, 10, 10);
    ctx.strokeRect(xPx - 5, yPx - 5, 10, 10);
  }
}

// --- Wire Controls ---

function wireCheckbox(stateKey: keyof AppState) {
  const el = document.getElementById(stateKey) as HTMLInputElement;
  if (!el) return;
  el.addEventListener('change', () => {
    (appState as any)[stateKey] = el.checked;
    render();
  });
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
      
      (appState as any)[stateKey] = finalVal;
      render();
    }
  });
}

// Attach event listeners
wireCheckbox('sub1Enabled');
wireNumber('sub1X');
wireNumber('sub1Y');

wireCheckbox('sub2Enabled');
wireNumber('sub2X');
wireNumber('sub2Y');

wireCheckbox('enableWallReflections');
wireNumber('wallReflectionCoefficient', 0, 1);

wireCheckbox('enableFloorReflection');
wireNumber('floorReflectionCoefficient', 0, 1);

wireNumber('listenerHeightM', 0, 20); // Clamp listener to room height
wireNumber('defaultSourceHeightM', 0, 20); // Clamp source height to room height
wireNumber('dynamicRangeDb', 10, 120); // Clamp dB range 10-120

// Initial render
render();
