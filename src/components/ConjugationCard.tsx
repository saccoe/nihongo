import { useEffect, useRef, useState } from 'react';
import { db } from '../lib/db';
import type { Item, Group, FormKey, Forms } from '../lib/types';
import { conjugate, FORM_LABELS, acceptedFor, normalize } from '../lib/conjugator';
import Choices from './Choices';

// The compound conjugation question, rendered inside the quiz as one exercise.
// It runs its own multi-step flow (meaning → kanji → group → forms) over a single
// verb and reports a single pass/fail via onComplete. Give it key={exercise.id}
// so a new exercise remounts it with a fresh round.

type Mode = 'rapido' | 'completo';

const CORE_FORMS: FormKey[] = ['dict', 'masu', 'nai', 'te'];
const ALL_FORMS: FormKey[] = ['dict', 'masu', 'nai', 'ta', 'nakatta', 'te', 'tari', 'nakereba'];

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

/** Builds a multiple choice: the correct one + up to 3 unique distractors. */
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

type Step = { type: 'meaning' } | { type: 'kanji' } | { type: 'group' } | { type: 'form'; key: FormKey };

type Round = {
  forms: Forms;
  givenKey: FormKey;
  askKeys: FormKey[];
  kanjiOpts: string[];
  kanjiCorrect: number;
  meaningOpts: string[];
  meaningCorrect: number;
};

function buildRound(verb: Item, mode: Mode): Round {
  const forms = conjugate(verb.kana, verb.group ?? 1);
  const fields = mode === 'completo' ? ALL_FORMS : CORE_FORMS;
  const given = pick(fields);
  let rest = fields.filter((k) => k !== given);
  if (mode === 'rapido') rest = shuffle(rest).slice(0, 2); // Rápido: 2 forms

  let kanjiOpts: string[] = [];
  let kanjiCorrect = -1;
  if (verb.kanji) {
    const k = makeChoices(
      verb.kanji,
      db.items.all.filter((x) => x.kanji).map((x) => x.kanji!),
    );
    kanjiOpts = k.opts;
    kanjiCorrect = k.correct;
  }
  const m = makeChoices(verb.meaning, db.items.all.map((x) => x.meaning));
  return { forms, givenKey: given, askKeys: rest, kanjiOpts, kanjiCorrect, meaningOpts: m.opts, meaningCorrect: m.correct };
}

type Props = {
  item: Item;
  mode?: Mode;
  askKanji?: boolean;
  askMeaning?: boolean;
  onComplete: (pass: boolean) => void;
};

export default function ConjugationCard({
  item: verb,
  mode = 'rapido',
  askKanji = true,
  askMeaning = true,
  onComplete,
}: Props) {
  // Round is fixed at mount; remounting (key=exercise.id) starts a fresh one.
  const [round] = useState<Round>(() => buildRound(verb, mode));
  const { forms, givenKey, askKeys, kanjiOpts, kanjiCorrect, meaningOpts, meaningCorrect } = round;

  const [values, setValues] = useState<Record<string, string>>({});
  const [groupPick, setGroupPick] = useState<Group | null>(null);
  const [kanjiPick, setKanjiPick] = useState<number | null>(null);
  const [meaningPick, setMeaningPick] = useState<number | null>(null);
  const [step, setStep] = useState(0);
  const [formChecked, setFormChecked] = useState<Record<string, boolean>>({});
  const [done, setDone] = useState(false);
  const [roundPass, setRoundPass] = useState(false);

  // Step sequence: meaning → kanji → group → each asked conjugation.
  const steps: Step[] = [];
  if (askMeaning) steps.push({ type: 'meaning' });
  if (askKanji && verb.kanji) steps.push({ type: 'kanji' });
  steps.push({ type: 'group' });
  for (const k of askKeys) steps.push({ type: 'form', key: k });
  const current = steps[Math.min(step, steps.length - 1)];
  const isLast = step >= steps.length - 1;

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

  // What's already revealed in the info card (fills in as it's answered).
  const meaningRevealed = !askMeaning || meaningPick !== null || done;
  const kanjiKnown = kanjiPick !== null || !askKanji || done;
  const groupRevealed = groupPick !== null || done;

  // Given form (random): kana until the kanji is solved, then with furigana.
  const givenForm = forms[givenKey];
  const givenHasKanji = !!verb.kanji && !!verb.furi && givenForm.startsWith(verb.furi);
  const givenTail = givenHasKanji ? givenForm.slice(verb.furi!.length) : '';
  const showRuby = givenHasKanji && kanjiKnown;

  function checkForm(k: FormKey) {
    setFormChecked((f) => ({ ...f, [k]: true }));
  }

  function finish() {
    const meaningOk = !askMeaning || meaningPick === meaningCorrect;
    const kanjiOk = !(askKanji && verb.kanji) || kanjiPick === kanjiCorrect;
    const groupOk = groupPick === verb.group;
    const formsOk = askKeys.every((k) =>
      acceptedFor(k, forms[k]).map(normalize).includes(normalize(values[k] ?? '')),
    );
    const pass = meaningOk && kanjiOk && groupOk && formsOk;
    setRoundPass(pass);
    setDone(true);
    onComplete(pass);
  }

  function next() {
    if (isLast) finish();
    else setStep((s) => s + 1);
  }

  // Enter advances to the next step once the current one is answered. The quiz
  // owns advancing to the next exercise (its Enter fires only after we're done).
  const enterRef = useRef({ answered: false, done: true, next: () => {} });
  enterRef.current = { answered: curAnswered, done, next };
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

  return (
    <>
      {/* ───── Info card: fills in with each answer ───── */}
      <div className="rounded-box border border-base-300 bg-base-200/50 p-4 text-center">
        <div className="text-xs font-bold uppercase tracking-wider text-accent">
          Forma {FORM_LABELS[givenKey]}
        </div>
        {/* Always <ruby> with <rt> (hidden until the kanji is known) so the furigana
            height is reserved and the card doesn't resize. */}
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
              {GROUP_META[verb.group ?? 1].name}
              <span className="jp opacity-70">{GROUP_META[verb.group ?? 1].sub}</span>
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

      {/* ───── Current step's question ───── */}
      {!done && (
        <>
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
                      <small className="jp text-xs font-normal opacity-70">{GROUP_META[g].sub}</small>
                    </button>
                  );
                })}
              </div>
            )}

            {current.type === 'form' &&
              (() => {
                const k = current.key;
                const val = values[k] ?? '';
                const checked = !!formChecked[k];
                const ok = checked && acceptedFor(k, forms[k]).map(normalize).includes(normalize(val));
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

          {/* step action — fixed position */}
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
              <span className="text-sm opacity-70">Elegí una opción</span>
            )}
          </div>
        </>
      )}

      {done && (
        <div className="mt-4 text-center text-lg font-extrabold">
          <span className={roundPass ? 'text-success' : 'text-error'}>
            {roundPass ? '¡Perfecto! ✓' : 'Con errores'}
          </span>
        </div>
      )}
    </>
  );
}

function Placeholder({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded bg-base-300/60 px-2 py-0.5 text-sm italic opacity-60">{children}</span>
  );
}
