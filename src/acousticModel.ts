export interface RoomDimensions {
  width: number;
  height: number;
}

export interface SoundSource {
  x: number;
  y: number;
}

export function samplePointSPL(xMeters: number, yMeters: number, sources: SoundSource[]): number {
  if (sources.length === 0) return -Infinity;
  
  // For now, to preserve current exact output, just evaluate the first source
  const source = sources[0];
  const dx = xMeters - source.x;
  const dy = yMeters - source.y;
  let d = Math.sqrt(dx * dx + dy * dy);
  d = Math.max(0.1, d); // Clamp min distance to avoid singularities
  
  // Standard distance attenuation: -20 * log10(d)
  return -20 * Math.log10(d);
}

export function evaluateGrid(
  room: RoomDimensions,
  sources: SoundSource[],
  cols: number,
  rows: number,
  cellSizePx: number,
  pixelsPerMeter: number
) {
  const data = new Float32Array(cols * rows);
  let maxSPL = -Infinity;
  
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      // Find center pixel of the grid cell
      const px = col * cellSizePx + cellSizePx / 2;
      const py = row * cellSizePx + cellSizePx / 2;
      
      // Convert to room coordinates
      const xMeters = px / pixelsPerMeter;
      const yMeters = room.height - (py / pixelsPerMeter);
      
      const spl = samplePointSPL(xMeters, yMeters, sources);
      data[row * cols + col] = spl;
      
      if (spl > maxSPL) {
        maxSPL = spl;
      }
    }
  }
  
  return { data, maxSPL };
}
