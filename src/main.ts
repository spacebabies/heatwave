import './style.css';
import type { RoomDimensions, SoundSource, AcousticSettings } from './acousticModel';
import { evaluateGrid } from './acousticModel';

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <canvas id="roomCanvas" width="800" height="400"></canvas>
`;

const canvas = document.getElementById('roomCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

// Coordinate conversion mapping
const PIXELS_PER_METER = 20;

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

// Derive simulation inputs from app state
const room: RoomDimensions = { width: appState.roomWidthM, height: appState.roomHeightM };

const sources: SoundSource[] = [];
if (appState.sub1Enabled) {
  sources.push({ x: appState.sub1X, y: appState.sub1Y, z: appState.sub1Z });
}
if (appState.sub2Enabled) {
  sources.push({ x: appState.sub2X, y: appState.sub2Y, z: appState.sub2Z });
}

const acousticSettings: AcousticSettings = {
  frequency: appState.frequency,
  speedOfSound: appState.speedOfSound,
  wallReflectionCoefficient: appState.wallReflectionCoefficient,
  floorReflectionCoefficient: appState.floorReflectionCoefficient,
  enableWallReflections: appState.enableWallReflections,
  enableFloorReflection: appState.enableFloorReflection,
  listenerHeightM: appState.listenerHeightM,
  defaultSourceHeightM: appState.defaultSourceHeightM,
};

// Convert room coordinates (meters, bottom-left origin) to canvas coordinates (pixels, top-left origin)
function metersToPixels(xMeters: number, yMeters: number) {
  const xPx = xMeters * PIXELS_PER_METER;
  const yPx = (room.height - yMeters) * PIXELS_PER_METER;
  return { x: xPx, y: yPx };
}

// --- Rendering ---

function drawHeatmap() {
  const CELL_SIZE_PX = 4; // Coarse grid for rendering performance
  const cols = Math.ceil(canvas.width / CELL_SIZE_PX);
  const rows = Math.ceil(canvas.height / CELL_SIZE_PX);
  
  // 1. Run simulation step
  const { data, maxSPL } = evaluateGrid(room, sources, acousticSettings, cols, rows, CELL_SIZE_PX, PIXELS_PER_METER);
  
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
}

function drawRoom() {
  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw heatmap base
  drawHeatmap();

  // Convert room dimensions to pixels
  const widthPx = room.width * PIXELS_PER_METER;
  const heightPx = room.height * PIXELS_PER_METER;

  // Draw room outline on top
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, widthPx, heightPx);

  // Draw subwoofer markers on top
  ctx.fillStyle = 'red';
  ctx.strokeStyle = 'white'; // White border to stand out against the red heatmap
  ctx.lineWidth = 1;
  
  for (const source of sources) {
    const subPos = metersToPixels(source.x, source.y);
    ctx.beginPath();
    ctx.fillRect(subPos.x - 5, subPos.y - 5, 10, 10);
    ctx.strokeRect(subPos.x - 5, subPos.y - 5, 10, 10);
  }
}

drawRoom();
