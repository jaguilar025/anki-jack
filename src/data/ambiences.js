// Ambientes de la escena del avatar. Cada uno define:
//  - labelKey: clave i18n del nombre
//  - vrm: luces 3D (three.js)
//      key:  luz principal { color, intensity, azimuth (° horizontal, 0 = de frente), elevation (° altura) }
//      sky/ground/hemi: luz de cielo (desde arriba) y suelo (rebote desde abajo) + intensidad
//      rim:  luz de contorno desde atrás { color, intensity } (0 = apagada)
//  - live2d: filtro de color 2D (Live2D no tiene luces)
//      brightness (1 = normal), saturation (0 = normal, -1 gris, 1 muy saturado),
//      tint + tintAmount (color que tiñe el modelo, 0..1)

export const AMBIENCES = [
  {
    id: 'day',
    labelKey: 'avatar.ambience.day',
    swatch: 'linear-gradient(160deg, #fff6e0, #cfe8ff)',
    vrm: {
      key: { color: '#fff6e8', intensity: 3.0, azimuth: 25, elevation: 35 },
      sky: '#ffffff', ground: '#8a8a8a', hemi: 1.0,
      rim: { color: '#ffffff', intensity: 0 },
    },
    live2d: { brightness: 1, saturation: 0, tint: '#ffffff', tintAmount: 0 },
  },
  {
    id: 'sunset',
    labelKey: 'avatar.ambience.sunset',
    swatch: 'linear-gradient(160deg, #ffcf9f, #ff9a9e 60%, #a18cd1)',
    vrm: {
      key: { color: '#ffb070', intensity: 2.6, azimuth: -55, elevation: 12 },
      sky: '#ffcf9f', ground: '#5a3a5e', hemi: 0.8,
      rim: { color: '#ff7a59', intensity: 1.6 },
    },
    live2d: { brightness: 0.95, saturation: 0.1, tint: '#ffb27a', tintAmount: 0.35 },
  },
  {
    id: 'night',
    labelKey: 'avatar.ambience.night',
    swatch: 'linear-gradient(160deg, #3a4a7a, #101020)',
    vrm: {
      key: { color: '#9fb4ff', intensity: 1.2, azimuth: 40, elevation: 55 },
      sky: '#3a4a7a', ground: '#101020', hemi: 0.7,
      rim: { color: '#7aa2ff', intensity: 1.4 },
    },
    live2d: { brightness: 0.7, saturation: -0.25, tint: '#7f95ff', tintAmount: 0.4 },
  },
  {
    id: 'studio',
    labelKey: 'avatar.ambience.studio',
    swatch: 'linear-gradient(160deg, #ffffff, #9a9a9a)',
    vrm: {
      key: { color: '#ffffff', intensity: 3.2, azimuth: 35, elevation: 25 },
      sky: '#ffffff', ground: '#555555', hemi: 0.9,
      rim: { color: '#ffffff', intensity: 1.2 },
    },
    live2d: { brightness: 1.05, saturation: 0, tint: '#ffffff', tintAmount: 0 },
  },
  {
    id: 'neon',
    labelKey: 'avatar.ambience.neon',
    swatch: 'linear-gradient(160deg, #ff6ad5, #4a2a7a 55%, #3ef2ff)',
    vrm: {
      key: { color: '#ff6ad5', intensity: 1.6, azimuth: -60, elevation: 10 },
      sky: '#4a2a7a', ground: '#0a1030', hemi: 0.6,
      rim: { color: '#3ef2ff', intensity: 2.5 },
    },
    live2d: { brightness: 0.9, saturation: 0.3, tint: '#e07bff', tintAmount: 0.35 },
  },
  {
    id: 'sakura',
    labelKey: 'avatar.ambience.sakura',
    swatch: 'linear-gradient(160deg, #fff1f5, #ffc4da)',
    vrm: {
      key: { color: '#ffe4ef', intensity: 2.8, azimuth: 20, elevation: 40 },
      sky: '#ffd6e5', ground: '#b07a90', hemi: 1.0,
      rim: { color: '#ffb3cf', intensity: 1.0 },
    },
    live2d: { brightness: 1.03, saturation: 0.05, tint: '#ffc4da', tintAmount: 0.25 },
  },
]

export const DEFAULT_AMBIENCE = AMBIENCES[0]
