import { Card } from '../components/Card';
import { RECOMMENDATIONS } from '../data/keyNumbers';

export function Actions() {
  return (
    <div className="space-y-3">
      <Card tone="ink">
        <p className="text-[11px] uppercase tracking-widest text-paper/60">Question 5 — what to do</p>
        <h1 className="mt-1 text-lg font-bold leading-tight">Four actions, one underwriting cycle.</h1>
        <p className="mt-2 text-sm opacity-90">
          Each maps to one of the answers from the analytical journey: product, screen, capital instrument, capital buffer.
        </p>
      </Card>

      {RECOMMENDATIONS.map((r) => (
        <Card key={r.id}>
          <div className="flex items-start gap-3">
            <span className="text-2xl leading-none">{r.icon}</span>
            <div className="flex-1">
              <h2 className="text-sm font-semibold">{r.title}</h2>
              <p className="mt-1 text-sm text-ink/80">{r.detail}</p>
              <p className="mt-2 inline-block rounded-full bg-sand px-2 py-0.5 text-[11px] font-semibold text-ink">
                {r.target}
              </p>
            </div>
          </div>
        </Card>
      ))}

      <Card title="Numbers traceability" tone="sand">
        <p className="text-sm">
          Every figure quoted in this app is also in <code>exhibits/results/key_numbers.json</code> or
          <code> data/external/external_features_sea.csv</code>, and the prose mirrors
          <code> deliverables/01_report.md</code>. Update once, propagate everywhere.
        </p>
      </Card>
    </div>
  );
}
