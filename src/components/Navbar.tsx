import { useEffect, useState } from 'react';

type Section = 'repaso' | 'conj' | 'ref';

const NAV: { id: Section; label: string; path: string }[] = [
  { id: 'repaso', label: 'Repaso', path: '' },
  { id: 'conj', label: 'Conjugación', path: 'conjugacion' },
  { id: 'ref', label: 'Referencia', path: 'referencia' },
];

const THEMES = [
  'nerv',
  'dark', 'light', 'synthwave', 'dracula', 'night', 'dim', 'sunset', 'abyss',
  'coffee', 'business', 'luxury', 'black', 'halloween', 'forest', 'aqua',
  'cyberpunk', 'retro', 'valentine', 'cupcake', 'bumblebee', 'emerald',
  'corporate', 'garden', 'lofi', 'pastel', 'fantasy', 'wireframe', 'cmyk',
  'autumn', 'acid', 'lemonade', 'winter', 'nord', 'caramellatte', 'silk',
];
const DEFAULT_THEME = 'dark';

export default function Navbar({ current, base }: { current: Section; base: string }) {
  const root = base.replace(/\/$/, '');
  const href = (path: string) => (path ? `${root}/${path}` : `${root}/`);

  const [theme, setTheme] = useState(DEFAULT_THEME);
  const [furigana, setFurigana] = useState(true);
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    setTheme(localStorage.getItem('nihongo-theme') || DEFAULT_THEME);
    setFurigana(localStorage.getItem('nihongo-furigana') !== '0');
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('nihongo-theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.classList.toggle('no-furi', !furigana);
    localStorage.setItem('nihongo-furigana', furigana ? '1' : '0');
  }, [furigana]);

  // Si hay un quiz en curso, confirmar antes de abandonar la página.
  function onNav(e: React.MouseEvent, to: string) {
    if (window.__nihongoQuizActive) {
      e.preventDefault();
      setPending(to);
    }
  }

  const linkClass = (id: Section) =>
    `font-semibold ${current === id ? 'menu-active text-primary' : ''}`;
  const links = NAV.map((n) => (
    <li key={n.id}>
      <a
        href={href(n.path)}
        onClick={(e) => onNav(e, href(n.path))}
        className={linkClass(n.id)}
        aria-current={current === n.id ? 'page' : undefined}
      >
        {n.label}
      </a>
    </li>
  ));

  return (
    <header className="rounded-box border border-base-300 bg-base-200">
      <div className="navbar min-h-0 gap-1 p-2 sm:px-3">
        <div className="navbar-start gap-1">
          {/* hamburguesa — sólo en pantallas chicas */}
          <div className="dropdown md:hidden">
            <div tabIndex={0} role="button" className="btn btn-ghost btn-sm btn-square">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="size-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </div>
            <ul
              tabIndex={-1}
              className="menu dropdown-content z-10 mt-2 w-48 gap-1 rounded-box border border-base-300 bg-base-200 p-2 shadow-xl"
            >
              {links}
            </ul>
          </div>

          <a
            href={href('')}
            onClick={(e) => onNav(e, href(''))}
            className="flex items-center gap-2 px-1"
          >
            <span
              aria-hidden
              className="size-6 shrink-0 rounded-full"
              style={{
                background:
                  'radial-gradient(circle at 50% 42%, var(--color-primary), var(--color-primary) 62%, transparent 63%)',
              }}
            />
            <span className="eva-titlecard text-lg font-extrabold tracking-tight">
              日本語 <span className="text-primary">クイズ</span>
            </span>
          </a>
        </div>

        {/* menú horizontal — sólo en pantallas grandes */}
        <div className="navbar-center hidden md:flex">
          <ul className="menu menu-horizontal gap-1 p-0">{links}</ul>
        </div>

        <div className="navbar-end gap-1 sm:gap-2">
          <label
            className="flex cursor-pointer items-center gap-1.5"
            title="Furigana (lecturas sobre el kanji)"
          >
            <span className="jp text-sm font-semibold opacity-70">振</span>
            <input
              type="checkbox"
              className="toggle toggle-primary toggle-sm"
              checked={furigana}
              onChange={(e) => setFurigana(e.target.checked)}
            />
          </label>

          <div className="dropdown dropdown-end">
            <div tabIndex={0} role="button" className="btn btn-sm btn-ghost gap-1">
              🎨 <span className="hidden capitalize sm:inline">{theme}</span>
            </div>
            <ul
              tabIndex={0}
              className="menu dropdown-content z-10 mt-1 max-h-80 w-44 flex-nowrap overflow-y-auto rounded-box border border-base-300 bg-base-200 p-2 shadow-xl"
            >
              {THEMES.map((t) => (
                <li key={t}>
                  <button
                    className={`justify-between capitalize ${t === theme ? 'menu-active' : ''}`}
                    onClick={() => {
                      setTheme(t);
                      (document.activeElement as HTMLElement)?.blur();
                    }}
                  >
                    {t}
                    <span
                      data-theme={t}
                      className="flex gap-0.5 rounded bg-base-100 p-1"
                      aria-hidden
                    >
                      <span className="size-2 rounded-full bg-primary" />
                      <span className="size-2 rounded-full bg-secondary" />
                      <span className="size-2 rounded-full bg-accent" />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {pending && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="text-lg font-bold">¿Salir del quiz?</h3>
            <p className="py-3 opacity-80">Vas a perder el progreso de este repaso.</p>
            <div className="modal-action">
              <button className="btn btn-ghost" onClick={() => setPending(null)}>
                Seguir en el quiz
              </button>
              <button
                className="btn btn-error"
                onClick={() => {
                  window.__nihongoQuizActive = false;
                  window.location.href = pending;
                }}
              >
                Salir
              </button>
            </div>
          </div>
          <button className="modal-backdrop" aria-label="Cerrar" onClick={() => setPending(null)} />
        </div>
      )}
    </header>
  );
}
