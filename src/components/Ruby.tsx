import type { ReactNode } from 'react';

// Markup de furigana inline: [漢字|よみ] → <ruby>漢字<rt>よみ</rt></ruby>
// El texto que no está entre corchetes (kana, español, partículas) queda igual.
const RUBY_RE = /\[([^|\]]+)\|([^\]]+)\]/g;

export function renderRuby(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let i = 0;
  let m: RegExpExecArray | null;
  RUBY_RE.lastIndex = 0;
  while ((m = RUBY_RE.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(
      <ruby key={i++}>
        {m[1]}
        <rt>{m[2]}</rt>
      </ruby>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export default function Ruby({ text, className }: { text: string; className?: string }) {
  return <span className={className}>{renderRuby(text)}</span>;
}
