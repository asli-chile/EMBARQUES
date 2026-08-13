/** Skeleton de página de inicio mientras auth / KPIs cargan. */

function Bone({ className = "" }: { className?: string }) {
  return <div className={`inicio-skeleton-bone ${className}`} aria-hidden />;
}

export function InicioAuthSkeleton() {
  return (
    <div className="relative z-10" role="status" aria-busy="true" aria-label="Cargando inicio">
      <header className="pt-8 pb-6 sm:pt-12 sm:pb-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <Bone className="h-9 w-44 rounded-full mb-8" />
          <Bone className="h-11 sm:h-14 w-[min(100%,28rem)] rounded-2xl mb-4" />
          <Bone className="h-5 w-[min(100%,22rem)] rounded-xl mb-2" />
          <Bone className="h-5 w-[min(90%,16rem)] rounded-xl mb-8" />
          <div className="flex flex-wrap gap-3">
            <Bone className="h-12 w-40 rounded-2xl" />
            <Bone className="h-12 w-36 rounded-2xl" />
          </div>
        </div>
      </header>

      <section className="pb-10 sm:pb-14">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <KpiSkeletonCard key={i} />
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-16 border-t border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <Bone className="h-3 w-24 rounded-full mb-4" />
          <Bone className="h-9 w-56 rounded-xl mb-3" />
          <Bone className="h-4 w-72 max-w-full rounded-lg mb-10" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <QuickLinkSkeletonCard key={i} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export function KpiSkeletonCard() {
  return (
    <div className="inicio-glass inicio-shine rounded-2xl sm:rounded-3xl p-5 sm:p-6 relative overflow-hidden">
      <div className="flex items-start justify-between mb-5">
        <Bone className="h-11 w-11 rounded-2xl" />
        <Bone className="h-6 w-12 rounded-full" />
      </div>
      <Bone className="h-10 w-16 rounded-xl mb-3" />
      <Bone className="h-4 w-28 rounded-lg mb-2" />
      <Bone className="h-3 w-20 rounded-md" />
    </div>
  );
}

export function QuickLinkSkeletonCard() {
  return (
    <div className="inicio-glass rounded-2xl sm:rounded-3xl p-5 sm:p-6">
      <div className="flex items-start justify-between mb-5">
        <Bone className="h-12 w-12 rounded-2xl" />
        <Bone className="h-4 w-6 rounded-md" />
      </div>
      <Bone className="h-5 w-36 rounded-lg mb-2" />
      <Bone className="h-3.5 w-full rounded-md mb-1.5" />
      <Bone className="h-3.5 w-3/4 rounded-md mb-5" />
      <Bone className="h-3.5 w-16 rounded-md" />
    </div>
  );
}
