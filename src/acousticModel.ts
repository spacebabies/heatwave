export interface RoomDimensions {
  width: number;
  height: number;
}

export interface SoundSource {
  x: number;
  y: number;
  amplitude?: number;
  phaseOffsetRadians?: number;
}

interface Complex {
  re: number;
  im: number;
}

// Acoustic constants
const SPEED_OF_SOUND = 343.0; // m/s at ~20°C
const FREQUENCY = 63.0; // Hz
const WAVE_NUMBER = (2 * Math.PI * FREQUENCY) / SPEED_OF_SOUND;
const WALL_REFLECTION_COEFFICIENT = 0.8;

function addPathContribution(
  totalPressure: Complex,
  xMeters: number,
  yMeters: number,
  srcX: number,
  srcY: number,
  srcAmp: number,
  srcPhase: number,
  reflectionGain: number
) {
  const dx = xMeters - srcX;
  const dy = yMeters - srcY;
  let r = Math.sqrt(dx * dx + dy * dy);
  r = Math.max(0.1, r); // Clamp min distance to avoid singularities
  
  // Complex pressure: p = (A / r) * exp(j * (-k * r + phaseOffset))
  const amplitude = (srcAmp * reflectionGain) / r;
  const phase = -WAVE_NUMBER * r + srcPhase;
  
  totalPressure.re += amplitude * Math.cos(phase);
  totalPressure.im += amplitude * Math.sin(phase);
}

export function samplePointSPL(xMeters: number, yMeters: number, sources: SoundSource[], room: RoomDimensions): number {
  if (sources.length === 0) return -Infinity;
  
  let totalPressure: Complex = { re: 0, im: 0 };

  for (const source of sources) {
    const srcAmp = source.amplitude ?? 1.0;
    const srcPhase = source.phaseOffsetRadians ?? 0.0;
    
    // Direct path
    addPathContribution(totalPressure, xMeters, yMeters, source.x, source.y, srcAmp, srcPhase, 1.0);
    
    // First-order reflections (image sources)
    // Left wall (x = 0)
    addPathContribution(totalPressure, xMeters, yMeters, -source.x, source.y, srcAmp, srcPhase, WALL_REFLECTION_COEFFICIENT);
    
    // Right wall (x = room.width)
    addPathContribution(totalPressure, xMeters, yMeters, 2 * room.width - source.x, source.y, srcAmp, srcPhase, WALL_REFLECTION_COEFFICIENT);
    
    // Bottom wall (y = 0)
    addPathContribution(totalPressure, xMeters, yMeters, source.x, -source.y, srcAmp, srcPhase, WALL_REFLECTION_COEFFICIENT);
    
    // Top wall (y = room.height)
    addPathContribution(totalPressure, xMeters, yMeters, source.x, 2 * room.height - source.y, srcAmp, srcPhase, WALL_REFLECTION_COEFFICIENT);
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
      
      const spl = samplePointSPL(xMeters, yMeters, sources, room);
      data[row * cols + col] = spl;
      
      if (spl > maxSPL) {
        maxSPL = spl;
      }
    }
  }
  
  return { data, maxSPL };
}
