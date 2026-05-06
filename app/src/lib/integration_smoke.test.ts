// Integration smoke test for the Phase-shell wiring.
//
// Purpose: catch a JSON-import regression at TypeScript compile time. If the
// notebook stops emitting phase_2_taxonomy / phase_3_indicator_map /
// phase_4_panel_quality, the typed casts in `data/keyNumbers.ts` still pass
// (TS coerces unknown JSON to `any`), so we need a runtime check that the
// values are actually populated after `npm run sync-data`.
//
// Vitest is not configured in this repo (`package.json` has no `test` script).
// To stay zero-dep, this file exposes runnable assertion helpers that:
//   1. Type-check on every `npm run build` (tsc -b includes src/**.test.ts).
//   2. Run as plain functions if invoked manually (`tsx integration_smoke.test.ts`).
//   3. Are picked up automatically if Vitest is added later — the
//      `import.meta.vitest` block at the bottom registers a Vitest suite then.

import {
  PHASE_2_TAXONOMY,
  PHASE_3_INDICATOR_MAP,
  PHASE_4_PANEL_QUALITY,
} from '../data/keyNumbers';
import { getScopingSnapshot, PROFILE_KEY } from './scoping';

type Check = { name: string; ok: boolean; detail?: string };

function check(name: string, cond: boolean, detail?: string): Check {
  return { name, ok: cond, detail };
}

export function runIntegrationSmoke(): Check[] {
  const checks: Check[] = [];

  // 1) Phase-shell typed exports come through after sync-data.
  checks.push(
    check(
      'PHASE_2_TAXONOMY truthy with all three buckets',
      !!PHASE_2_TAXONOMY &&
        !!PHASE_2_TAXONOMY.physical &&
        !!PHASE_2_TAXONOMY.transition &&
        !!PHASE_2_TAXONOMY.liability,
    ),
  );

  const indicatorKeys = Object.keys(PHASE_3_INDICATOR_MAP ?? {});
  checks.push(
    check(
      'PHASE_3_INDICATOR_MAP non-empty',
      indicatorKeys.length > 0,
      `keys=${indicatorKeys.length}`,
    ),
  );

  checks.push(
    check(
      'PHASE_4_PANEL_QUALITY n_economies==10',
      PHASE_4_PANEL_QUALITY?.n_economies === 10,
      `got ${PHASE_4_PANEL_QUALITY?.n_economies}`,
    ),
  );
  checks.push(
    check(
      'PHASE_4_PANEL_QUALITY year_max==2024',
      PHASE_4_PANEL_QUALITY?.year_max === 2024,
      `got ${PHASE_4_PANEL_QUALITY?.year_max}`,
    ),
  );

  // 2) Scoping snapshot defaults to empty when localStorage clear (soft gate).
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(PROFILE_KEY);
    }
  } catch {
    /* SSR / Node — skip */
  }
  const snap = getScopingSnapshot();
  checks.push(
    check(
      'getScopingSnapshot returns default scope (complete!=true) when no localStorage',
      snap.complete !== true,
      `complete=${String(snap.complete)}`,
    ),
  );

  return checks;
}

// Vitest auto-pickup (no-op when Vitest isn't installed).
// `import.meta.vitest` is undefined under plain tsc/vite, so the block elides.
if ((import.meta as ImportMeta & { vitest?: unknown }).vitest !== undefined) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const v = (import.meta as any).vitest as {
    describe: (name: string, fn: () => void) => void;
    it: (name: string, fn: () => void) => void;
    expect: (actual: unknown) => { toBe: (expected: unknown) => void };
  };
  v.describe('integration smoke', () => {
    for (const c of runIntegrationSmoke()) {
      v.it(c.name + (c.detail ? ` (${c.detail})` : ''), () => {
        v.expect(c.ok).toBe(true);
      });
    }
  });
}
