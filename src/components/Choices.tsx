import { useEffect } from 'react';
import { renderRuby } from './Ruby';

// Opción múltiple compartida por Repaso y Conjugación.
// - layout: 'stack' (una por fila), 'grid' (2 columnas), 'wrap' (chips centrados)
// - jp: usa la fuente japonesa en el texto de la opción
// - Cada opción lleva su número (1-4) y se puede elegir con esa tecla.
// - reveal (picked !== null): pinta correcta/incorrecta y bloquea clicks
export type ChoicesProps = {
  title?: string;
  options: string[];
  correct: number;
  picked: number | null;
  onPick: (i: number) => void;
  jp?: boolean;
  layout?: 'stack' | 'grid' | 'wrap';
};

export default function Choices({
  title,
  options,
  correct,
  picked,
  onPick,
  jp = false,
  layout = 'stack',
}: ChoicesProps) {
  const reveal = picked !== null;

  // Atajo de teclado: 1..N eligen la opción (mientras no esté respondida).
  useEffect(() => {
    if (reveal) return;
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= options.length) {
        e.preventDefault();
        onPick(n - 1);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [reveal, options.length, onPick]);

  const container =
    layout === 'grid'
      ? 'mt-1 grid grid-cols-2 gap-2'
      : layout === 'wrap'
        ? 'mt-1 flex flex-wrap justify-center gap-2.5'
        : 'mt-1 flex flex-col gap-2.5';
  return (
    <>
      {title && (
        <div className="text-center text-xs font-bold uppercase tracking-wider opacity-70">
          {title}
        </div>
      )}
      <div className={container}>
        {options.map((opt, i) => {
          let cls =
            layout === 'wrap'
              ? 'btn h-auto px-5 py-2 text-3xl'
              : layout === 'grid'
                ? jp
                  ? 'btn h-auto py-3 text-2xl'
                  : 'btn h-auto py-2 text-sm font-normal normal-case'
                : 'btn h-auto justify-start py-3 text-base font-normal normal-case';
          if (reveal) {
            cls += ' pointer-events-none';
            if (i === correct) cls += ' btn-success';
            else if (i === picked) cls += ' btn-error';
            else cls += ' btn-outline opacity-40';
          } else {
            cls += ' btn-outline';
          }
          // El número SIEMPRE a la izquierda; el texto ocupa el resto
          // (centrado en grilla/chips, alineado a la izq. en lista).
          const textAlign = layout === 'stack' ? 'text-left' : 'text-center';
          return (
            <button key={i} className={`${cls} justify-start gap-2`} onClick={() => onPick(i)}>
              <kbd className="kbd kbd-sm shrink-0">{i + 1}</kbd>
              <span className={`flex-1 ${textAlign} ${jp ? 'jp' : ''}`}>{renderRuby(opt)}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}
