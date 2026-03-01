import type { CameraBody, Lens, FocalLength } from '../domain/collection-item.entity';

/**
 * Available camera bodies.
 */
export const CAMERA_BODIES: CameraBody[] = [
  { id: 'imax', name: 'IMAX Film Camera', type: 'cinema' },
  { id: 'red-komodo', name: 'RED Komodo 6K', type: 'cinema' },
  { id: 'arri-alexa', name: 'ARRI Alexa Mini', type: 'cinema' },
  { id: 'sony-fx6', name: 'Sony FX6', type: 'cinema' },
  { id: 'canon-r5', name: 'Canon EOS R5', type: 'mirrorless' },
  { id: 'sony-a7s3', name: 'Sony A7S III', type: 'mirrorless' },
];

/**
 * Available lenses.
 */
export const LENSES: Lens[] = [
  { id: 'zeiss-ultra', name: 'Zeiss Ultra Prime', brand: 'Zeiss', type: 'prime' },
  { id: 'canon-l', name: 'Canon L Series', brand: 'Canon', type: 'prime' },
  { id: 'cooke-s4', name: 'Cooke S4/i', brand: 'Cooke', type: 'prime' },
  { id: 'sigma-art', name: 'Sigma Art', brand: 'Sigma', type: 'prime' },
  { id: 'angenieux', name: 'Angenieux Optimo', brand: 'Angenieux', type: 'zoom' },
];

/**
 * Available focal lengths.
 */
export const FOCAL_LENGTHS: FocalLength[] = [
  { value: 16, label: '16 mm', category: 'ultra-wide' },
  { value: 24, label: '24 mm', category: 'wide' },
  { value: 35, label: '35 mm', category: 'standard' },
  { value: 50, label: '50 mm', category: 'standard' },
  { value: 85, label: '85 mm', category: 'portrait' },
  { value: 135, label: '135 mm', category: 'telephoto' },
];

/**
 * Default camera setup.
 */
export const DEFAULT_CAMERA_SETUP = {
  camera: CAMERA_BODIES[0],
  lens: LENSES[0],
  focalLength: FOCAL_LENGTHS[1],
};

/**
 * Get camera body by ID.
 */
export function getCameraById(id: string): CameraBody | undefined {
  return CAMERA_BODIES.find((camera) => camera.id === id);
}

/**
 * Get lens by ID.
 */
export function getLensById(id: string): Lens | undefined {
  return LENSES.find((lens) => lens.id === id);
}

/**
 * Get focal length by value.
 */
export function getFocalLengthByValue(value: number): FocalLength | undefined {
  return FOCAL_LENGTHS.find((focalLength) => focalLength.value === value);
}

/**
 * Get keywords for focal length category.
 */
export function getFocalLengthKeywords(category: FocalLength['category']): string[] {
  const keywords: Record<FocalLength['category'], string[]> = {
    'ultra-wide': ['ultra wide angle', 'dramatic perspective'],
    wide: ['wide angle', 'expansive'],
    standard: ['standard perspective', 'natural view'],
    portrait: ['portrait lens', 'beautiful bokeh', 'subject isolation'],
    telephoto: ['telephoto', 'compressed perspective', 'shallow depth of field'],
  };

  return keywords[category] || [];
}
