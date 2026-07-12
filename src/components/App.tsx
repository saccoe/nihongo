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

// Tema custom «nerv» (NERV) + temas nativos de daisyUI 5
const THEMES = [
  'nerv',
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
  const [furigana, setFurigana] = useState(true);

  useEffect(() => {
    setTheme(localStorage.getItem('nihongo-theme') || DEFAULT_THEME);
    setFurigana(localStorage.getItem('nihongo-furigana') !== '0');
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('nihongo-theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('nihongo-furigana', furigana ? '1' : '0');
  }, [furigana]);

  return (
    <div
      className={`mx-auto flex w-full max-w-3xl flex-col gap-3 px-2 pb-12 pt-3 sm:gap-5 sm:px-4 sm:pb-16 sm:pt-4 ${
        furigana ? '' : 'no-furi'
      }`}
    >
      <nav className="flex flex-wrap items-center justify-between gap-2 rounded-box border border-base-300 bg-base-200 px-3 py-2 sm:gap-3 sm:px-4 sm:py-2.5">
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="size-6 rounded-full"
            style={{
              background:
                'radial-gradient(circle at 50% 42%, var(--color-primary), var(--color-primary) 62%, transparent 63%)',
            }}
          />
          <span className="eva-titlecard text-lg font-extrabold tracking-tight">
            日本語 <span className="text-primary">クイズ</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
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
          <div role="tablist" className="tabs tabs-box tabs-sm bg-base-100">
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
                    className={`justify-between capitalize ${t === theme ? 'active' : ''}`}
                    onClick={() => {
                      setTheme(t);
                      (document.activeElement as HTMLElement)?.blur();
                    }}
                  >
                    {t}
                    <span data-theme={t} className="flex gap-0.5 rounded bg-base-100 p-1" aria-hidden>
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
      </nav>

      <div hidden={tab !== 'quiz'}>{tab === 'quiz' && <Quiz />}</div>
      <div hidden={tab !== 'conj'}>{tab === 'conj' && <Conjugation />}</div>
      <div hidden={tab !== 'ref'}>{tab === 'ref' && <Reference />}</div>

      <footer className="mt-1 text-center text-xs opacity-50">
        頑張って！ · Hecho para tu examen
      </footer>
    </div>
  );
}
