import {
  GRAVITY_PRESETS,
  LIMITS,
  dragCoeffFromLevel,
  dragConstant,
  levelFromDragCoeff,
} from '../physics/engine.js';
import { OBJECT_PRESETS } from '../physics/presets.js';
import Field from './Field.jsx';

/** Parameter panel: angle, velocity, air resistance and an Advanced section. */
export default function Controls({ params, onChange, lockDrag, compare }) {
  const set = (key) => (value) => onChange({ ...params, [key]: value });
  const k = dragConstant(params);
  const presetName =
    Object.entries(GRAVITY_PRESETS).find(([, g]) => Math.abs(g - params.gravity) < 0.001)?.[0] ?? 'custom';

  return (
    <section className="panel" aria-labelledby="controls-title">
      <h2 id="controls-title">Launch parameters</h2>

      <div className="field">
        <label className="label" htmlFor="object-preset">
          Projectile object
        </label>
        <select
          id="object-preset"
          className="select"
          value={params.object || 'ball'}
          disabled={lockDrag}
          onChange={(e) => onChange({ ...params, ...OBJECT_PRESETS[e.target.value].params, object: e.target.value })}
        >
          {Object.entries(OBJECT_PRESETS).map(([key, o]) => (
            <option key={key} value={key}>
              {o.label}
            </option>
          ))}
        </select>
        {params.object === 'plane' && (
          <span className="field__unit">The plane itself flies the projectile arc (5 tonnes, unpowered).</span>
        )}
      </div>

      <Field label="Angle" unit="deg" value={params.angle} min={LIMITS.angle.min} max={LIMITS.angle.max} step={0.5} onChange={set('angle')} />
      <Field label="Velocity" unit="m/s" value={params.velocity} min={1} max={100} step={0.5} onChange={set('velocity')} />

      <div className="field">
        <label className="check">
          <input
            type="checkbox"
            checked={params.airResistanceEnabled}
            disabled={lockDrag || compare}
            onChange={(e) => onChange({ ...params, airResistanceEnabled: e.target.checked })}
          />
          Air resistance
        </label>
        {compare && <span className="field__unit">Compare mode always includes drag.</span>}
        {lockDrag && <span className="field__unit">Set by target difficulty.</span>}
      </div>
      <Field
        label="Air resistance level"
        unit="%"
        value={Math.round(levelFromDragCoeff(params.dragCoeff) * 100)}
        min={0}
        max={100}
        step={1}
        disabled={lockDrag || !(params.airResistanceEnabled || compare)}
        onChange={(v) => onChange({ ...params, dragCoeff: dragCoeffFromLevel(v / 100) })}
        hint={`drag constant k = ${k.toFixed(4)} 1/m`}
      />

      <details className="advanced">
        <summary>Advanced</summary>
        <div className="field">
          <label className="label" htmlFor="gravity-preset">
            Gravity preset
          </label>
          <select
            id="gravity-preset"
            className="select"
            value={presetName}
            onChange={(e) => {
              const g = GRAVITY_PRESETS[e.target.value];
              if (g) onChange({ ...params, gravity: g });
            }}
          >
            {Object.entries(GRAVITY_PRESETS).map(([name, g]) => (
              <option key={name} value={name}>
                {name} ({g} m/s²)
              </option>
            ))}
            <option value="custom">Custom</option>
          </select>
        </div>
        <Field label="Gravity" unit="m/s²" value={params.gravity} min={LIMITS.gravity.min} max={LIMITS.gravity.max} step={0.01} onChange={set('gravity')} />
        <Field label="Initial height" unit="m" value={params.initialHeight} min={0} max={1000} step={1} onChange={set('initialHeight')} />
        <Field label="Mass" unit="kg" value={params.mass} min={LIMITS.mass.min} max={20000} step={0.5} onChange={set('mass')} />
        <Field
          label="Drag coefficient Cd"
          value={params.dragCoeff}
          min={LIMITS.dragCoeff.min}
          max={LIMITS.dragCoeff.max}
          step={0.01}
          disabled={lockDrag}
          onChange={set('dragCoeff')}
        />
        <Field label="Cross-section area" unit="m²" value={params.area} min={LIMITS.area.min} max={1} step={0.0005} onChange={set('area')} />
        <Field label="Air density" unit="kg/m³" value={params.airDensity} min={0} max={5} step={0.005} onChange={set('airDensity')} />
      </details>
    </section>
  );
}
