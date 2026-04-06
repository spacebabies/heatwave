import './style.css';

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <canvas id="roomCanvas" width="800" height="400"></canvas>
`;

const canvas = document.getElementById('roomCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

// Coordinate conversion mapping
const PIXELS_PER_METER = 20;

// Room dimensions in meters
const ROOM_WIDTH_METERS = 40;
const ROOM_HEIGHT_METERS = 20;

function drawRoom() {
  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Convert meters to pixels
  const widthPx = ROOM_WIDTH_METERS * PIXELS_PER_METER;
  const heightPx = ROOM_HEIGHT_METERS * PIXELS_PER_METER;

  // Draw room outline
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, widthPx, heightPx);
}

drawRoom();
