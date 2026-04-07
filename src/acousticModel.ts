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
  cardioidEnabled?: boolean;
  directionDeg?: number;
}

export interface AcousticSettings {
  frequency: number;
  speedOfSound: number;
  wallReflectionAmplitude: number;
  floorReflectionAmplitude: number;
  enableWallReflections: boolean;
  enableFloorReflection: boolean;
  listenerHeightM: number;
  defaultSourceHeightM: number;
}

interface Complex {
  re: number;
  im: number;
}

// Explicit angle convention: 0 = up (+Y), 90 = right (+X), 180 = down (-Y), 270 = left (-X)
function getForwardVector(directionDeg: number) {
  const rad = directionDeg * Math.PI / 180;
  return {
    x: Math.sin(rad),
    y: Math.cos(rad),
    z: 0
  };
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
  waveNumber: number,
  cardioidEnabled: boolean,
  dirX: number,
  dirY: number
) {
  const dx = xMeters - srcX;
  const dy = yMeters - srcY;
  const dz = listenerZ - srcZ;
  let r = Math.sqrt(dx * dx + dy * dy + dz * dz);
  r = Math.max(0.1, r); // Clamp min distance to avoid singularities
  
  let directivityGain = 1.0;
  if (cardioidEnabled) {
    const rho = Math.sqrt(dx * dx + dy * dy);
    if (rho > 0.001) {
      const ndx = dx / rho;
      const ndy = dy / rho;
      const cosDelta = dirX * ndx + dirY * ndy;
      directivityGain = 0.5 * (1 + cosDelta);
      if (directivityGain < 0) directivityGain = 0;
      if (directivityGain > 1) directivityGain = 1;
    }
  }
  
  // Complex pressure: p = (A / r) * exp(j * (-k * r + phaseOffset))
  const amplitude = (srcAmp * reflectionGain * directivityGain) / r;
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
    const isCardioid = source.cardioidEnabled ?? false;
    let fwdX = 0, fwdY = 0;
    
    if (isCardioid) {
      const fwd = getForwardVector(source.directionDeg ?? 90);
      fwdX = fwd.x;
      fwdY = fwd.y;
    }
    
    // Direct path
    addPathContribution(totalPressure, xMeters, yMeters, settings.listenerHeightM, source.x, source.y, srcZ, srcAmp, srcPhase, 1.0, waveNumber, isCardioid, fwdX, fwdY);
    
    // Floor reflection (image source vertically mirrored across z = 0)
    if (settings.enableFloorReflection) {
      addPathContribution(totalPressure, xMeters, yMeters, settings.listenerHeightM, source.x, source.y, -srcZ, srcAmp, srcPhase, settings.floorReflectionAmplitude, waveNumber, isCardioid, fwdX, fwdY);
    }
    
    // First-order wall reflections (image sources in plan view, using true source height)
    if (settings.enableWallReflections) {
      // Left wall (x = 0)
      addPathContribution(totalPressure, xMeters, yMeters, settings.listenerHeightM, -source.x, source.y, srcZ, srcAmp, srcPhase, settings.wallReflectionAmplitude, waveNumber, isCardioid, -fwdX, fwdY);
      
      // Right wall (x = room.width)
      addPathContribution(totalPressure, xMeters, yMeters, settings.listenerHeightM, 2 * room.width - source.x, source.y, srcZ, srcAmp, srcPhase, settings.wallReflectionAmplitude, waveNumber, isCardioid, -fwdX, fwdY);
      
      // Bottom wall (y = 0)
      addPathContribution(totalPressure, xMeters, yMeters, settings.listenerHeightM, source.x, -source.y, srcZ, srcAmp, srcPhase, settings.wallReflectionAmplitude, waveNumber, isCardioid, fwdX, -fwdY);
      
      // Top wall (y = room.height)
      addPathContribution(totalPressure, xMeters, yMeters, settings.listenerHeightM, source.x, 2 * room.height - source.y, srcZ, srcAmp, srcPhase, settings.wallReflectionAmplitude, waveNumber, isCardioid, fwdX, -fwdY);
    }
  }
  
  // Magnitude of complex pressure
  const magnitude = Math.sqrt(totalPressure.re * totalPressure.re + totalPressure.im * totalPressure.im);
  
  // Clamp magnitude to avoid -Infinity from log10(0) during perfect cancellation
  const safeMagnitude = Math.max(1e-12, magnitude);
  
  // SPL in relative dB
  // Note: Since amplitude is proportional to 1/r, the 20 * log10(magnitude) still equates 
  // to -20 * log10(r) for a single source, preserving the same relative scale.
  return 20 * Math.log10(safeMagnitude);
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
