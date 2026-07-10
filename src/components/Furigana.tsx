import type { Verb } from '../lib/types';

type Props = {
  verb: Pick<Verb, 'kanji' | 'furi' | 'okuri'>;
  className?: string;
};

/** Muestra un verbo con furigana solo sobre el kanji (el okurigana queda en kana). */
export default function Furigana({ verb, className = '' }: Props) {
  return (
    <span className={`jp ${className}`}>
      {verb.kanji ? (
        <>
          <ruby>
            {verb.kanji}
            <rt>{verb.furi}</rt>
          </ruby>
          {verb.okuri}
        </>
      ) : (
        verb.okuri
      )}
    </span>
  );
}
