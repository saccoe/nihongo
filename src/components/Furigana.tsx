type Props = {
  verb: { kanji?: string; furi?: string; okuri?: string };
  className?: string;
};

/** Renders a word with furigana over the kanji only (okurigana stays as plain kana). */
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
