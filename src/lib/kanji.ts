// Kanji practice: derives words from their ruby and builds MC exercises on the fly.
// Distractors come from the data itself (other readings of the same kanji, similar or
// homophone kanji, other words of the same kind), so they are plausible mistakes rather
// than random noise.
import { db } from './db';
import type { Exercise, Kanji, KanjiWord, WordKind } from './types';

export type KanjiMode = 'reading' | 'meaning' | 'writing' | 'kanji';
export const WORD_MODES: KanjiMode[] = ['reading', 'meaning', 'writing'];

type Part = { text: string; reading?: string };
export interface Word extends KanjiWord {
  word: string;
  kana: string;
  lesson: number;
  parts: Part[];
}

const RUBY_RE = /\[([^|\]]+)\|([^\]]+)\]/g;

function parseRuby(ruby: string): Part[] {
  const out: Part[] = [];
  let last = 0;
  for (const m of ruby.matchAll(RUBY_RE)) {
    if (m.index > last) out.push({ text: ruby.slice(last, m.index) });
    out.push({ text: m[1], reading: m[2] });
    last = m.index + m[0].length;
  }
  if (last < ruby.length) out.push({ text: ruby.slice(last) });
  return out;
}

export const KANJI = db.kanji.all;
const KANJI_BY_CHAR = new Map(KANJI.map((k) => [k.char, k]));
export const LESSON_COUNT = Math.max(...KANJI.map((k) => k.lesson));

// A word belongs to the lesson of its newest kanji: picking lessons 1–16 only shows
// words you can fully read with what you've studied.
export const WORDS: Word[] = db.kanjiWords.all.map((w) => {
  const parts = parseRuby(w.ruby);
  const chars = [...parts.filter((p) => p.reading).map((p) => p.text).join('')];
  return {
    ...w,
    parts,
    word: parts.map((p) => p.text).join(''),
    kana: parts.map((p) => p.reading ?? p.text).join(''),
    lesson: Math.max(...chars.map((c) => KANJI_BY_CHAR.get(c)?.lesson ?? 0)),
  };
});

export const kanjiOfLesson = (n: number) => KANJI.filter((k) => k.lesson === n);

const toHira = (s: string) =>
  s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
const kunStem = (r: string) => r.split('-')[0];
const readingsOf = (k: Kanji) => [...k.on.map(toHira), ...k.kun.map(kunStem)];

function shuffle<T>(a: T[]): T[] {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

/* ---------- reading distractors ---------- */

// Kanji that look alike, within BKB1. Each string is one group.
const SIMILAR = [
  '間聞問開閉門', '待持時寺', '体休本木', '日目月田', '人入八', '土工上', '千午牛',
  '右石左', '夫大', '雪雲電雨', '見貝', '読語話計言', '飲飯食館', '東車', '姉妹市',
  '兄元先', '新親', '内肉', '林森', '晴青静', '遅速遠近道通', '病疲痛', '広店度府',
  '国図回困園', '働動', '習曜', '夕名多', '子字学', '室屋', '宅客家宿', '万方', '主住',
  '今会', '鳥島馬',
];
const SIMILAR_TO = new Map<string, string[]>();
for (const g of SIMILAR) for (const c of g) SIMILAR_TO.set(c, [...g].filter((x) => x !== c));


const VOICED: Record<string, string> = {};
'かがきぎくぐけげこごさざしじすずせぜそぞただちぢつづてでとどはばひびふぶへべほぼ'
  .match(/../g)!
  .forEach((pair) => {
    VOICED[pair[0]] = pair[1];
    VOICED[pair[1]] = pair[0];
  });
const SEMI: Record<string, string> = { は: 'ぱ', ひ: 'ぴ', ふ: 'ぷ', へ: 'ぺ', ほ: 'ぽ', ぱ: 'は', ぴ: 'ひ', ぷ: 'ふ', ぺ: 'へ', ぽ: 'ほ' };
const LONG_O = 'おこごそぞとどのほぼぽもよろょゅ';

// Small slips on the kana of the kanji itself: long vowel, っ, dakuten, ゅ/ょ —
// the classic こうこう/ここう, がっこう/がこう, しゅう/しょう confusions.
function slips(r: string, isFirst: boolean): string[] {
  const out: string[] = [];
  for (let i = 0; i < r.length; i++) {
    const c = r[i];
    if (c === 'う' && i > 0 && LONG_O.includes(r[i - 1])) out.push(r.slice(0, i) + r.slice(i + 1));
    // Long vowel only where it really gets dropped/added: block end (こ/こう) or after ょ/ゅ.
    const longSpot = i === r.length - 1 || c === 'ょ' || c === 'ゅ';
    if (longSpot && LONG_O.includes(c) && r[i + 1] !== 'う') out.push(r.slice(0, i + 1) + 'う' + r.slice(i + 1));
    if (c === 'っ') out.push(r.slice(0, i) + r.slice(i + 1));
    if ((i > 0 || !isFirst) && VOICED[c]) out.push(r.slice(0, i) + VOICED[c] + r.slice(i + 1));
    if ((i > 0 || !isFirst) && SEMI[c]) out.push(r.slice(0, i) + SEMI[c] + r.slice(i + 1));
    if (c === 'ゅ') out.push(r.slice(0, i) + 'ょ' + r.slice(i + 1));
    if (c === 'ょ') out.push(r.slice(0, i) + 'ゅ' + r.slice(i + 1));
  }
  return out;
}

// Every way to read a block kanji by kanji: [今日|きょう] → いまひ, こんにち, …
function charByChar(ks: Kanji[]): string[] {
  return ks.reduce<string[]>(
    (acc, k) => acc.flatMap((pre) => readingsOf(k).map((r) => pre + r)),
    [''],
  );
}

function readingDistractors(w: Word, n: number, fallback: Word[]): string[] {
  const bad = new Set([w.kana, ...(w.alt ?? [])]);
  const join = (i: number, r: string) =>
    w.parts.map((p, j) => (j === i ? r : (p.reading ?? p.text))).join('');
  // Best: another real reading of the same kanji (食べる → しょくべる, 部屋 → ぶおく).
  // Then slips, then readings of a look-alike kanji (食べる → のべる, from 飲).
  const swaps: string[] = [];
  const slipped: string[] = [];
  const lookalikes: string[] = [];
  w.parts.forEach((p, i) => {
    if (!p.reading) return;
    const ks = [...p.text].map((c) => KANJI_BY_CHAR.get(c)).filter((k): k is Kanji => !!k);
    if (ks.length > 1) {
      for (const r of charByChar(ks)) swaps.push(join(i, r));
    } else if (ks.length === 1) {
      for (const r of readingsOf(ks[0])) if (r !== p.reading) swaps.push(join(i, r));
      for (const c of SIMILAR_TO.get(ks[0].char) ?? []) {
        for (const r of readingsOf(KANJI_BY_CHAR.get(c)!)) lookalikes.push(join(i, r));
      }
    }
    for (const s of slips(p.reading, i === 0)) slipped.push(join(i, s));
  });
  const out: string[] = [];
  const take = (list: string[], max: number) => {
    for (const c of shuffle(list)) {
      if (out.length >= max) return;
      if (!bad.has(c) && !out.includes(c)) out.push(c);
    }
  };
  take(swaps, Math.min(2, n));
  take(slipped, n);
  take(lookalikes, n);
  take(swaps, n);
  take(fallback.filter((f) => f.kind === w.kind).map((f) => f.kana), n);
  return out;
}

/* ---------- writing distractors ---------- */

function writingDistractors(w: Word, n: number, pool: Kanji[]): string[] {
  const known = new Set(WORDS.filter((x) => x.kana === w.kana || x.alt?.includes(w.kana)).map((x) => x.word));
  const chars = [...w.word].map((c, i) => ({ c, i })).filter(({ c }) => KANJI_BY_CHAR.has(c));
  const similar: string[] = [];
  const homophone: string[] = [];
  const other: string[] = [];
  const swap = (i: number, c: string) => [...w.word].map((x, j) => (j === i ? c : x)).join('');
  for (const { c, i } of chars) {
    for (const s of SIMILAR_TO.get(c) ?? []) similar.push(swap(i, s));
    const rs = readingsOf(KANJI_BY_CHAR.get(c)!);
    for (const k of KANJI) {
      if (k.char !== c && readingsOf(k).some((r) => rs.includes(r))) homophone.push(swap(i, k.char));
    }
    for (const k of pool) if (k.char !== c) other.push(swap(i, k.char));
  }
  const out: string[] = [];
  const take = (list: string[], max: number) => {
    for (const c of shuffle(list)) {
      if (out.length >= max) return;
      if (!known.has(c) && !out.includes(c)) out.push(c);
    }
  };
  take(similar, 2);
  take(homophone, n);
  take(other, n);
  return out;
}

/* ---------- meaning distractors ---------- */

function pickMeanings<T extends { meaning: string }>(correct: string, ranked: T[][], n: number): string[] {
  const out: string[] = [];
  for (const list of ranked) {
    for (const x of shuffle(list)) {
      if (out.length >= n) return out;
      if (x.meaning !== correct && !out.includes(x.meaning)) out.push(x.meaning);
    }
  }
  return out;
}

/* ---------- exercises ---------- */

export type Task = { mode: KanjiMode; id: string };

function mc(id: string, topic: string, prompt: string, cue: string, right: string, wrong: string[], exp: string): Exercise {
  const options = shuffle([right, ...wrong]);
  return { id, skill: 'kanji', type: 'mc', topic, prompt, cue, options, correct: options.indexOf(right), exp };
}

// "新 (しん) nuevo · 聞 (ぶん) oír" — how the word is built, shown after answering.
function breakdown(w: Word): string {
  return w.parts
    .filter((p) => p.reading)
    .map((p) =>
      p.text.length > 1
        ? `[${p.text}|${p.reading}] se lee como un todo`
        : `[${p.text}|${p.reading}] ${KANJI_BY_CHAR.get(p.text)?.meaning ?? ''}`,
    )
    .join(' · ');
}

export const KIND_ORDER: WordKind[] = ['noun', 'verb', 'adj_i', 'adj_na', 'other'];
const sameKind = (w: Word, list: Word[]) => list.filter((x) => x.kind === w.kind && x.id !== w.id);

/** Build one exercise. `words` / `kanji` = what's selected, used first for distractors
 *  so options stay within the lessons being studied. */
export function buildExercise(t: Task, words: Word[], kanji: Kanji[]): Exercise {
  if (t.mode === 'kanji') {
    const k = db.kanji.get(t.id)!;
    const sameLesson = KANJI.filter((x) => x.lesson === k.lesson);
    const wrong = pickMeanings(k.meaning, [sameLesson, kanji, KANJI], 3);
    const ex = WORDS.filter((w) => w.word.includes(k.char)).slice(0, 2);
    const readings = [k.on.length ? `on: ${k.on.join('・')}` : '', k.kun.length ? `kun: ${k.kun.join('・')}` : '']
      .filter(Boolean)
      .join(' · ');
    const examples = ex.map((w) => `${w.ruby} ${w.meaning}`).join(' · ');
    return mc(`kj-kanji-${k.id}`, 'kanji', '¿Qué significa este kanji?', k.char, k.meaning, wrong,
      `${readings}. Ej.: ${examples}`);
  }

  const w = WORDS.find((x) => x.id === t.id)!;
  const exp = `${breakdown(w)} → ${w.kana} = ${w.meaning}`;
  if (t.mode === 'reading') {
    const wrong = readingDistractors(w, 3, words.length > 10 ? words : WORDS);
    return mc(`kj-reading-${w.id}`, 'lectura', '¿Cómo se lee?', w.word, w.kana, wrong, exp);
  }
  if (t.mode === 'meaning') {
    const wrong = pickMeanings(w.meaning, [sameKind(w, words), sameKind(w, WORDS), WORDS], 3);
    return mc(`kj-meaning-${w.id}`, 'significado', '¿Qué significa?', w.word, w.meaning, wrong, exp);
  }
  const wrong = writingDistractors(w, 3, kanji.length > 10 ? kanji : KANJI);
  return mc(`kj-writing-${w.id}`, 'escritura', `¿Cómo se escribe? · ${w.meaning}`, w.kana, w.word, wrong, exp);
}
