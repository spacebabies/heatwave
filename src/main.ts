import './style.css';
import type { RoomDimensions, SoundSource } from './acousticModel';
import { evaluateGrid } from './acousticModel';

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div style="font-family: monospace; font-size: 12px; margin-bottom: 8px;">sub: (1m, 1m)</div>
  <canvas id="roomCanvas" width="800" height="400"></canvas>
`;

const canvas = document.getElementById('roomCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

// Coordinate conversion mapping
const PIXELS_PER_METER = 20;

// Room setup
const room: RoomDimensions = { width: 40, height: 20 };
const sources: SoundSource[] = [{ x: 1, y: 1 }];

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
  const { data, maxSPL } = evaluateGrid(room, sources, cols, rows, CELL_SIZE_PX, PIXELS_PER_METER);
  
  // 2. Render data
  const DYNAMIC_RANGE_DB = 50; // Show a 50dB range
  
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const spl = data[row * cols + col];
      const relativeSPL = spl - maxSPL; // 0 at max, negative elsewhere
      
      // Map relative SPL to [0, 1] for coloring
      const t = Math.max(0, (relativeSPL + DYNAMIC_RANGE_DB) / DYNAMIC_RANGE_DB);
      
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
