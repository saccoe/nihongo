import { useEffect, useMemo, useRef, useState } from 'react';
import { db, exercisesOf, itemOf, lessonsInOrder } from '../lib/db';
import type { Exercise, Item } from '../lib/types';
import { normalize } from '../lib/conjugator';
import { renderRuby } from './Ruby';
import Choices from './Choices';
import ConjugationCard from './ConjugationCard';

declare global {
  interface Window {
    __nihongoQuizActive?: boolean;
  }
}

// Config for embedded conjugation questions. Could later come from exercise.params
// or a quiz-level setting; defaults keep mixed quizzes snappy.
const CONJ_MODE = 'rapido' as const;

// Filters = the lessons, in order. A chapter lesson bundles its grammar + vocab;
// the conjugación lesson holds the generated conjugate exercises.
const LESSONS = lessonsInOrder();

type Miss = { ex: Exercise; given: string; sol: string };
type Feedback = { ok: boolean; sol: string; exp: string } | null;
type Phase = 'setup' | 'quiz' | 'result';

function shuffleArr<T>(a: T[]): T[] {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}
const hasJP = (s: string) => /[぀-ゟ゠-ヿ一-鿿]/.test(s);

export default function Quiz() {
  const [phase, setPhase] = useState<Phase>('setup');
  const [selKeys, setSelKeys] = useState<Set<string>>(new Set(LESSONS.map((l) => l.id)));
  const [len, setLen] = useState<'15' | '30' | 'all'>('15');
  const [shuffle, setShuffle] = useState(true);

  const [queue, setQueue] = useState<Exercise[]>([]);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
  const [typed, setTyped] = useState('');
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [misses, setMisses] = useState<Miss[]>([]);

  // Union of the selected lessons' exercises, deduped by id.
  const pool = useMemo(() => {
    const seen = new Set<string>();
    const out: Exercise[] = [];
    for (const l of LESSONS) {
      if (!selKeys.has(l.id)) continue;
      for (const ex of exercisesOf(l)) {
        if (seen.has(ex.id)) continue;
        seen.add(ex.id);
        out.push(ex);
      }
    }
    return out;
  }, [selKeys]);
  const target = len === 'all' ? pool.length : Math.min(+len, pool.length);

  function toggleKey(key: string) {
    const next = new Set(selKeys);
    if (next.has(key)) {
      if (next.size === 1) return;
      next.delete(key);
    } else next.add(key);
    setSelKeys(next);
  }

  function start(list?: Exercise[]) {
    let q = list ?? pool;
    if (shuffle) q = shuffleArr(q);
    if (!list) q = q.slice(0, target);
    setQueue(q);
    setIdx(0);
    setScore(0);
    setMisses([]);
    resetQ();
    setPhase('quiz');
  }
  function resetQ() {
    setAnswered(false);
    setPicked(null);
    setTyped('');
    setFeedback(null);
  }

  const q = queue[idx];

  function answerMC(i: number) {
    if (answered || !q) return;
    setAnswered(true);
    setPicked(i);
    const ok = i === q.correct;
    if (ok) setScore((s) => s + 1);
    else setMisses((m) => [...m, { ex: q, given: q.options![i], sol: q.options![q.correct!] }]);
    setFeedback({ ok, sol: q.options![q.correct!], exp: q.exp ?? '' });
  }
  function checkType() {
    if (answered || !q) return;
    const val = normalize(typed);
    if (!val) return;
    setAnswered(true);
    const ok = q.answers!.map(normalize).includes(val);
    if (ok) setScore((s) => s + 1);
    else setMisses((m) => [...m, { ex: q, given: typed.trim() || '(vacío)', sol: q.answers![0] }]);
    setFeedback({ ok, sol: q.answers![0], exp: q.exp ?? '' });
  }
  function finishConjugate(pass: boolean) {
    if (answered || !q) return;
    setAnswered(true);
    if (pass) setScore((s) => s + 1);
    else setMisses((m) => [...m, { ex: q, given: '', sol: '' }]);
  }
  function next() {
    if (idx + 1 >= queue.length) setPhase('result');
    else {
      setIdx((i) => i + 1);
      resetQ();
    }
  }

  // Enter goes to the next question once the current one is answered.
  const enterRef = useRef({ active: false, next: () => {} });
  enterRef.current = { active: phase === 'quiz' && answered, next };
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Enter' || e.metaKey || e.ctrlKey || e.altKey) return;
      const s = enterRef.current;
      if (!s.active) return;
      e.preventDefault();
      s.next();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Signals the navbar that a quiz is in progress (to confirm before leaving).
  useEffect(() => {
    window.__nihongoQuizActive = phase === 'quiz';
    return () => {
      window.__nihongoQuizActive = false;
    };
  }, [phase]);

  /* ---------- SETUP ---------- */
  if (phase === 'setup') {
    return (
      <section className="card border border-base-300 bg-base-100 shadow-xl">
        <div className="card-body p-4 sm:p-6">
          <span className="text-xs font-bold uppercase tracking-widest text-accent">
            Configurá tu repaso
          </span>
          <p className="mt-1 text-sm opacity-70">
            Gramática, vocabulario y conjugación. Corrección al instante con explicación.
          </p>

          <Label>Qué practicar</Label>
          <div className="flex flex-wrap gap-2">
            {LESSONS.map((l) => (
              <Chip
                key={l.id}
                color={l.chapter ? 'primary' : 'accent'}
                active={selKeys.has(l.id)}
                onClick={() => toggleKey(l.id)}
              >
                {l.subtitle ?? l.title}
              </Chip>
            ))}
          </div>

          <Label>Cantidad</Label>
          <div className="flex flex-wrap gap-2">
            {(['15', '30', 'all'] as const).map((l) => (
              <Chip key={l} color="accent" active={len === l} onClick={() => setLen(l)}>
                {l === 'all' ? 'Todas' : `${l} preguntas`}
              </Chip>
            ))}
          </div>

          <label className="mt-4 flex cursor-pointer items-center gap-3 text-sm opacity-80">
            <input
              type="checkbox"
              className="toggle toggle-primary toggle-sm"
              checked={shuffle}
              onChange={(e) => setShuffle(e.target.checked)}
            />
            Mezclar el orden
          </label>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button className="btn btn-primary" disabled={pool.length === 0} onClick={() => start()}>
              Empezar →
            </button>
            <span className="text-xs opacity-60">
              {pool.length ? `${target} de ${pool.length} disponibles` : 'Elegí un tema'}
            </span>
          </div>
        </div>
      </section>
    );
  }

  /* ---------- RESULT ---------- */
  if (phase === 'result') {
    const total = queue.length;
    const pct = Math.round((score / total) * 100);
    const verdict =
      pct === 100
        ? '満点！Impecable. Andá tranquilo al examen 🌸'
        : pct >= 80
          ? '¡Muy bien! Repasá un par de detalles.'
          : pct >= 60
            ? 'Vas bien. Enfocá los errores de abajo.'
            : 'A repasar — mirá los errores y volvé a intentar.';
    return (
      <section className="card border border-base-300 bg-base-100 shadow-xl">
        <div className="card-body p-4 sm:p-6">
          <div className="text-center">
            <div className="text-6xl font-extrabold text-primary sm:text-7xl">{score}</div>
            <div className="font-semibold opacity-60">/ {total}</div>
            <p className="mt-2 text-lg font-bold text-balance">{verdict}</p>
          </div>

          {misses.length > 0 ? (
            <div className="mt-5 flex flex-col gap-2.5">
              <h3 className="text-xs font-bold uppercase tracking-widest text-accent">
                Para repasar ({misses.length})
              </h3>
              {misses.map((m, i) => (
                <MissRow key={i} miss={m} />
              ))}
            </div>
          ) : (
            <p className="mt-4 text-center text-lg font-bold text-success">Sin errores. 完璧！</p>
          )}

          <div className="mt-5 flex justify-center gap-3">
            {misses.length > 0 && (
              <button className="btn btn-primary" onClick={() => start(misses.map((m) => m.ex))}>
                Repasar los errores
              </button>
            )}
            <button className="btn btn-ghost" onClick={() => setPhase('setup')}>
              Volver al inicio
            </button>
          </div>
        </div>
      </section>
    );
  }

  /* ---------- QUIZ ---------- */
  if (!q) return null;
  const isConjugate = q.type === 'conjugate';
  const optJP = q.skill !== 'vocab' || hasJP(q.options?.[0] ?? '');
  // Visible length: drop the furigana reading ([漢字|よみ] → 漢字).
  const displayLen = (s: string) => s.replace(/\[([^|\]]+)\|[^\]]+\]/g, '$1').length;
  // Short Japanese options (particles, brief forms) → 2×2 grid; the rest → one per row.
  const mcLayout =
    optJP && (q.options?.every((o) => displayLen(o) <= 10) ?? false) ? 'grid' : 'stack';
  const isLast = idx + 1 >= queue.length;
  const conjItem = isConjugate ? itemOf(q) : undefined;
  return (
    <section className="card border border-base-300 bg-base-100 shadow-xl">
      <div className="card-body p-4 sm:p-6">
        {/* header: score · progress · exit */}
        <div className="flex items-center gap-3 text-sm font-semibold">
          <span className="badge badge-ghost shrink-0 tabular-nums opacity-70">
            {score} / {answered ? idx + 1 : idx}
          </span>
          <progress
            className="progress progress-primary min-w-0 flex-1"
            value={idx}
            max={queue.length}
          />
          <button className="btn btn-ghost btn-sm shrink-0" onClick={() => setPhase('setup')}>
            Salir
          </button>
        </div>

        {isConjugate && conjItem ? (
          /* ───── CONJUGATION: the compound card runs its own steps ───── */
          <div className="mt-3">
            <ConjugationCard key={q.id} item={conjItem} mode={CONJ_MODE} onComplete={finishConjugate} />
            <div className="mt-3 flex h-12 items-center justify-center">
              {answered && (
                <button className="btn btn-primary px-8" onClick={next}>
                  {isLast ? 'Ver resultado →' : 'Siguiente →'}
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* ───── QUESTION AREA (info card) ───── */}
            <div className="mt-3 rounded-box border border-base-300 bg-base-200/50 p-4 text-center">
              <div className="text-xs font-bold uppercase tracking-wider text-accent">
                {q.skill === 'vocab' ? 'Vocabulario' : 'Gramática'}
              </div>
              <div
                className={`mx-auto mt-2 max-w-prose text-pretty text-xl font-semibold sm:text-2xl ${
                  hasJP(q.prompt ?? '') ? 'jp' : ''
                }`}
              >
                {(q.prompt ?? '').split('＿＿').map((part, i, arr) => (
                  <span key={i}>
                    {renderRuby(part)}
                    {i < arr.length - 1 && <span className="jp font-extrabold text-primary">＿＿</span>}
                  </span>
                ))}
              </div>
              {q.cue && (
                <div className="jp eva-titlecard mt-3 text-3xl font-extrabold sm:text-4xl">
                  {renderRuby(q.cue)}
                </div>
              )}
            </div>

            {/* ───── ANSWER AREA (fixed height) ───── */}
            <div className="mt-3 flex min-h-[13rem] flex-col justify-center">
              {q.type === 'mc' ? (
                <Choices
                  options={q.options!}
                  correct={q.correct!}
                  picked={picked}
                  onPick={answerMC}
                  jp={optJP}
                  layout={mcLayout}
                />
              ) : (
                <div className="mx-auto w-full max-w-sm">
                  <input
                    className={`jp input input-bordered w-full text-center text-2xl ${
                      answered ? (feedback?.ok ? 'input-success' : 'input-error') : ''
                    }`}
                    autoComplete="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    placeholder="escribí en hiragana…"
                    value={typed}
                    readOnly={answered}
                    autoFocus
                    onChange={(e) => setTyped(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (!answered) checkType();
                      }
                    }}
                  />
                </div>
              )}
            </div>

            {/* feedback: reserved space so the button doesn't jump */}
            <div className="mt-3 min-h-[5.5rem]">
              {feedback && (
                <div
                  className={`rounded-box border px-4 py-3 text-sm ${
                    feedback.ok ? 'border-success bg-success/10' : 'border-error bg-error/10'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className={`font-extrabold ${feedback.ok ? 'text-success' : 'text-error'}`}>
                      {feedback.ok ? '✓ ¡Correcto!' : '✗ No exactamente'}
                    </div>
                    {q.topic && q.topic !== 'vocabulario' && (
                      <span className="badge badge-ghost badge-sm shrink-0">{q.topic}</span>
                    )}
                  </div>
                  <div className="jp mt-1 font-bold">
                    {feedback.ok ? '' : 'Respuesta: '}
                    {renderRuby(feedback.sol)}
                  </div>
                  <div className="mt-1 opacity-70">{feedback.exp}</div>
                </div>
              )}
            </div>

            {/* action — always in the same place */}
            <div className="mt-2 flex h-12 items-center justify-center">
              {answered ? (
                <button className="btn btn-primary px-8" onClick={next}>
                  {isLast ? 'Ver resultado →' : 'Siguiente →'}
                </button>
              ) : q.type === 'mc' ? (
                <span className="text-sm opacity-70">Elegí una opción</span>
              ) : (
                <button className="btn btn-primary px-8" onClick={checkType}>
                  Revisar
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function MissRow({ miss }: { miss: Miss }) {
  const { ex } = miss;
  const item = itemOf(ex);
  const topic = ex.topic === 'vocabulario' ? 'Vocabulario' : ex.topic;
  if (ex.type === 'conjugate' && item) {
    return (
      <div className="rounded-box border border-base-300 border-l-4 border-l-error bg-base-200 px-3.5 py-3">
        <div className="text-sm opacity-70">
          <b>Conjugación</b> · <span className="jp">{renderRuby(cueOf(item))}</span> — {item.meaning}
        </div>
        <div className="mt-1 text-sm font-bold text-error">Revisá las formas de este verbo.</div>
      </div>
    );
  }
  return (
    <div className="rounded-box border border-base-300 border-l-4 border-l-error bg-base-200 px-3.5 py-3">
      <div className="text-sm opacity-70">
        <b>{topic}</b> · {renderRuby(ex.prompt ?? '')}
        {ex.cue && <span className="jp"> （{renderRuby(ex.cue)}）</span>}
      </div>
      <div className="jp mt-1 font-bold">
        <span className="text-error line-through opacity-80">{miss.given}</span> →{' '}
        <span className="text-success">{renderRuby(miss.sol)}</span>
      </div>
      <div className="mt-1 text-sm opacity-70">{ex.exp}</div>
    </div>
  );
}

// Furigana notation for an item's dictionary form, e.g. [消|け]す.
function cueOf(item: Item): string {
  if (item.kanji && item.furi) return `[${item.kanji}|${item.furi}]${item.okuri ?? ''}`;
  return item.kana;
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 text-xs font-bold uppercase tracking-wider opacity-70">{children}</div>
  );
}
function Chip({
  active,
  onClick,
  children,
  color = 'primary',
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  color?: 'primary' | 'secondary' | 'accent';
}) {
  const on = { primary: 'btn-primary', secondary: 'btn-secondary', accent: 'btn-accent' }[color];
  return (
    <button
      className={`btn btn-sm h-auto flex-col items-start py-2 btn-outline ${
        active ? on : 'opacity-60'
      }`}
      aria-pressed={active}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
