import { useMemo, useState } from 'react';
import questionsData from '../data/questions.json';
import type { Question } from '../lib/types';
import { normalize } from '../lib/conjugator';
import { renderRuby } from './Ruby';

const QUESTIONS = questionsData as Question[];

// Un solo eje de filtro: temas de gramática + vocabulario como opción aparte.
// (la clave usa el nº de capítulo internamente, pero no se muestra)
type FilterDef = {
  key: string;
  label: string;
  color: 'primary' | 'accent';
  match: (q: Question) => boolean;
};
const FILTERS: FilterDef[] = [
  { key: 'g14', label: 'forma て · pedidos', color: 'primary', match: (q) => q.cat === 'gram' && q.ch === 14 },
  { key: 'g15', label: 'permiso · prohibición', color: 'primary', match: (q) => q.cat === 'gram' && q.ch === 15 },
  { key: 'g16', label: 'くて/で · から · partículas', color: 'primary', match: (q) => q.cat === 'gram' && q.ch === 16 },
  { key: 'g17', label: 'ない · obligación · までに', color: 'primary', match: (q) => q.cat === 'gram' && q.ch === 17 },
  { key: 'vocab', label: 'Vocabulario', color: 'accent', match: (q) => q.cat === 'vocab' },
];
const ALL_KEYS = FILTERS.map((f) => f.key);

type Miss = { q: Question; given: string };
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
  const [selKeys, setSelKeys] = useState<Set<string>>(new Set(ALL_KEYS));
  const [len, setLen] = useState<'15' | '30' | 'all'>('15');
  const [shuffle, setShuffle] = useState(true);

  const [queue, setQueue] = useState<Question[]>([]);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
  const [typed, setTyped] = useState('');
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [misses, setMisses] = useState<Miss[]>([]);

  const pool = useMemo(
    () => QUESTIONS.filter((q) => FILTERS.some((f) => selKeys.has(f.key) && f.match(q))),
    [selKeys],
  );
  const target = len === 'all' ? pool.length : Math.min(+len, pool.length);

  function toggleKey(key: string) {
    const next = new Set(selKeys);
    if (next.has(key)) {
      if (next.size === 1) return;
      next.delete(key);
    } else next.add(key);
    setSelKeys(next);
  }

  function start(list?: Question[]) {
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
    else setMisses((m) => [...m, { q, given: q.options![i] }]);
    setFeedback({ ok, sol: q.options![q.correct!], exp: q.exp });
  }
  function checkType() {
    if (answered || !q) return;
    const val = normalize(typed);
    if (!val) return;
    setAnswered(true);
    const ok = q.a!.map(normalize).includes(val);
    if (ok) setScore((s) => s + 1);
    else setMisses((m) => [...m, { q, given: typed.trim() || '(vacío)' }]);
    setFeedback({ ok, sol: q.a![0], exp: q.exp });
  }
  function next() {
    if (idx + 1 >= queue.length) setPhase('result');
    else {
      setIdx((i) => i + 1);
      resetQ();
    }
  }

  /* ---------- SETUP ---------- */
  if (phase === 'setup') {
    return (
      <section className="card border border-base-300 bg-base-100 shadow-xl">
        <div className="card-body gap-1 p-4 sm:p-6">
          <span className="text-xs font-bold uppercase tracking-widest text-accent">
            Configurá tu repaso
          </span>
          <p className="mb-2 text-sm opacity-70">
            Gramática y vocabulario. Corrección al instante con explicación.
          </p>

          <Label>Qué practicar</Label>
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <Chip
                key={f.key}
                color={f.color}
                active={selKeys.has(f.key)}
                onClick={() => toggleKey(f.key)}
              >
                <span className="jp">{f.label}</span>
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
              {pool.length ? `${target} de ${pool.length} disponibles` : 'Elegí tema y tipo'}
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
              {misses.map((m, i) => {
                const sol = m.q.type === 'mc' ? m.q.options![m.q.correct!] : m.q.a![0];
                return (
                  <div
                    key={i}
                    className="rounded-box border border-base-300 border-l-4 border-l-error bg-base-200 px-3.5 py-3"
                  >
                    <div className="text-sm opacity-70">
                      <b>{m.q.topic === 'vocabulario' ? 'Vocabulario' : m.q.topic}</b> ·{' '}
                      {renderRuby(m.q.prompt)}
                      {m.q.cue && <span className="jp"> （{renderRuby(m.q.cue)}）</span>}
                    </div>
                    <div className="jp mt-1 font-bold">
                      <span className="text-error line-through opacity-80">{m.given}</span> →{' '}
                      <span className="text-success">{renderRuby(sol)}</span>
                    </div>
                    <div className="mt-1 text-sm opacity-70">{m.q.exp}</div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-4 text-center text-lg font-bold text-success">Sin errores. 完璧！</p>
          )}

          <div className="mt-5 flex justify-center gap-3">
            {misses.length > 0 && (
              <button className="btn btn-primary" onClick={() => start(misses.map((m) => m.q))}>
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
  const optJP = q.cat !== 'vocab' || hasJP(q.options?.[0] ?? '');
  return (
    <section className="card border border-base-300 bg-base-100 shadow-xl">
      <div className="card-body p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3 text-sm font-semibold opacity-70">
          <span>
            Pregunta {idx + 1} de {queue.length}
          </span>
          <span className="badge badge-ghost tabular-nums">
            {score} / {answered ? idx + 1 : idx}
          </span>
        </div>
        <progress className="progress progress-primary mt-2" value={idx} max={queue.length} />

        <div className="mt-5">
          <div className="mb-1 flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-wider">
            <span className="badge badge-ghost badge-sm">
              {q.cat === 'vocab' ? 'Vocabulario' : 'Gramática'}
            </span>
          </div>

          <div className={`text-lg font-semibold text-pretty ${hasJP(q.prompt) ? 'jp' : ''}`}>
            {q.prompt.split('＿＿').map((part, i, arr) => (
              <span key={i}>
                {renderRuby(part)}
                {i < arr.length - 1 && <span className="jp font-extrabold text-primary">＿＿</span>}
              </span>
            ))}
          </div>

          {q.cue && (
            <div className="jp my-4 rounded-box border border-dashed border-base-300 bg-base-200 p-4 text-center text-3xl font-extrabold sm:text-4xl">
              {renderRuby(q.cue)}
            </div>
          )}

          {q.type === 'mc' ? (
            <div className="mt-2 flex flex-col gap-2.5">
              {q.options!.map((opt, i) => {
                let cls = 'btn justify-start h-auto py-3.5 text-base font-normal';
                if (answered) {
                  cls += ' pointer-events-none';
                  if (i === q.correct) cls += ' btn-success';
                  else if (i === picked) cls += ' btn-error';
                  else cls += ' btn-outline opacity-40';
                } else cls += ' btn-outline';
                return (
                  <button
                    key={i}
                    className={`${cls} ${optJP ? 'jp' : ''}`}
                    onClick={() => answerMC(i)}
                  >
                    <span className="badge badge-sm mr-1">{'ABCD'[i]}</span>
                    {renderRuby(opt)}
                  </button>
                );
              })}
            </div>
          ) : (
            <>
              <div className="mt-2 flex flex-wrap gap-2.5">
                <input
                  className={`jp input input-bordered flex-1 text-xl ${
                    answered ? (feedback?.ok ? 'input-success' : 'input-error') : ''
                  }`}
                  autoComplete="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  placeholder="escribí en hiragana…"
                  value={typed}
                  readOnly={answered}
                  onChange={(e) => setTyped(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      answered ? next() : checkType();
                    }
                  }}
                />
                {!answered && (
                  <button className="btn btn-primary" onClick={checkType}>
                    Revisar
                  </button>
                )}
              </div>
              {!answered && (
                <p className="mt-2 text-xs font-semibold text-accent">
                  ✍ Escribí la respuesta únicamente en hiragana
                </p>
              )}
            </>
          )}

          {feedback && (
            <div
              className={`mt-4 rounded-box border px-4 py-3.5 text-sm ${
                feedback.ok
                  ? 'border-success bg-success/10'
                  : 'border-error bg-error/10'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className={`font-extrabold ${feedback.ok ? 'text-success' : 'text-error'}`}>
                  {feedback.ok ? '✓ ¡Correcto!' : '✗ No exactamente'}
                </div>
                {q.topic !== 'vocabulario' && (
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

        <div className="mt-5 flex justify-end gap-3">
          <button className="btn btn-ghost" onClick={() => setPhase('setup')}>
            Salir
          </button>
          {answered && (
            <button className="btn btn-primary" onClick={next}>
              {idx + 1 >= queue.length ? 'Ver resultado →' : 'Siguiente →'}
            </button>
          )}
        </div>
      </div>
    </section>
  );
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
      className={`btn btn-sm h-auto flex-col items-start py-2 ${active ? on : 'btn-outline'}`}
      aria-pressed={active}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
