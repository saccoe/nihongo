import { useEffect, useState } from 'react';
import verbsData from '../data/verbs.json';
import type { Verb, Group, FormKey, Forms } from '../lib/types';
import { conjugate, FORM_LABELS, acceptedFor, normalize } from '../lib/conjugator';
import Furigana from './Furigana';

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

type Mode = 'rapido' | 'completo';

export default function Conjugation() {
  const [mode, setMode] = useState<Mode>('rapido');
  const [showFuri, setShowFuri] = useState(true);

  const [verb, setVerb] = useState<Verb | null>(null);
  const [forms, setForms] = useState<Forms | null>(null);
  const [givenKey, setGivenKey] = useState<FormKey>('dict');
  const [askKeys, setAskKeys] = useState<FormKey[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [groupPick, setGroupPick] = useState<Group | null>(null);
  const [groupAnswered, setGroupAnswered] = useState(false);
  const [checked, setChecked] = useState(false);
  const [scoreN, setScoreN] = useState(0);
  const [scoreT, setScoreT] = useState(0);

  function newRound() {
    const v = pick(VERBS);
    const f = conjugate(v.kana, v.group);
    const fields = mode === 'completo' ? ALL_FORMS : CORE_FORMS;
    const given = pick(fields);
    let rest = fields.filter((k) => k !== given);
    if (mode === 'rapido') rest = shuffle(rest).slice(0, 2); // Rápido: 2 formas
    setVerb(v);
    setForms(f);
    setGivenKey(given);
    setAskKeys(rest);
    setValues({});
    setGroupPick(null);
    setGroupAnswered(false);
    setChecked(false);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    newRound();
  }, [mode]);

  function pickGroup(g: Group) {
    if (groupAnswered || checked) return;
    setGroupPick(g);
    setGroupAnswered(true);
  }

  function check() {
    if (!verb || !forms) return;
    if (checked) {
      newRound();
      return;
    }
    setChecked(true);
    let allOk = groupPick === verb.group;
    for (const k of askKeys) {
      const ok = acceptedFor(k, forms[k]).map(normalize).includes(normalize(values[k] ?? ''));
      if (!ok) allOk = false;
    }
    setScoreT((t) => t + 1);
    if (allOk) setScoreN((n) => n + 1);
  }

  if (!verb || !forms) return null;

  const givenIsKanjiDict = givenKey === 'dict' && !!verb.kanji;

  return (
    <section className="card border border-base-300 bg-base-100 shadow-xl">
      <div className="card-body">
        <div className="flex items-center justify-between gap-3 text-sm font-semibold opacity-70">
          <span>Verbo {scoreT + 1}</span>
          <span className="badge badge-ghost tabular-nums">
            {scoreN} / {scoreT}
          </span>
        </div>
        <progress
          className="progress progress-primary mt-2"
          value={scoreT ? scoreN : 0}
          max={scoreT || 1}
        />

        {/* forma dada (aleatoria) + significado */}
        <div className="mt-6 text-center">
          <div className="text-xs font-bold uppercase tracking-wider text-accent">
            Forma {FORM_LABELS[givenKey]}
          </div>
          <div
            className={`jp mt-1 text-5xl font-extrabold sm:text-6xl ${
              givenIsKanjiDict && !showFuri ? 'no-furi' : ''
            }`}
          >
            {givenIsKanjiDict ? <Furigana verb={verb} /> : forms[givenKey]}
          </div>
          <div className="mt-2 text-sm opacity-70">{verb.meaning}</div>
        </div>

        {/* grupo — feedback inmediato */}
        <div className="mt-5 text-center text-xs font-bold uppercase tracking-wider opacity-70">
          ¿Qué grupo es?
        </div>
        <div className="mt-1 flex flex-wrap justify-center gap-2.5">
          {([1, 2, 3] as Group[]).map((g) => {
            let cls = 'btn h-auto flex-col py-2';
            if (groupAnswered) {
              cls += ' pointer-events-none';
              if (g === verb.group) cls += ' btn-success';
              else if (g === groupPick) cls += ' btn-error';
              else cls += ' btn-outline opacity-40';
            } else {
              cls += ' btn-outline';
            }
            return (
              <button key={g} className={cls} onClick={() => pickGroup(g)}>
                <span>{GROUP_META[g].name}</span>
                <small className="jp text-[11px] font-normal opacity-70">{GROUP_META[g].sub}</small>
              </button>
            );
          })}
        </div>

        {/* completar las formas que faltan */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {askKeys.map((k) => {
            const val = values[k] ?? '';
            const ok = checked && acceptedFor(k, forms[k]).map(normalize).includes(normalize(val));
            return (
              <div key={k}>
                <label className="mb-1 block text-xs font-bold opacity-70">{FORM_LABELS[k]}</label>
                <input
                  className={`jp input input-bordered w-full text-lg ${
                    checked ? (ok ? 'input-success' : 'input-error') : ''
                  }`}
                  autoComplete="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  placeholder="…"
                  value={val}
                  readOnly={checked}
                  onChange={(e) => setValues((v) => ({ ...v, [k]: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') check();
                  }}
                />
                {checked && !ok && (
                  <div className="jp mt-1 text-sm font-bold text-success">→ {forms[k]}</div>
                )}
              </div>
            );
          })}
        </div>

        {/* acciones */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          {givenIsKanjiDict ? (
            <label className="flex cursor-pointer items-center gap-2 text-sm opacity-80">
              <input
                type="checkbox"
                className="toggle toggle-primary toggle-sm"
                checked={showFuri}
                onChange={(e) => setShowFuri(e.target.checked)}
              />
              Furigana
            </label>
          ) : (
            <span />
          )}
          <button className="btn btn-primary" onClick={check}>
            {checked ? 'Siguiente →' : 'Revisar'}
          </button>
        </div>

        {/* modo */}
        <div className="mt-5 text-xs font-bold uppercase tracking-wider opacity-70">Modo</div>
        <div className="mt-2 flex flex-wrap gap-2">
          <Chip color="accent" active={mode === 'rapido'} onClick={() => setMode('rapido')}>
            Rápido <small className="block text-[11px] opacity-70">2 formas</small>
          </Chip>
          <Chip color="accent" active={mode === 'completo'} onClick={() => setMode('completo')}>
            Completo <small className="block text-[11px] opacity-70">todas las formas</small>
          </Chip>
        </div>
      </div>
    </section>
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
