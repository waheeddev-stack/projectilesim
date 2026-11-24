/**
 * Projectile object presets. Selecting one fills in the launch parameters.
 * "plane" is a heavy object released from an aircraft in level flight:
 * it starts at the plane's height with the plane's horizontal speed (angle 0).
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
    label: 'Heavy object dropped from plane',
    params: { mass: 250, dragCoeff: 0.3, area: 0.2, initialHeight: 500, angle: 0, velocity: 90, airResistanceEnabled: true },
  },
};
