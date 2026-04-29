import { NavLink } from 'react-router-dom';

const tabs: { to: string; label: string; glyph: string }[] = [
  { to: '/',         label: 'Story',  glyph: '◧' },
  { to: '/model',    label: 'Model',  glyph: '∑' },
  { to: '/hotspots', label: 'Spots',  glyph: '◉' },
  { to: '/stress',   label: 'Stress', glyph: '⚡' },
  { to: '/cedent',   label: 'Cedent', glyph: '☰' },
];

export function BottomNav() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-app border-t border-black/5 bg-paper/95 backdrop-blur"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0)' }}
    >
      <ul className="grid grid-cols-5">
        {tabs.map((t) => (
          <li key={t.to}>
            <NavLink
              to={t.to}
              end={t.to === '/'}
              className={({ isActive }) =>
                [
                  'flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium',
                  isActive ? 'text-ink' : 'text-muted',
                ].join(' ')
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={[
                      'grid h-7 w-7 place-items-center rounded-full text-base leading-none',
                      isActive ? 'bg-ink text-paper' : 'bg-transparent',
                    ].join(' ')}
                  >
                    {t.glyph}
                  </span>
                  <span>{t.label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
