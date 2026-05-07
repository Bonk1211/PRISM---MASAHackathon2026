import { useState } from 'react';
import { Eyebrow, Hairline } from '../Card';

const PRETTY_FEATURE: Record<string, string> = {
  log_GDP: 'log GDP',
  log_pop: 'log Population',
  log_GHG_lag1: 'log GHG · lag 1',
  log_GHG_lag2: 'log GHG · lag 2',
  renewable_energy_pct: 'Renewable %',
  urban_pop_pct: 'Urban pop %',
  industry_pct_GDP: 'Industry % GDP',
  forest_area_pct: 'Forest area %',
  CO2_intensity_GDP: 'CO₂/GDP',
  GDP_per_capita_2015USD: 'GDP/capita',
};

const FEATURE_UNIT: Record<string, string> = {
  log_GDP: 'log USD',
  log_pop: 'log persons',
  log_GHG_lag1: 'log Mt',
  log_GHG_lag2: 'log Mt',
  renewable_energy_pct: '%',
  urban_pop_pct: '%',
  industry_pct_GDP: '%',
  forest_area_pct: '%',
  CO2_intensity_GDP: 'kg/USD',
  GDP_per_capita_2015USD: 'USD',
};

/**
 * FeatureOverridePanel — pill grid + pop-out slider.
 *
 * Tap a feature pill to expand its slider beneath. Overridden features show
 * a red dot. Sits inside Stage 02 of the pipeline flow.
 */
export function FeatureOverridePanel({
  features,
  ranges,
  baseValues,
  overrides,
  onChange,
  onResetAll,
}: {
  features: string[];
  ranges: Record<string, { min: number; max: number }>;
  baseValues: Record<string, number>;
  overrides: Record<string, number>;
  onChange: (key: string, value: number | undefined) => void;
  onResetAll: () => void;
}) {
  const [active, setActive] = useState<string | null>(null);
  const overrideCount = Object.keys(overrides).length;

  return (
    <div>
      <div className="flex items-center justify-between">
        <Eyebrow>Feature overrides</Eyebrow>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] tab-num text-muted">
            {overrideCount} / {features.length}
          </span>
          {overrideCount > 0 && (
            <button
              type="button"
              onClick={onResetAll}
              className="font-mono text-[10px] uppercase tracking-eyebrow text-sea hover:underline"
            >
              reset
            </button>
          )}
        </div>
      </div>
      <p className="mt-1 text-[11px] text-muted">
        Tap a feature to perturb. <span className="text-rust">●</span> = override active.
      </p>

      <Hairline className="mt-2" />

      <div className="mt-3 flex flex-wrap gap-1.5">
        {features.map((f) => {
          const isActive = active === f;
          const isOverridden = overrides[f] !== undefined;
          const pretty = PRETTY_FEATURE[f] ?? f;
          return (
            <button
              key={f}
              type="button"
              onClick={() => setActive(isActive ? null : f)}
              aria-pressed={isActive}
              className={[
                'inline-flex items-center gap-1 border px-2 py-1 font-mono text-[10px] transition',
                isActive
                  ? 'border-ink bg-ink text-paper'
                  : isOverridden
                  ? 'border-rust/60 bg-rust/8 text-rust'
                  : 'border-rule bg-paper text-ink hover:border-ink',
              ].join(' ')}
            >
              {isOverridden && (
                <span aria-hidden="true" className={isActive ? 'text-paper' : 'text-rust'}>●</span>
              )}
              {pretty}
            </button>
          );
        })}
      </div>

      {active && ranges[active] && (
        <SliderPopout
          featureKey={active}
          range={ranges[active]}
          baseValue={baseValues[active] ?? ranges[active].min}
          override={overrides[active]}
          onChange={(v) => onChange(active, v)}
          onClose={() => setActive(null)}
        />
      )}
    </div>
  );
}

function SliderPopout({
  featureKey,
  range,
  baseValue,
  override,
  onChange,
  onClose,
}: {
  featureKey: string;
  range: { min: number; max: number };
  baseValue: number;
  override: number | undefined;
  onChange: (v: number | undefined) => void;
  onClose: () => void;
}) {
  const live = override ?? baseValue;
  const isOverridden = override !== undefined;
  const decimals = featureKey.startsWith('log') || featureKey.includes('intensity') ? 3 : 1;
  const step = Math.max((range.max - range.min) / 200, 0.0001);
  const pretty = PRETTY_FEATURE[featureKey] ?? featureKey;
  const unit = FEATURE_UNIT[featureKey] ?? '';
  const pct = ((live - range.min) / (range.max - range.min)) * 100;

  return (
    <div className="mt-3 border border-ink bg-paper p-3">
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[10px] uppercase tracking-eyebrow text-ink">
          {pretty}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close slider"
          className="font-mono text-[10px] text-muted hover:text-ink"
        >
          close <span aria-hidden="true">✕</span>
        </button>
      </div>

      <div className="mt-2 flex items-baseline gap-2">
        <span
          className={[
            'display tab-num text-[28px]',
            isOverridden ? 'text-rust' : 'text-ink',
          ].join(' ')}
        >
          {live.toFixed(decimals)}
        </span>
        <span className="font-mono text-[10px] text-muted">{unit}</span>
        <span className="ml-auto font-mono text-[9px] tab-num text-muted">
          baseline {baseValue.toFixed(decimals)}
        </span>
      </div>

      <input
        type="range"
        min={range.min}
        max={range.max}
        step={step}
        value={live}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={`${pretty} override`}
        aria-valuetext={`${live.toFixed(decimals)} ${unit}`}
        className="rule-slider mt-3"
      />

      <div className="mt-1 flex items-center justify-between font-mono text-[9px] tab-num text-muted">
        <span>{range.min.toFixed(decimals)}</span>
        <span aria-hidden="true">{pct.toFixed(0)}%</span>
        <span>{range.max.toFixed(decimals)}</span>
      </div>

      {isOverridden && (
        <button
          type="button"
          onClick={() => {
            onChange(undefined);
            onClose();
          }}
          className="mt-3 w-full border border-rule px-2 py-1 font-mono text-[10px] uppercase tracking-eyebrow text-sea hover:bg-sea/5"
        >
          <span aria-hidden="true">↺</span> reset to baseline
        </button>
      )}
    </div>
  );
}
