import { useEffect, useState } from 'react';
import { getMeta } from '../lib/pipeline';

export function DataFreshnessPill() {
  const [asOf, setAsOf] = useState<string | null>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getMeta().then((m) => {
      if (cancelled) return;
      if (m.data_as_of) {
        setLive(true);
        setAsOf(m.data_as_of.slice(0, 10));
      } else {
        setLive(false);
        setAsOf(`${m.last_actual_year}`);
      }
    });
    return () => { cancelled = true; };
  }, []);

  if (!asOf) return null;

  return (
    <div
      className="text-right"
      title={live ? 'Climate TRACE live snapshot' : 'WDI bundled vintage'}
    >
      <p className="font-mono text-[10px] uppercase tracking-eyebrow text-muted">
        {live ? 'Live · Climate TRACE' : 'Vintage · WDI'}
      </p>
      <p className="font-mono text-[11px] tab-num text-ink">
        {live ? <span className="text-sea">●</span> : <span className="text-muted">○</span>}{' '}
        {asOf}
      </p>
    </div>
  );
}
