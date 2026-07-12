import { useEffect, useMemo, useRef, useState } from 'react';
import questionsData from '../data/questions.json';
import type { Question } from '../lib/types';
import { normalize } from '../lib/conjugator';
import { renderRuby } from './Ruby';
import Choices from './Choices';

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

  // Enter pasa a la siguiente pregunta cuando la actual ya está respondida.
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

  /* ---------- SETUP ---------- */
  if (phase === 'setup') {
    return (
      <section className="card border border-base-300 bg-base-100 shadow-xl">
        <div className="card-body p-4 sm:p-6">
          <span className="text-xs font-bold uppercase tracking-widest text-accent">
            Configurá tu repaso
          </span>
          <p className="mt-1 text-sm opacity-70">
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
                {f.label}
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
  // Largo visible: descartamos la lectura de furigana ([漢字|よみ] → 漢字).
  const displayLen = (s: string) => s.replace(/\[([^|\]]+)\|[^\]]+\]/g, '$1').length;
  // Opciones japonesas cortas (partículas, formas breves) → grilla 2×2;
  // el resto (significados en español, frases largas) → una por fila.
  const mcLayout =
    optJP && (q.options?.every((o) => displayLen(o) <= 10) ?? false) ? 'grid' : 'stack';
  const isLast = idx + 1 >= queue.length;
  return (
    <section className="card border border-base-300 bg-base-100 shadow-xl">
      <div className="card-body p-4 sm:p-6">
        {/* header: puntaje · progreso · salir (mismo patrón que Conjugación) */}
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

        {/* ───── ÁREA DE PREGUNTA (card de info) ───── */}
        <div className="mt-3 rounded-box border border-base-300 bg-base-200/50 p-4 text-center">
          <div className="text-[11px] font-bold uppercase tracking-wider text-accent">
            {q.cat === 'vocab' ? 'Vocabulario' : 'Gramática'}
          </div>
          <div
            className={`mx-auto mt-2 max-w-prose text-pretty text-xl font-semibold sm:text-2xl ${
              hasJP(q.prompt) ? 'jp' : ''
            }`}
          >
            {q.prompt.split('＿＿').map((part, i, arr) => (
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

        {/* ───── ÁREA DE RESPUESTA (tamaño fijo) ───── */}
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
                  // Enter revisa; una vez revisado, el handler global avanza.
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (!answered) checkType();
                  }
                }}
              />
            </div>
          )}
        </div>

        {/* feedback: espacio reservado para que el botón no se mueva */}
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

        {/* acción — siempre en el mismo lugar */}
        <div className="mt-2 flex h-12 items-center justify-center">
          {answered ? (
            <button className="btn btn-primary px-8" onClick={next}>
              {isLast ? 'Ver resultado →' : 'Siguiente →'}
            </button>
          ) : q.type === 'mc' ? (
            <span className="text-xs opacity-40">Elegí una opción</span>
          ) : (
            <button className="btn btn-primary px-8" onClick={checkType}>
              Revisar
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
