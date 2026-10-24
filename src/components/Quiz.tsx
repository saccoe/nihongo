import { useMemo, useState } from 'react';
import { exercisesOf, lessonsInOrder } from '../lib/db';
import type { Exercise } from '../lib/types';
import QuizRunner, { shuffleArr } from './QuizRunner';
import { Chip, Label } from './Chip';

// Filters = the lessons, in order. A chapter lesson bundles its grammar + vocab;
// the conjugación lesson holds the generated conjugate exercises.
const LESSONS = lessonsInOrder();

export default function Quiz() {
  const [selKeys, setSelKeys] = useState<Set<string>>(new Set(LESSONS.map((l) => l.id)));
  const [len, setLen] = useState<'15' | '30' | 'all'>('15');
  const [shuffle, setShuffle] = useState(true);
  const [run, setRun] = useState<Exercise[] | null>(null);

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

  function start() {
    setRun((shuffle ? shuffleArr(pool) : pool).slice(0, target));
  }

  if (run) return <QuizRunner initial={run} shuffle={shuffle} onExit={() => setRun(null)} />;

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
          <button className="btn btn-primary" disabled={pool.length === 0} onClick={start}>
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
