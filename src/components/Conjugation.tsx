import { useEffect, useRef, useState } from 'react';
import verbsData from '../data/verbs.json';
import type { Verb, Group, FormKey, Forms } from '../lib/types';
import { conjugate, FORM_LABELS, acceptedFor, normalize } from '../lib/conjugator';
import Choices from './Choices';

const VERBS = verbsData as Verb[];

// Rápido usa solo las formas núcleo; Completo, todas.
const CORE_FORMS: FormKey[] = ['dict', 'masu', 'nai', 'te'];
const ALL_FORMS: FormKey[] = ['dict', 'masu', 'nai', 'ta', 'nakatta', 'te', 'nakereba'];

const GROUP_META: Record<Group, { name: string; sub: string }> = {
  1: { name: 'Grupo 1', sub: 'ごだん' },
  2: { name: 'Grupo 2', sub: 'いちだん' },
  3: { name: 'Grupo 3', sub: 'へんかく' },
};
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
function shuffle<T>(a: T[]): T[] {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

/** Arma una opción múltiple: la correcta + hasta 3 distractores únicos. */
function makeChoices(correct: string, pool: string[]): { opts: string[]; correct: number } {
  const seen = new Set([correct]);
  const distract: string[] = [];
  for (const x of shuffle(pool)) {
    if (seen.has(x)) continue;
    seen.add(x);
    distract.push(x);
    if (distract.length >= 3) break;
  }
  const opts = shuffle([correct, ...distract]);
  return { opts, correct: opts.indexOf(correct) };
}

type Mode = 'rapido' | 'completo';
// Cada pregunta del recorrido va llenando la tarjeta de arriba.
type Step = { type: 'meaning' } | { type: 'kanji' } | { type: 'group' } | { type: 'form'; key: FormKey };

export default function Conjugation() {
  const [mode, setMode] = useState<Mode>('rapido');
  // Qué se pregunta además de la conjugación (por defecto: todo).
  const [guessKanji, setGuessKanji] = useState(true);
  const [guessMeaning, setGuessMeaning] = useState(true);

  const [verb, setVerb] = useState<Verb | null>(null);
  const [forms, setForms] = useState<Forms | null>(null);
  const [givenKey, setGivenKey] = useState<FormKey>('dict');
  const [askKeys, setAskKeys] = useState<FormKey[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [groupPick, setGroupPick] = useState<Group | null>(null);
  // Opción múltiple de kanji y de significado.
  const [kanjiOpts, setKanjiOpts] = useState<string[]>([]);
  const [kanjiCorrect, setKanjiCorrect] = useState(-1);
  const [kanjiPick, setKanjiPick] = useState<number | null>(null);
  const [meaningOpts, setMeaningOpts] = useState<string[]>([]);
  const [meaningCorrect, setMeaningCorrect] = useState(-1);
  const [meaningPick, setMeaningPick] = useState<number | null>(null);
  // Recorrido paso a paso.
  const [step, setStep] = useState(0);
  const [formChecked, setFormChecked] = useState<Record<string, boolean>>({});
  const [done, setDone] = useState(false);
  const [roundPass, setRoundPass] = useState(false);
  const [scoreN, setScoreN] = useState(0);
  const [scoreT, setScoreT] = useState(0);

  function newRound() {
    const v = pick(VERBS);
    const f = conjugate(v.kana, v.group);
    const fields = mode === 'completo' ? ALL_FORMS : CORE_FORMS;
    const given = pick(fields);
    let rest = fields.filter((k) => k !== given);
    if (mode === 'rapido') rest = shuffle(rest).slice(0, 2); // Rápido: 2 formas

    // Opciones de kanji (solo si el verbo tiene kanji) y de significado.
    if (v.kanji) {
      const { opts, correct } = makeChoices(
        v.kanji,
        VERBS.filter((x) => x.kanji).map((x) => x.kanji!),
      );
      setKanjiOpts(opts);
      setKanjiCorrect(correct);
    } else {
      setKanjiOpts([]);
      setKanjiCorrect(-1);
    }
    const m = makeChoices(v.meaning, VERBS.map((x) => x.meaning));
    setMeaningOpts(m.opts);
    setMeaningCorrect(m.correct);

    setVerb(v);
    setForms(f);
    setGivenKey(given);
    setAskKeys(rest);
    setValues({});
    setGroupPick(null);
    setKanjiPick(null);
    setMeaningPick(null);
    setStep(0);
    setFormChecked({});
    setDone(false);
    setRoundPass(false);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    newRound();
  }, [mode, guessKanji, guessMeaning]);

  // Enter avanza al siguiente paso cuando el actual ya está respondido.
  // (un ref evita closures viejos y re-suscribir el listener en cada render)
  const enterRef = useRef({ answered: false, done: true, next: () => {} });
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Enter' || e.metaKey || e.ctrlKey || e.altKey) return;
      const s = enterRef.current;
      if (s.done || !s.answered) return;
      e.preventDefault();
      s.next();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!verb || !forms) return null;

  // Secuencia de pasos: significado → kanji → grupo → una conjugación tras otra.
  const steps: Step[] = [];
  if (guessMeaning) steps.push({ type: 'meaning' });
  if (guessKanji && verb.kanji) steps.push({ type: 'kanji' });
  steps.push({ type: 'group' });
  for (const k of askKeys) steps.push({ type: 'form', key: k });
  const current = steps[Math.min(step, steps.length - 1)];
  const isLast = step >= steps.length - 1;

  // ¿La pregunta del paso actual ya fue respondida?
  function answered(s: Step): boolean {
    switch (s.type) {
      case 'meaning':
        return meaningPick !== null;
      case 'kanji':
        return kanjiPick !== null;
      case 'group':
        return groupPick !== null;
      case 'form':
        return !!formChecked[s.key];
    }
  }
  const curAnswered = answered(current);

  // Qué ya está revelado en la tarjeta de arriba (se va "llenando").
  const meaningRevealed = !guessMeaning || meaningPick !== null || done;
  const kanjiKnown = kanjiPick !== null || !guessKanji || done;
  const groupRevealed = groupPick !== null || done;

  // Forma dada (aleatoria): kana hasta que se resuelve el kanji, luego con furigana.
  const givenForm = forms[givenKey];
  const givenHasKanji = !!verb.kanji && !!verb.furi && givenForm.startsWith(verb.furi);
  const givenTail = givenHasKanji ? givenForm.slice(verb.furi!.length) : '';
  const showRuby = givenHasKanji && kanjiKnown;

  function checkForm(k: FormKey) {
    setFormChecked((f) => ({ ...f, [k]: true }));
  }

  function finish() {
    if (!verb || !forms) return;
    const meaningOk = !guessMeaning || meaningPick === meaningCorrect;
    const kanjiOk = !(guessKanji && verb.kanji) || kanjiPick === kanjiCorrect;
    const groupOk = groupPick === verb.group;
    const formsOk = askKeys.every((k) =>
      acceptedFor(k, forms[k]).map(normalize).includes(normalize(values[k] ?? '')),
    );
    setRoundPass(meaningOk && kanjiOk && groupOk && formsOk);
    setScoreT((t) => t + 1);
    if (meaningOk && kanjiOk && groupOk && formsOk) setScoreN((n) => n + 1);
    setDone(true);
  }

  function next() {
    if (isLast) finish();
    else setStep((s) => s + 1);
  }
  enterRef.current = { answered: curAnswered, done, next };

  return (
    <section className="card border border-base-300 bg-base-100 shadow-xl">
      <div className="card-body p-4 sm:p-6">
        <div className="flex items-center gap-3 text-sm font-semibold">
          <span className="badge badge-ghost shrink-0 tabular-nums opacity-70">
            {scoreN} / {scoreT}
          </span>
          {/* progreso de este verbo: steps chiquitos ocupando el header */}
          <ul className="steps min-w-0 flex-1 [&_.step]:min-w-[1.25rem] [&_.step]:before:!h-1 [&_.step]:after:!size-2.5 [&_.step]:after:!min-h-0 [&_.step]:after:!text-[0px]">
            {steps.map((_, i) => (
              <li key={i} className={`step ${i <= step ? 'step-primary' : ''}`} />
            ))}
          </ul>
          <div className="flex shrink-0 items-center gap-2">
            <details className="dropdown dropdown-end">
              <summary
                className="btn btn-ghost btn-sm btn-circle"
                aria-label="Ajustes"
                title="Ajustes"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="size-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.8}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z"
                  />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </summary>
              <div className="dropdown-content z-10 mt-2 w-60 rounded-box border border-base-300 bg-base-100 p-4 text-left font-normal shadow-xl">
                <div className="text-xs font-bold uppercase tracking-wider opacity-70">Modo</div>
                <div className="mt-2 flex gap-2">
                  <Chip color="accent" active={mode === 'rapido'} onClick={() => setMode('rapido')}>
                    Rápido <small className="block text-[11px] opacity-70">2 formas</small>
                  </Chip>
                  <Chip
                    color="accent"
                    active={mode === 'completo'}
                    onClick={() => setMode('completo')}
                  >
                    Completo <small className="block text-[11px] opacity-70">todas</small>
                  </Chip>
                </div>

                <div className="mt-4 text-xs font-bold uppercase tracking-wider opacity-70">
                  Qué preguntar
                </div>
                <div className="mt-3 flex flex-col gap-3 text-sm">
                  <label className="flex cursor-pointer items-center justify-between gap-2">
                    Kanji
                    <input
                      type="checkbox"
                      className="toggle toggle-secondary toggle-sm"
                      checked={guessKanji}
                      onChange={(e) => setGuessKanji(e.target.checked)}
                    />
                  </label>
                  <label className="flex cursor-pointer items-center justify-between gap-2">
                    Significado
                    <input
                      type="checkbox"
                      className="toggle toggle-secondary toggle-sm"
                      checked={guessMeaning}
                      onChange={(e) => setGuessMeaning(e.target.checked)}
                    />
                  </label>
                </div>
              </div>
            </details>
          </div>
        </div>

        {/* ───── Tarjeta de info: se va llenando con cada respuesta ───── */}
        <div className="mt-3 rounded-box border border-base-300 bg-base-200/50 p-4 text-center">
          <div className="text-[11px] font-bold uppercase tracking-wider text-accent">
            Forma {FORM_LABELS[givenKey]}
          </div>
          {/* Siempre <ruby> con <rt> (oculto hasta saber el kanji) para reservar
              el alto de la furigana y que la tarjeta no cambie de tamaño. */}
          <div className="jp eva-titlecard mt-1 text-4xl font-extrabold sm:text-5xl">
            <ruby>
              {showRuby ? verb.kanji : givenForm}
              <rt className={showRuby ? '' : 'invisible'}>{verb.furi ?? '　'}</rt>
            </ruby>
            {showRuby ? givenTail : ''}
          </div>

          <div className="mt-1 text-sm">
            {meaningRevealed ? (
              <span className="opacity-70">{verb.meaning}</span>
            ) : (
              <Placeholder>significado</Placeholder>
            )}
          </div>

          <div className="mt-2">
            {groupRevealed ? (
              <span className="badge badge-outline badge-sm gap-1.5">
                {GROUP_META[verb.group].name}
                <span className="jp opacity-70">{GROUP_META[verb.group].sub}</span>
              </span>
            ) : (
              <Placeholder>grupo</Placeholder>
            )}
          </div>

          {askKeys.length > 0 && (
            <div className="mt-3 grid gap-x-6 gap-y-1.5 border-t border-base-300 pt-3 text-left sm:grid-cols-2">
              {askKeys.map((k) => (
                <div key={k} className="flex items-baseline justify-between gap-2">
                  <span className="text-xs font-bold opacity-60">{FORM_LABELS[k]}</span>
                  {formChecked[k] || done ? (
                    <span className="jp text-base font-bold text-success">{forms[k]}</span>
                  ) : (
                    <span className="jp text-base opacity-25">···</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ───── Pregunta del paso actual ───── */}
        {!done && (
          <>
            {/* altura fija: el botón Siguiente siempre queda en el mismo lugar */}
            <div className="mt-3 flex min-h-[9rem] flex-col justify-center">
            {current.type === 'meaning' && (
              <Choices
                layout="grid"
                options={meaningOpts}
                correct={meaningCorrect}
                picked={meaningPick}
                onPick={(i) => meaningPick === null && setMeaningPick(i)}
              />
            )}

            {current.type === 'kanji' && (
              <Choices
                layout="wrap"
                jp
                options={kanjiOpts}
                correct={kanjiCorrect}
                picked={kanjiPick}
                onPick={(i) => kanjiPick === null && setKanjiPick(i)}
              />
            )}

            {current.type === 'group' && (
              <>
                <div className="mt-2 flex flex-wrap justify-center gap-2.5">
                  {([1, 2, 3] as Group[]).map((g) => {
                    let cls = 'btn h-auto flex-col py-2';
                    if (groupPick !== null) {
                      cls += ' pointer-events-none';
                      if (g === verb.group) cls += ' btn-success';
                      else if (g === groupPick) cls += ' btn-error';
                      else cls += ' btn-outline opacity-40';
                    } else {
                      cls += ' btn-outline';
                    }
                    return (
                      <button
                        key={g}
                        className={cls}
                        onClick={() => groupPick === null && setGroupPick(g)}
                      >
                        <span>{GROUP_META[g].name}</span>
                        <small className="jp text-[11px] font-normal opacity-70">
                          {GROUP_META[g].sub}
                        </small>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {current.type === 'form' &&
              (() => {
                const k = current.key;
                const val = values[k] ?? '';
                const checked = !!formChecked[k];
                const ok =
                  checked && acceptedFor(k, forms[k]).map(normalize).includes(normalize(val));
                return (
                  <div className="mx-auto mt-3 max-w-sm">
                    <label className="mb-1 block text-center text-xs font-bold opacity-70">
                      Escribí la forma {FORM_LABELS[k]} <span className="text-accent">(hiragana)</span>
                    </label>
                    <input
                      className={`jp input input-bordered w-full text-center text-2xl ${
                        checked ? (ok ? 'input-success' : 'input-error') : ''
                      }`}
                      autoComplete="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      placeholder="…"
                      value={val}
                      readOnly={checked}
                      autoFocus
                      onChange={(e) => setValues((v) => ({ ...v, [k]: e.target.value }))}
                      onKeyDown={(e) => {
                        // Enter revisa; una vez revisado, el handler global avanza.
                        if (e.key === 'Enter' && !checked) checkForm(k);
                      }}
                    />
                    {checked && !ok && (
                      <div className="jp mt-2 text-center text-sm font-bold text-success">
                        → {forms[k]}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* acción del paso — posición fija */}
            <div className="mt-3 flex h-12 items-center justify-center">
              {current.type === 'form' && !curAnswered ? (
                <button className="btn btn-primary px-8" onClick={() => checkForm(current.key)}>
                  Revisar
                </button>
              ) : curAnswered ? (
                <button className="btn btn-primary px-8" onClick={next}>
                  {isLast ? 'Terminar ✓' : 'Siguiente →'}
                </button>
              ) : (
                <span className="text-xs opacity-40">Elegí una opción</span>
              )}
            </div>
          </>
        )}

        {/* ───── Resultado del verbo ───── */}
        {done && (
          <div className="mt-6 text-center">
            <div
              className={`text-lg font-extrabold ${roundPass ? 'text-success' : 'text-error'}`}
            >
              {roundPass ? '¡Perfecto! ✓' : 'Con errores'}
            </div>
            <button className="btn btn-primary mt-4 px-8" onClick={newRound} autoFocus>
              Siguiente verbo →
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function Placeholder({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded bg-base-300/60 px-2 py-0.5 text-xs italic opacity-40">
      {children}
    </span>
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
