// Composants skeleton réutilisables avec animation pulse Tailwind

// Brique de base pulsante — export default pour usage générique (<Skeleton className="h-8 w-64" />)
export default function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`} />
}

// Même layout que RecipeCard
export function SkeletonCard() {
  return (
    <div className="flex gap-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <Skeleton className="w-24 h-20 rounded-lg shrink-0" />
      <div className="flex flex-col justify-between min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
        <div className="flex items-center gap-4 mt-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24 ml-auto" />
        </div>
      </div>
    </div>
  )
}

// Même layout que l'en-tête de UserProfile
export function SkeletonProfile() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-5 mb-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <Skeleton className="w-16 h-16 rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-28" />
        </div>
      </div>
      <div className="flex gap-1 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-8 w-28" />
      </div>
      <div className="flex flex-col gap-3">
        {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
      </div>
    </div>
  )
}

// Même layout que RecipeCardGrid (image au-dessus)
export function SkeletonCardGrid() {
  return (
    <div className="flex flex-col bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <Skeleton className="w-full h-40 sm:h-44" />
      <div className="p-3 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  )
}

// Liste générique de lignes animées
export function SkeletonList({ count = 5 }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <Skeleton className="w-10 h-10 rounded-full shrink-0" />
          <Skeleton className="h-5 flex-1" />
          <Skeleton className="h-8 w-20 rounded-full" />
        </div>
      ))}
    </div>
  )
}
