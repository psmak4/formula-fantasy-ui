export function HeroBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0"
      style={{
        backgroundImage: [
          'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.06), transparent 55%)',
          'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 40%)',
          'repeating-linear-gradient(135deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, rgba(255,255,255,0) 10px, rgba(255,255,255,0) 14px)'
        ].join(', '),
        opacity: 0.08
      }}
    />
  )
}
