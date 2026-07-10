import { useEffect, useState } from 'react';
import Quiz from './Quiz';
import Conjugation from './Conjugation';
import Reference from './Reference';

type Tab = 'quiz' | 'conj' | 'ref';

const TABS: { id: Tab; label: string }[] = [
  { id: 'quiz', label: 'Repaso' },
  { id: 'conj', label: 'Conjugación' },
  { id: 'ref', label: 'Referencia' },
];

// Temas nativos de daisyUI 5
const THEMES = [
  'dark', 'light', 'synthwave', 'dracula', 'night', 'dim', 'sunset', 'abyss',
  'coffee', 'business', 'luxury', 'black', 'halloween', 'forest', 'aqua',
  'cyberpunk', 'retro', 'valentine', 'cupcake', 'bumblebee', 'emerald',
  'corporate', 'garden', 'lofi', 'pastel', 'fantasy', 'wireframe', 'cmyk',
  'autumn', 'acid', 'lemonade', 'winter', 'nord', 'caramellatte', 'silk',
];
const DEFAULT_THEME = 'dark';

export default function App() {
  const [tab, setTab] = useState<Tab>('quiz');
  const [theme, setTheme] = useState(DEFAULT_THEME);

  useEffect(() => {
    setTheme(localStorage.getItem('nihongo-theme') || DEFAULT_THEME);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('nihongo-theme', theme);
  }, [theme]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 pb-16 pt-6 sm:pt-10">
      <header className="relative flex flex-col items-center gap-1.5 text-center">
        <div className="dropdown dropdown-end absolute right-0 top-0">
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
                  className={`justify-between capitalize ${t === theme ? 'active' : ''}`}
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
        <div
          aria-hidden
          className="mb-1 grid size-12 place-items-center rounded-full"
          style={{
            background:
              'radial-gradient(circle at 50% 42%, var(--color-primary), var(--color-primary) 62%, transparent 63%)',
          }}
        />
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          日本語 <span className="text-primary">クイズ</span>
        </h1>
        <p className="max-w-prose text-sm opacity-70">
          Cap 14–17 · Nankai — repaso, conjugación y referencia de verbos
        </p>
      </header>

      <div role="tablist" className="tabs tabs-box justify-center bg-base-200">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            className={`tab font-bold ${tab === t.id ? 'tab-active text-primary' : ''}`}
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div hidden={tab !== 'quiz'}>{tab === 'quiz' && <Quiz />}</div>
      <div hidden={tab !== 'conj'}>{tab === 'conj' && <Conjugation />}</div>
      <div hidden={tab !== 'ref'}>{tab === 'ref' && <Reference />}</div>

      <footer className="mt-1 text-center text-xs opacity-50">
        頑張って！ · Hecho para tu examen
      </footer>
    </div>
  );
}
