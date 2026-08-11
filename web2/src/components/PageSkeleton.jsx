/**
 * Skeleton de carga de la landing — shimmer mientras hidrata / cambia de ruta
 */
const PageSkeleton = () => {
  return (
    <div className="min-h-screen bg-[#F7F5F2]" role="status" aria-live="polite" aria-label="Cargando página">
      {/* Header */}
      <div className="h-[4.25rem] border-b border-asli-dark/5 bg-white/80 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        <div className="skeleton-bone h-9 w-28 rounded-lg" />
        <div className="hidden lg:flex gap-6">
          <div className="skeleton-bone h-3 w-16 rounded-full" />
          <div className="skeleton-bone h-3 w-24 rounded-full" />
          <div className="skeleton-bone h-3 w-16 rounded-full" />
          <div className="skeleton-bone h-3 w-20 rounded-full" />
        </div>
        <div className="skeleton-bone h-9 w-24 rounded-full" />
      </div>

      <div className="mx-auto w-full max-w-[72rem] px-4 sm:px-6 lg:px-8 py-10 md:py-14">
        {/* Hero */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center mb-20">
          <div className="lg:col-span-6 space-y-4">
            <div className="skeleton-bone h-14 w-40 rounded-lg" />
            <div className="skeleton-bone h-3 w-36 rounded-full" />
            <div className="skeleton-bone h-12 w-full max-w-md rounded-xl" />
            <div className="skeleton-bone h-12 w-4/5 max-w-sm rounded-xl" />
            <div className="skeleton-bone h-4 w-full max-w-lg rounded-full mt-2" />
            <div className="skeleton-bone h-4 w-3/4 max-w-md rounded-full" />
            <div className="flex gap-3 pt-4">
              <div className="skeleton-bone h-12 w-36 rounded-full" />
              <div className="skeleton-bone h-12 w-40 rounded-full" />
            </div>
          </div>
          <div className="lg:col-span-6">
            <div className="skeleton-bone aspect-[4/3] w-full rounded-[22px]" />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="space-y-3 text-center">
              <div className="skeleton-bone h-10 w-20 mx-auto rounded-lg" />
              <div className="skeleton-bone h-3 w-28 mx-auto rounded-full" />
            </div>
          ))}
        </div>

        {/* Service cards */}
        <div className="text-center mb-10 space-y-3">
          <div className="skeleton-bone h-3 w-28 mx-auto rounded-full" />
          <div className="skeleton-bone h-8 w-64 mx-auto rounded-xl" />
          <div className="skeleton-bone h-4 w-80 max-w-full mx-auto rounded-full" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="rounded-[22px] overflow-hidden border border-asli-dark/5 bg-white">
              <div className="skeleton-bone h-44 w-full rounded-none" />
              <div className="p-6 space-y-3">
                <div className="skeleton-bone h-5 w-3/4 rounded-lg" />
                <div className="skeleton-bone h-3 w-full rounded-full" />
                <div className="skeleton-bone h-3 w-5/6 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <span className="sr-only">Cargando contenido…</span>
    </div>
  )
}

export default PageSkeleton
