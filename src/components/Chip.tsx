export function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 text-xs font-bold uppercase tracking-wider opacity-70">{children}</div>
  );
}

export function Chip({
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
      className={`btn btn-sm h-auto flex-col items-start py-2 btn-outline ${
        active ? on : 'opacity-60'
      }`}
      aria-pressed={active}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
