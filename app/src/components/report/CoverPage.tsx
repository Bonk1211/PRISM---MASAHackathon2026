import { Hairline } from '../Card';

export function CoverPage({
  reportId,
  date,
  client,
}: {
  reportId: string;
  date: string;
  client: string;
}) {
  return (
    <section className="report-cover relative flex flex-col justify-between border border-rule bg-paper px-6 py-10 print:break-after-page print:min-h-[calc(100vh-2rem)] lg:px-12 lg:py-14 min-h-[80vh]">
      {/* Top corner — folio + classification */}
      <header className="flex items-start justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-eyebrow text-muted">
            Climate Risk Assessment
          </p>
          <p className="mt-1 font-mono text-[10px] tab-num text-muted">
            Report ID · {reportId}
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono text-[10px] uppercase tracking-eyebrow text-rust">
            Confidential
          </p>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-eyebrow text-muted">
            Internal Use Only
          </p>
        </div>
      </header>

      {/* Centre — title block */}
      <div className="my-12 lg:my-20">
        <Hairline strong />
        <h1 className="display mt-6 text-[40px] leading-[0.95] text-ink lg:text-[68px] print:text-[24pt]">
          South-East Asia
          <br />
          <span className="italic">Climate-Risk</span>
          <br />
          Underwriting Review
          <span className="text-muted"> · 2026</span>
        </h1>
        <Hairline className="mt-6" strong />
        <p className="mt-6 font-serif italic text-[16px] leading-snug text-ink lg:text-[20px] print:text-[12pt]">
          Prepared for {client}
        </p>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-eyebrow text-muted">
          Strategic Partner Engagement · Hannover Re APAC
        </p>
      </div>

      {/* Footer block — date + folio mark */}
      <footer className="border-t border-rule pt-4">
        <div className="grid grid-cols-2 gap-4 text-[11px]">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-eyebrow text-muted">
              Date of Issue
            </p>
            <p className="mt-1 font-serif text-ink">{date}</p>
          </div>
          <div className="text-right">
            <p className="font-mono text-[10px] uppercase tracking-eyebrow text-muted">
              Folio
            </p>
            <p className="mt-1 font-mono tab-num text-ink">RI / 2026 / 001</p>
          </div>
        </div>
        <p className="mt-6 text-center font-mono text-[9px] uppercase tracking-eyebrow text-muted">
          R-Ignite · MASA Hackathon 2026
        </p>
      </footer>
    </section>
  );
}
