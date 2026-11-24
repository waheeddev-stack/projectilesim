/**
 * Projectile object presets. Selecting one fills in the launch parameters.
 * "plane" is a heavy 5-tonne aircraft that itself flies the projectile arc
 * (it is drawn as a plane pointing along its velocity).
 */
export const OBJECT_PRESETS = {
  ball: {
    label: 'Baseball',
    params: { mass: 0.145, dragCoeff: 0.47, area: 0.0043, initialHeight: 0, angle: 45, velocity: 20, airResistanceEnabled: false },
  },
  cannonball: {
    label: 'Cannonball (heavy)',
    params: { mass: 6, dragCoeff: 0.47, area: 0.0177, initialHeight: 0, angle: 45, velocity: 80, airResistanceEnabled: true },
  },
  plane: {
    label: 'Plane (heavy object)',
    params: { mass: 5000, dragCoeff: 0.3, area: 10, initialHeight: 0, angle: 35, velocity: 100, airResistanceEnabled: true },
  },
};
