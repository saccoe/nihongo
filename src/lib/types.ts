export type Group = 1 | 2 | 3;

/** Un verbo de la base de datos.
 *  Furigana: la lectura (`furi`) va SOLO sobre el kanji; el `okuri` (okurigana)
 *  queda en kana suelto. Así se ve si la vocal い/え está dentro del kanji
 *  (suele ser Grupo 1) o en el okurigana (Grupo 2). */
export interface Verb {
  kanji?: string;   // parte en kanji (opcional; verbos en kana puro no lo tienen)
  furi?: string;    // lectura del kanji (furigana)
  okuri: string;    // resto en kana (okurigana), o la palabra entera si no hay kanji
  kana: string;     // lectura completa en kana — se usa para conjugar
  group: Group;
  meaning: string;
  falseG2?: boolean; // termina en える/いる pero es Grupo 1
}

export type FormKey =
  | 'dict' | 'masu' | 'nai' | 'ta' | 'nakatta' | 'te' | 'nakereba';

export type Forms = Record<FormKey, string>;

export type Category = 'gram' | 'vocab';
export type QuestionType = 'mc' | 'type';

export interface Question {
  ch: 14 | 15 | 16 | 17;
  cat: Category;
  topic: string;
  type: QuestionType;
  prompt: string;
  exp: string;
  cue?: string;        // para type: palabra a conjugar
  options?: string[];  // para mc
  correct?: number;    // para mc
  a?: string[];        // para type: respuestas aceptadas
}
