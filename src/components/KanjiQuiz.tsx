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
  const scope = scopeOf(lessons);
  // The stepper edits whatever simple range is showing; from a custom pick it restarts
  // as "up to" the highest selected lesson.
  const focus = scope.kind === 'custom' ? Math.max(1, ...lessons) : scope.n;
  const setScope = (kind: 'upTo' | 'only', n: number) =>
    set({ lessons: kind === 'only' ? [n] : LESSON_NUMS.filter((x) => x <= n) });
  const scopeKind = scope.kind === 'custom' ? 'upTo' : scope.kind;
  const step = (d: number) => setScope(scopeKind, Math.min(LESSON_COUNT, Math.max(1, focus + d)));
  const modeSummary = MODES.filter((m) => modes.includes(m.id)).map((m) => m.label).join(' · ');

  return (
    <section className="card border border-base-300 bg-base-100 shadow-xl">
      <div className="card-body gap-0 p-4 sm:p-6">
        <span className="text-xs font-bold uppercase tracking-widest text-accent">
          Kanji · Basic Kanji Book 1
        </span>

        <div role="tablist" className="tabs tabs-box mt-3 w-full">
          {(['upTo', 'only'] as const).map((k) => (
            <button
              key={k}
              role="tab"
              className={`tab flex-1 ${scope.kind === k ? 'tab-active' : ''}`}
              aria-selected={scope.kind === k}
              onClick={() => setScope(k, focus)}
            >
              {k === 'upTo' ? 'Hasta la lección' : 'Sólo la lección'}
            </button>
          ))}
        </div>

        <div className="mt-3 flex items-center gap-3">
          <button
            className="btn btn-square btn-outline btn-lg"
            aria-label="Lección anterior"
            disabled={scope.kind !== 'custom' && focus <= 1}
            onClick={() => step(-1)}
          >
            −
          </button>
          <div className="min-w-0 flex-1 text-center">
            {scope.kind === 'custom' ? (
              <div className="font-bold">
                {lessons.length ? `${lessons.length} lecciones elegidas` : 'Ninguna lección'}
                <div className="text-xs font-normal opacity-60">en opciones avanzadas</div>
              </div>
            ) : (
              <>
                <div className="text-3xl font-extrabold tabular-nums">
                  {scope.kind === 'upTo' && <span className="opacity-50">1–</span>}
                  {focus}
                </div>
                <div className="jp truncate text-sm opacity-70">
                  {kanjiOfLesson(focus).map((k) => k.char).join('')}
                </div>
              </>
            )}
          </div>
          <button
            className="btn btn-square btn-outline btn-lg"
            aria-label="Lección siguiente"
            disabled={scope.kind !== 'custom' && focus >= LESSON_COUNT}
            onClick={() => step(1)}
          >
            +
          </button>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <span className="text-sm font-semibold opacity-70">Preguntas</span>
          <div className="join flex-1">
            {(['15', '30', 'all'] as const).map((l) => (
              <button
                key={l}
                className={`btn join-item flex-1 ${len === l ? 'btn-accent' : 'btn-outline'}`}
                aria-pressed={len === l}
                onClick={() => set({ len: l })}
              >
                {l === 'all' ? 'Todas' : l}
              </button>
            ))}
          </div>
        </div>

        <button
          className="btn btn-primary btn-lg mt-4 w-full"
          disabled={tasks.length === 0}
          onClick={start}
        >
          Empezar →
        </button>
        <p className="mt-2 text-center text-xs opacity-60">
          {tasks.length
            ? `${target} de ${tasks.length} preguntas · ${kanji.length} kanji · ${words.length} palabras`
            : 'Elegí al menos una lección'}
        </p>

        <details className="collapse collapse-arrow mt-4 border border-base-300 bg-base-200/50">
          <summary className="collapse-title min-h-0 py-3 text-sm font-semibold">
            Opciones avanzadas
            <div className="text-xs font-normal opacity-60">{modeSummary}</div>
          </summary>
          <div className="collapse-content text-sm">
            <p className="opacity-70">
              Cada palabra entra en la lección de su kanji más nuevo, así que sólo ves palabras
              que ya podés leer.
            </p>

            <div className="mt-4 flex items-center justify-between gap-2">
              <div className="text-xs font-bold uppercase tracking-wider opacity-70">
                Lecciones sueltas
              </div>
              <div className="flex gap-1">
                <button className="btn btn-ghost btn-xs" onClick={() => set({ lessons: LESSON_NUMS })}>
                  Todas
                </button>
                <button className="btn btn-ghost btn-xs" onClick={() => set({ lessons: [] })}>
                  Ninguna
                </button>
              </div>
            </div>
            <div className="mt-1 grid grid-cols-4 gap-2 sm:grid-cols-6">
              {LESSON_NUMS.map((n) => (
                <button
                  key={n}
                  className={`btn btn-sm btn-outline ${lessons.includes(n) ? 'btn-primary' : 'opacity-60'}`}
                  aria-pressed={lessons.includes(n)}
                  aria-label={`Lección ${n}: ${kanjiOfLesson(n).map((k) => k.char).join('')}`}
                  onClick={() => set({ lessons: toggle(lessons, n, false) })}
                >
                  {n}
                </button>
              ))}
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
          </div>
        </details>
      </div>
    </section>
  );
}

// How the lesson selection reads in the simple picker: 1..N, a single lesson, or
// anything else picked by hand in the advanced grid.
type Scope = { kind: 'upTo' | 'only'; n: number } | { kind: 'custom' };
function scopeOf(lessons: number[]): Scope {
  const sorted = [...lessons].sort((a, b) => a - b);
  if (sorted.length === 1 && sorted[0] !== 1) return { kind: 'only', n: sorted[0] };
  if (sorted.length && sorted.every((n, i) => n === i + 1)) return { kind: 'upTo', n: sorted.length };
  return { kind: 'custom' };
}
