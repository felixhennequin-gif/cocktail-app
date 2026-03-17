// Composants skeleton réutilisables avec animation pulse Tailwind

// Brique de base pulsante
function Pulse({ className = '' }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
}

// Même layout que RecipeCard
export function SkeletonCard() {
  return (
    <div className="flex gap-4 bg-white rounded-xl border border-gray-200 p-4">
      <Pulse className="w-24 h-20 rounded-lg shrink-0" />
      <div className="flex flex-col justify-between min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <Pulse className="h-5 w-2/3" />
          <Pulse className="h-6 w-16 rounded-full" />
        </div>
        <div className="flex items-center gap-4 mt-2">
          <Pulse className="h-4 w-16" />
          <Pulse className="h-4 w-20" />
          <Pulse className="h-4 w-24 ml-auto" />
        </div>
      </div>
    </div>
  )
}

// Même layout que l'en-tête de UserProfile
export function SkeletonProfile() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-5 mb-6 bg-white rounded-xl border border-gray-200 p-6">
        <Pulse className="w-16 h-16 rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
          <Pulse className="h-7 w-40" />
          <Pulse className="h-4 w-28" />
        </div>
      </div>
      <div className="flex gap-1 mb-6 border-b border-gray-200 pb-2">
        <Pulse className="h-8 w-28" />
        <Pulse className="h-8 w-28" />
        <Pulse className="h-8 w-28" />
      </div>
      <div className="flex flex-col gap-3">
        {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
      </div>
    </div>
  )
}

// Liste générique de lignes animées
export function SkeletonList({ count = 5 }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-gray-200">
          <Pulse className="w-10 h-10 rounded-full shrink-0" />
          <Pulse className="h-5 flex-1" />
          <Pulse className="h-8 w-20 rounded-full" />
        </div>
      ))}
    </div>
  )
}
