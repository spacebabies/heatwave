export interface RoomDimensions {
  width: number;
  height: number;
}

export interface SoundSource {
  x: number;
  y: number;
}

interface Complex {
  re: number;
  im: number;
}

// Acoustic constants
const SPEED_OF_SOUND = 343.0; // m/s at ~20°C
const FREQUENCY = 63.0; // Hz
const WAVE_NUMBER = (2 * Math.PI * FREQUENCY) / SPEED_OF_SOUND;

export function samplePointSPL(xMeters: number, yMeters: number, sources: SoundSource[]): number {
  if (sources.length === 0) return -Infinity;
  
  let totalPressure: Complex = { re: 0, im: 0 };

  for (const source of sources) {
    const dx = xMeters - source.x;
    const dy = yMeters - source.y;
    let r = Math.sqrt(dx * dx + dy * dy);
    r = Math.max(0.1, r); // Clamp min distance to avoid singularities
    
    // Complex pressure: p = (1 / r) * exp(-j * k * r)
    // where exp(-j * phi) = cos(-phi) + j * sin(-phi) = cos(phi) - j * sin(phi)
    // Let phi = k * r
    const amplitude = 1 / r;
    const phase = -WAVE_NUMBER * r;
    
    totalPressure.re += amplitude * Math.cos(phase);
    totalPressure.im += amplitude * Math.sin(phase);
  }
  
  // Magnitude of complex pressure
  const magnitude = Math.sqrt(totalPressure.re * totalPressure.re + totalPressure.im * totalPressure.im);
  
  // SPL in relative dB
  // Note: Since amplitude is proportional to 1/r, the 20 * log10(magnitude) still equates 
  // to -20 * log10(r) for a single source, preserving the same relative scale.
  return 20 * Math.log10(magnitude);
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
