import './style.css';

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div style="font-family: monospace; font-size: 12px; margin-bottom: 8px;">sub: (1m, 1m)</div>
  <canvas id="roomCanvas" width="800" height="400"></canvas>
`;

const canvas = document.getElementById('roomCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

// Coordinate conversion mapping
const PIXELS_PER_METER = 20;

// Room dimensions in meters
const ROOM_WIDTH_METERS = 40;
const ROOM_HEIGHT_METERS = 20;

// Subwoofer position in meters (origin bottom-left)
const SUB_X_METERS = 1;
const SUB_Y_METERS = 1;

// Convert room coordinates (meters, bottom-left origin) to canvas coordinates (pixels, top-left origin)
function metersToPixels(xMeters: number, yMeters: number) {
  const xPx = xMeters * PIXELS_PER_METER;
  const yPx = (ROOM_HEIGHT_METERS - yMeters) * PIXELS_PER_METER;
  return { x: xPx, y: yPx };
}

function drawRoom() {
  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Convert room dimensions to pixels
  const widthPx = ROOM_WIDTH_METERS * PIXELS_PER_METER;
  const heightPx = ROOM_HEIGHT_METERS * PIXELS_PER_METER;

  // Draw room outline
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, widthPx, heightPx);

  // Draw subwoofer
  const subPos = metersToPixels(SUB_X_METERS, SUB_Y_METERS);
  
  ctx.fillStyle = 'red';
  ctx.beginPath();
  // Draw a 10x10 square centered at the coordinate
  ctx.fillRect(subPos.x - 5, subPos.y - 5, 10, 10);
}

drawRoom();
