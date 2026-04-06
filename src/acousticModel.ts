export interface RoomDimensions {
  width: number;
  height: number;
}

export interface SoundSource {
  x: number;
  y: number;
  z?: number;
  amplitude?: number;
  phaseOffsetRadians?: number;
}

export interface AcousticSettings {
  frequency: number;
  speedOfSound: number;
  wallReflectionCoefficient: number;
  floorReflectionCoefficient: number;
  enableWallReflections: boolean;
  enableFloorReflection: boolean;
  listenerHeightM: number;
  defaultSourceHeightM: number;
}

interface Complex {
  re: number;
  im: number;
}

function addPathContribution(
  totalPressure: Complex,
  xMeters: number,
  yMeters: number,
  listenerZ: number,
  srcX: number,
  srcY: number,
  srcZ: number,
  srcAmp: number,
  srcPhase: number,
  reflectionGain: number,
  waveNumber: number
) {
  const dx = xMeters - srcX;
  const dy = yMeters - srcY;
  const dz = listenerZ - srcZ;
  let r = Math.sqrt(dx * dx + dy * dy + dz * dz);
  r = Math.max(0.1, r); // Clamp min distance to avoid singularities
  
  // Complex pressure: p = (A / r) * exp(j * (-k * r + phaseOffset))
  const amplitude = (srcAmp * reflectionGain) / r;
  const phase = -waveNumber * r + srcPhase;
  
  totalPressure.re += amplitude * Math.cos(phase);
  totalPressure.im += amplitude * Math.sin(phase);
}

export function samplePointSPL(
  xMeters: number, 
  yMeters: number, 
  sources: SoundSource[], 
  room: RoomDimensions,
  settings: AcousticSettings
): number {
  if (sources.length === 0) return -Infinity;
  
  let totalPressure: Complex = { re: 0, im: 0 };
  const waveNumber = (2 * Math.PI * settings.frequency) / settings.speedOfSound;

  for (const source of sources) {
    const srcAmp = source.amplitude ?? 1.0;
    const srcPhase = source.phaseOffsetRadians ?? 0.0;
    const srcZ = source.z ?? settings.defaultSourceHeightM;
    
    // Direct path
    addPathContribution(totalPressure, xMeters, yMeters, settings.listenerHeightM, source.x, source.y, srcZ, srcAmp, srcPhase, 1.0, waveNumber);
    
    // Floor reflection (image source vertically mirrored across z = 0)
    if (settings.enableFloorReflection) {
      addPathContribution(totalPressure, xMeters, yMeters, settings.listenerHeightM, source.x, source.y, -srcZ, srcAmp, srcPhase, settings.floorReflectionCoefficient, waveNumber);
    }
    
    // First-order wall reflections (image sources in plan view, using true source height)
    if (settings.enableWallReflections) {
      // Left wall (x = 0)
      addPathContribution(totalPressure, xMeters, yMeters, settings.listenerHeightM, -source.x, source.y, srcZ, srcAmp, srcPhase, settings.wallReflectionCoefficient, waveNumber);
      
      // Right wall (x = room.width)
      addPathContribution(totalPressure, xMeters, yMeters, settings.listenerHeightM, 2 * room.width - source.x, source.y, srcZ, srcAmp, srcPhase, settings.wallReflectionCoefficient, waveNumber);
      
      // Bottom wall (y = 0)
      addPathContribution(totalPressure, xMeters, yMeters, settings.listenerHeightM, source.x, -source.y, srcZ, srcAmp, srcPhase, settings.wallReflectionCoefficient, waveNumber);
      
      // Top wall (y = room.height)
      addPathContribution(totalPressure, xMeters, yMeters, settings.listenerHeightM, source.x, 2 * room.height - source.y, srcZ, srcAmp, srcPhase, settings.wallReflectionCoefficient, waveNumber);
    }
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
  settings: AcousticSettings,
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
      
      const spl = samplePointSPL(xMeters, yMeters, sources, room, settings);
      data[row * cols + col] = spl;
      
      if (spl > maxSPL) {
        maxSPL = spl;
      }
    }
  }
  
  return { data, maxSPL };
}
