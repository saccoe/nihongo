import { useEffect, useMemo, useState } from 'react';
import verbsData from '../data/verbs.json';
import type { Verb, Group, FormKey, Forms } from '../lib/types';
import { conjugate, FORM_LABELS, acceptedFor, normalize } from '../lib/conjugator';
import Furigana from './Furigana';

const VERBS = verbsData as Verb[];
const MODE_FIELDS: Record<'rapido' | 'completo', FormKey[]> = {
  rapido: ['masu', 'nai', 'te'],
  completo: ['masu', 'nai', 'ta', 'nakatta', 'te', 'nakereba'],
};
const GROUP_META: Record<Group, { name: string; sub: string }> = {
  1: { name: 'Grupo 1', sub: 'ごだん' },
  2: { name: 'Grupo 2', sub: 'いちだん' },
  3: { name: 'Grupo 3', sub: 'へんかく' },
};
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

type Mode = 'rapido' | 'completo';

export default function Conjugation() {
  const [selGroups, setSelGroups] = useState<Set<Group>>(new Set([1, 2, 3]));
  const [includeF2, setIncludeF2] = useState(true);
  const [mode, setMode] = useState<Mode>('rapido');
  const [showFuri, setShowFuri] = useState(true);

  const [verb, setVerb] = useState<Verb | null>(null);
  const [forms, setForms] = useState<Forms | null>(null);
  const [givenKey, setGivenKey] = useState<FormKey>('masu');
  const [askKeys, setAskKeys] = useState<FormKey[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [groupPick, setGroupPick] = useState<Group | null>(null);
  const [groupAnswered, setGroupAnswered] = useState(false);
  const [checked, setChecked] = useState(false);
  const [scoreN, setScoreN] = useState(0);
  const [scoreT, setScoreT] = useState(0);

  const poolFor = (groups: Set<Group>, f2: boolean) =>
    VERBS.filter((v) => (v.falseG2 ? f2 : groups.has(v.group)));
  const pool = useMemo(() => poolFor(selGroups, includeF2), [selGroups, includeF2]);

  function newRound() {
    if (pool.length === 0) return;
    const v = pick(pool);
    const f = conjugate(v.kana, v.group);
    const fields = MODE_FIELDS[mode];
    const given = pick(fields);
    setVerb(v);
    setForms(f);
    setGivenKey(given);
    setAskKeys(fields.filter((k) => k !== given));
    setValues({});
    setGroupPick(null);
    setGroupAnswered(false);
    setChecked(false);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    newRound();
  }, [mode]);
  useEffect(() => {
    if (!verb) newRound();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  function toggleGroup(g: Group) {
    const next = new Set(selGroups);
    if (next.has(g)) next.delete(g);
    else next.add(g);
    if (poolFor(next, includeF2).length === 0) return;
    setSelGroups(next);
  }
  function toggleF2() {
    if (poolFor(selGroups, !includeF2).length === 0) return;
    setIncludeF2(!includeF2);
  }

  if (!verb || !forms) return null;

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

        {/* verbo */}
        <div className="mt-5 text-center">
          <div className={`text-5xl font-extrabold sm:text-6xl ${showFuri ? '' : 'no-furi'}`}>
            <Furigana verb={verb} />
          </div>
          <div className="mt-1 text-sm opacity-70">{verb.meaning}</div>
        </div>

        {/* dato */}
        <div className="mt-3 flex justify-center">
          <div className="jp inline-flex items-baseline gap-2 rounded-box border border-base-300 bg-base-200 px-4 py-2.5 text-lg">
            <span className="text-[11px] font-bold uppercase tracking-wider opacity-60">
              Forma {FORM_LABELS[givenKey]}
            </span>
            <span>{forms[givenKey]}</span>
          </div>
        </div>

        {/* grupo */}
        <div className="mt-4 text-center text-xs font-bold uppercase tracking-wider opacity-70">
          ¿Qué grupo es?
        </div>
        <div className="mt-1 flex flex-wrap justify-center gap-2.5">
          {([1, 2, 3] as Group[]).map((g) => {
            let cls = 'btn';
            if (groupAnswered) {
              if (g === verb.group) cls += ' btn-success';
              else if (g === groupPick) cls += ' btn-error';
              else cls += ' btn-outline btn-disabled';
            } else cls += ' btn-outline';
            return (
              <button
                key={g}
                className={`${cls} h-auto flex-col py-2`}
                disabled={groupAnswered}
                onClick={() => {
                  if (groupAnswered) return;
                  setGroupPick(g);
                  setGroupAnswered(true);
                }}
              >
                <span>{GROUP_META[g].name}</span>
                <small className="jp text-[11px] font-normal opacity-70">{GROUP_META[g].sub}</small>
              </button>
            );
          })}
        </div>

        {/* campos */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {askKeys.map((k) => {
            const val = values[k] ?? '';
            const ok =
              checked &&
              acceptedFor(k, forms[k]).map(normalize).includes(normalize(val));
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
                  disabled={checked}
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
          <label className="flex cursor-pointer items-center gap-2 text-sm opacity-80">
            <input
              type="checkbox"
              className="toggle toggle-primary toggle-sm"
              checked={showFuri}
              onChange={(e) => setShowFuri(e.target.checked)}
            />
            Furigana
          </label>
          <div className="flex gap-2.5">
            <button className="btn btn-ghost btn-sm" onClick={newRound}>
              Otro verbo
            </button>
            <button className="btn btn-primary" onClick={check}>
              {checked ? 'Siguiente →' : 'Revisar'}
            </button>
          </div>
        </div>

        {/* ajustes */}
        <div className="mt-5 text-xs font-bold uppercase tracking-wider opacity-70">Ajustes</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {([1, 2, 3] as Group[]).map((g) => (
            <Chip key={g} color="secondary" active={selGroups.has(g)} onClick={() => toggleGroup(g)}>
              Grupo {g}
            </Chip>
          ))}
          <Chip color="secondary" active={includeF2} onClick={toggleF2}>
            Falsos G2
          </Chip>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <Chip color="accent" active={mode === 'rapido'} onClick={() => setMode('rapido')}>
            Rápido <small className="jp block text-[11px] opacity-70">grupo · ます · ない · て</small>
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
