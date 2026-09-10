export function DashboardSkeleton() {
  return (
    <div className="w-full space-y-5">
      <div className="h-24 rounded-xl content-panel animate-pulse opacity-60" />
      <div className="space-y-3">
        <div className="h-3 w-28 rounded bg-muted/20 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl content-panel animate-pulse opacity-60" />
          ))}
        </div>
      </div>
      <div className="space-y-3">
        <div className="h-3 w-32 rounded bg-muted/20 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={`p-${i}`} className="h-24 rounded-xl content-panel animate-pulse opacity-60" />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="h-64 rounded-xl content-panel animate-pulse opacity-60 lg:col-span-8" />
        <div className="h-64 rounded-xl content-panel animate-pulse opacity-60 lg:col-span-4" />
      </div>
    </div>
  );
}
