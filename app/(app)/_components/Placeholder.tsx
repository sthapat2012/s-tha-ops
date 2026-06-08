export default function Placeholder({
  title,
  phase,
  children,
}: {
  title: string;
  phase: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="px-4 py-6">
      <h1 className="font-heading font-bold text-2xl mb-1">{title}</h1>
      <p className="text-sm text-slate/50 mb-6">{children}</p>
      <div className="rounded-2xl border-2 border-dashed border-slate/15 bg-white/50 p-8 text-center">
        <p className="text-4xl mb-2">🚧</p>
        <p className="font-medium text-slate/70">อยู่ระหว่างพัฒนา</p>
        <p className="text-sm text-slate/40 mt-1">{phase}</p>
      </div>
    </div>
  );
}
