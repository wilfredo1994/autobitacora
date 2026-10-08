export default function Logo({ className = 'text-2xl' }: { className?: string }) {
  return (
    <span className={`font-extrabold tracking-tight ${className}`}>
      <span className="text-pine-900">Auto</span>
      <span className="text-emerald-600">Bitácora</span>
    </span>
  )
}
