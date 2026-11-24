import { useId, useState } from 'react';

/** Slider with a synced numeric input. Values are clamped to [min, max]. */
export default function Field({ label, value, min, max, step = 1, unit, onChange, disabled, hint }) {
  const id = useId();
  const [draft, setDraft] = useState(null);

  const clamp = (v) => Math.min(max, Math.max(min, v));

  function handleNumber(e) {
    setDraft(e.target.value);
    const n = parseFloat(e.target.value);
    if (Number.isFinite(n)) onChange(clamp(n));
  }

  return (
    <div className="field">
      <div className="field__top">
        <label className="label" htmlFor={`${id}-num`}>
          {label}
        </label>
        {unit && <span className="field__unit">{unit}</span>}
      </div>
      <div className="field__control">
        <input
          type="range"
          aria-label={`${label} slider`}
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(e) => {
            setDraft(null);
            onChange(Number(e.target.value));
          }}
        />
        <input
          id={`${id}-num`}
          className="input"
          type="number"
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          value={draft ?? String(Math.round(value * 10000) / 10000)}
          onChange={handleNumber}
          onBlur={() => setDraft(null)}
        />
      </div>
      {hint && <span className="field__unit">{hint}</span>}
    </div>
  );
}
