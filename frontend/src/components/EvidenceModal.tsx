import type { EvidenceEntry } from '../data/evidence';
import { POLICY_BY_ID } from '../data/policy';
import { useFocusTrap } from '../lib/useFocusTrap';

export function EvidenceModal({
  entry,
  onClose,
}: {
  entry: EvidenceEntry | null;
  onClose: () => void;
}) {
  const dialogRef = useFocusTrap<HTMLDivElement>(!!entry, onClose);
  if (!entry) return null;
  const policy = entry.policyId ? POLICY_BY_ID[entry.policyId] : undefined;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="evidence-modal-title"
      className="fixed inset-0 z-50 flex items-end justify-center"
    >
      <div
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0 cursor-pointer bg-ink/45 backdrop-blur-[2px]"
      />
      <article
        className="relative mx-auto w-full max-w-app rounded-t-[18px] border-t border-rule bg-paper px-5 pb-8 pt-5 shadow-plate"
        style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0))' }}
      >
        <div aria-hidden="true" className="mx-auto mb-3 h-1 w-10 rounded-full bg-ink/15" />

        <div className="flex items-baseline justify-between">
          <p className="eyebrow text-muted">Source · trace-back</p>
          <button
            onClick={onClose}
            className="font-mono text-[11px] uppercase tracking-eyebrow text-muted hover:text-ink"
            aria-label="Close source dialog"
          >
            Close <span aria-hidden="true">✕</span>
          </button>
        </div>

        <h2 id="evidence-modal-title" className="display mt-2 text-[34px] leading-[0.95] text-ink">
          <span className="italic">{entry.value}</span>
        </h2>
        <p className="mt-1 text-[12px] uppercase tracking-eyebrow text-muted">{entry.label}</p>

        <div className="mt-4 border-t border-rule pt-4">
          <p className="eyebrow text-muted">Quoted source</p>
          <p className="mt-1 font-serif italic text-[15px] leading-relaxed text-ink">
            “{entry.paragraph}”
          </p>
        </div>

        <dl className="mt-4 space-y-2 border-t border-rule pt-4 text-[12px]">
          <Row label="File" value={entry.source} mono />
          {entry.reportSection && <Row label="Report §" value={entry.reportSection} mono />}
          {policy && (
            <Row
              label="Policy anchor"
              value={`${policy.short} — ${policy.full}`}
            />
          )}
          <Row label="Category" value={entry.category} />
        </dl>
      </article>
    </div>
  );
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="grid grid-cols-[100px_1fr] gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className={`text-ink ${mono ? 'font-mono text-[11px]' : ''}`}>{value}</dd>
    </div>
  );
}
