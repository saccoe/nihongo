import type { Forms, FormKey, Group } from './types';

const I_MAP: Record<string, string> = {
  'う': 'い', 'く': 'き', 'ぐ': 'ぎ', 'す': 'し', 'つ': 'ち',
  'ぬ': 'に', 'ぶ': 'び', 'む': 'み', 'る': 'り',
};
const A_MAP: Record<string, string> = {
  'う': 'わ', 'く': 'か', 'ぐ': 'が', 'す': 'さ', 'つ': 'た',
  'ぬ': 'な', 'ぶ': 'ば', 'む': 'ま', 'る': 'ら',
};

/** たり = た + り, igual para los tres grupos. */
const withTari = (F: Forms): Forms => ({ ...F, tari: F.ta + 'り' });

/** Conjuga un verbo (dado en kana + grupo) a todas las formas del curso. */
export function conjugate(kana: string, group: Group): Forms {
  const F = { dict: kana } as Forms;

  if (group === 3) {
    if (kana.endsWith('する')) {
      const b = kana.slice(0, -2);
      F.masu = b + 'します'; F.nai = b + 'しない'; F.ta = b + 'した';
      F.nakatta = b + 'しなかった'; F.te = b + 'して'; F.nakereba = b + 'しなければ';
    } else { // 来る (くる) y compuestos con くる
      const b = kana.slice(0, -2);
      F.masu = b + 'きます'; F.nai = b + 'こない'; F.ta = b + 'きた';
      F.nakatta = b + 'こなかった'; F.te = b + 'きて'; F.nakereba = b + 'こなければ';
    }
    return withTari(F);
  }

  if (group === 2) {
    const b = kana.slice(0, -1); // quito る
    F.masu = b + 'ます'; F.nai = b + 'ない'; F.ta = b + 'た';
    F.nakatta = b + 'なかった'; F.te = b + 'て'; F.nakereba = b + 'なければ';
    return withTari(F);
  }

  // grupo 1 (godan)
  const last = kana.slice(-1);
  const stem = kana.slice(0, -1);
  F.masu = stem + I_MAP[last] + 'ます';

  if (kana === 'ある') {
    F.nai = 'ない'; F.nakatta = 'なかった'; F.nakereba = 'なければ';
  } else {
    const naiStem = stem + A_MAP[last];
    F.nai = naiStem + 'ない'; F.nakatta = naiStem + 'なかった'; F.nakereba = naiStem + 'なければ';
  }

  let te = '', ta = '';
  if (kana === 'いく') { te = 'いって'; ta = 'いった'; }
  else if ('うつる'.includes(last)) { te = stem + 'って'; ta = stem + 'った'; }
  else if ('むぶぬ'.includes(last)) { te = stem + 'んで'; ta = stem + 'んだ'; }
  else if (last === 'く') { te = stem + 'いて'; ta = stem + 'いた'; }
  else if (last === 'ぐ') { te = stem + 'いで'; ta = stem + 'いだ'; }
  else if (last === 'す') { te = stem + 'して'; ta = stem + 'した'; }
  F.te = te; F.ta = ta;

  return withTari(F);
}

export type AdjKind = 'adj_i' | 'adj_na';
export type AdjForms = { pres: string; neg: string; past: string; pastNeg: string };

/** Formas informales de un adjetivo (いい se conjuga desde よい). */
export function conjugateAdj(kana: string, kind: AdjKind): AdjForms {
  if (kind === 'adj_na') {
    return { pres: kana + '（だ）', neg: kana + 'じゃない', past: kana + 'だった', pastNeg: kana + 'じゃなかった' };
  }
  const stem = kana.endsWith('いい') ? kana.slice(0, -2) + 'よ' : kana.slice(0, -1);
  return { pres: kana, neg: stem + 'くない', past: stem + 'かった', pastNeg: stem + 'くなかった' };
}

/** Etiquetas legibles de cada forma. */
export const FORM_LABELS: Record<FormKey, string> = {
  dict: 'Diccionario',
  masu: 'ます',
  nai: 'ない',
  ta: 'た (pasado)',
  nakatta: 'なかった',
  te: 'て',
  tari: 'たり',
  nakereba: 'なければ (obligación)',
};

/** Respuestas aceptadas para un campo (nakereba admite variantes de obligación). */
export function acceptedFor(key: FormKey, value: string): string[] {
  if (key === 'nakereba') {
    return [value, value + 'ならない', value + 'なりません', value + 'いけない', value + 'いけません'];
  }
  return [value];
}

/** Normaliza input japonés: saca espacios y puntuación. */
export function normalize(s: string): string {
  return (s || '').trim().replace(/[\s　。、]/g, '');
}
