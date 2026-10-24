import { useEffect, useMemo, useState } from 'react';
import type { Exercise, WordKind } from '../lib/types';
import {
  KANJI,
  KIND_ORDER,
  LESSON_COUNT,
  WORDS,
  WORD_MODES,
  buildExercise,
  kanjiOfLesson,
  type KanjiMode,
  type Task,
} from '../lib/kanji';
import QuizRunner, { shuffleArr } from './QuizRunner';
import { Chip, Label } from './Chip';

const LESSON_NUMS = Array.from({ length: LESSON_COUNT }, (_, i) => i + 1);

const MODES: { id: KanjiMode; label: string; hint: string }[] = [
  { id: 'reading', label: 'Lectura', hint: '新聞 → しんぶん' },
  { id: 'meaning', label: 'Significado', hint: '新聞 → diario' },
  { id: 'writing', label: 'Escritura', hint: 'しんぶん → 新聞' },
  { id: 'kanji', label: 'Kanji suelto', hint: '新 → nuevo' },
];

const KIND_LABEL: Record<WordKind, string> = {
  noun: 'Sustantivos',
  verb: 'Verbos',
  adj_i: 'Adjetivos い',
  adj_na: 'Adjetivos な',
  other: 'Otros',
};

type Len = '15' | '30' | 'all';
type Setup = { lessons: number[]; modes: KanjiMode[]; kinds: WordKind[]; len: Len };
const DEFAULT: Setup = {
  lessons: LESSON_NUMS.filter((n) => n <= 16),
  modes: ['reading', 'meaning', 'writing'],
  kinds: KIND_ORDER,
  len: '15',
};
const STORE_KEY = 'nihongo-kanji-setup';

function loadSetup(): Setup {
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY) ?? 'null');
    return s ? { ...DEFAULT, ...s } : DEFAULT;
  } catch {
    return DEFAULT;
  }
}

function toggle<T>(list: T[], x: T, keepOne = true): T[] {
  if (list.includes(x)) return keepOne && list.length === 1 ? list : list.filter((y) => y !== x);
  return [...list, x];
}

export default function KanjiQuiz() {
  const [setup, setSetup] = useState<Setup>(loadSetup);
  const [run, setRun] = useState<Exercise[] | null>(null);
  const { lessons, modes, kinds, len } = setup;
  const set = (patch: Partial<Setup>) => setSetup((s) => ({ ...s, ...patch }));

  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(setup));
    } catch {}
  }, [setup]);

  const words = useMemo(
    () => WORDS.filter((w) => lessons.includes(w.lesson) && kinds.includes(w.kind)),
    [lessons, kinds],
  );
  const kanji = useMemo(() => KANJI.filter((k) => lessons.includes(k.lesson)), [lessons]);

  // Every (mode, word|kanji) pair is a possible question; exercises are only built at
  // start, so each run gets fresh distractors.
  const tasks = useMemo<Task[]>(() => {
    const out: Task[] = [];
    for (const m of modes) {
      if (m === 'kanji') out.push(...kanji.map((k) => ({ mode: m, id: k.id })));
      else out.push(...words.map((w) => ({ mode: m, id: w.id })));
    }
    return out;
  }, [modes, words, kanji]);
  const target = len === 'all' ? tasks.length : Math.min(+len, tasks.length);

  function start() {
    setRun(shuffleArr(tasks).slice(0, target).map((t) => buildExercise(t, words, kanji)));
  }

  if (run) return <QuizRunner initial={run} shuffle onExit={() => setRun(null)} />;

  const usesWords = modes.some((m) => WORD_MODES.includes(m));
  return (
    <section className="card border border-base-300 bg-base-100 shadow-xl">
      <div className="card-body p-4 sm:p-6">
        <span className="text-xs font-bold uppercase tracking-widest text-accent">
          Kanji · Basic Kanji Book 1
        </span>
        <p className="mt-1 text-sm opacity-70">
          Elegí lecciones y modos; todo se mezcla en un mismo repaso. Cada palabra entra en la
          lección de su kanji más nuevo, así que sólo ves palabras que ya podés leer.
        </p>

        <div className="mt-4 flex items-center justify-between gap-2">
          <div className="text-xs font-bold uppercase tracking-wider opacity-70">Lecciones</div>
          <div className="flex gap-1">
            <button className="btn btn-ghost btn-xs" onClick={() => set({ lessons: LESSON_NUMS })}>
              Todas
            </button>
            <button className="btn btn-ghost btn-xs" onClick={() => set({ lessons: [] })}>
              Ninguna
            </button>
          </div>
        </div>
        {/* Phones: compact number + first kanji, so the whole setup fits in ~one screen.
            From sm up there's room for the full kanji list. */}
        <div className="mt-1 grid grid-cols-4 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {LESSON_NUMS.map((n) => {
            const chars = kanjiOfLesson(n).map((k) => k.char).join('');
            return (
              <button
                key={n}
                className={`btn btn-sm btn-outline h-auto flex-col items-center gap-0.5 px-1 py-2 sm:items-start sm:px-3 sm:text-left ${
                  lessons.includes(n) ? 'btn-primary' : 'opacity-60'
                }`}
                aria-pressed={lessons.includes(n)}
                aria-label={`Lección ${n}: ${chars}`}
                onClick={() => set({ lessons: toggle(lessons, n, false) })}
              >
                <span className="text-base sm:text-sm">
                  <span className="sm:hidden">{n}</span>
                  <span className="hidden sm:inline">Lección {n}</span>
                </span>
                <span className="jp text-sm font-normal tracking-wide">
                  <span className="sm:hidden">{chars.slice(0, 2)}…</span>
                  <span className="hidden sm:inline">{chars}</span>
                </span>
              </button>
            );
          })}
        </div>

        <Label>Modos</Label>
        <div className="flex flex-wrap gap-2">
          {MODES.map((m) => (
            <Chip key={m.id} active={modes.includes(m.id)} onClick={() => set({ modes: toggle(modes, m.id) })}>
              <span>{m.label}</span>
              <span className="jp text-xs font-normal opacity-70">{m.hint}</span>
            </Chip>
          ))}
        </div>

        {usesWords && (
          <>
            <Label>Palabras</Label>
            <div className="flex flex-wrap gap-2">
              {KIND_ORDER.map((k) => (
                <Chip
                  key={k}
                  color="secondary"
                  active={kinds.includes(k)}
                  onClick={() => set({ kinds: toggle(kinds, k) })}
                >
                  {KIND_LABEL[k]}
                </Chip>
              ))}
            </div>
          </>
        )}

        <Label>Cantidad</Label>
        <div className="flex flex-wrap gap-2">
          {(['15', '30', 'all'] as const).map((l) => (
            <Chip key={l} color="accent" active={len === l} onClick={() => set({ len: l })}>
              {l === 'all' ? 'Todas' : `${l} preguntas`}
            </Chip>
          ))}
        </div>

        {/* Pinned to the bottom on phones so you can start without scrolling. */}
        <div className="sticky bottom-0 z-10 -mx-4 mt-5 flex flex-wrap items-center gap-3 border-t border-base-300 bg-base-100/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
          <button className="btn btn-primary" disabled={tasks.length === 0} onClick={start}>
            Empezar →
          </button>
          <span className="text-xs opacity-60">
            {tasks.length
              ? `${target} de ${tasks.length} disponibles · ${kanji.length} kanji · ${words.length} palabras`
              : 'Elegí al menos una lección'}
          </span>
        </div>
      </div>
    </section>
  );
}
