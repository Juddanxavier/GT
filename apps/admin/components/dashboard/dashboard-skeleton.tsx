export function DashboardSkeleton() {
  return (
    <div className="w-full space-y-7">
      {/* CommandHeader — the single row header (the ticker strip is gone, AC-9). */}
      <div className="h-[84px] rounded-lg content-panel animate-pulse opacity-60" />

      {/* Range control row. */}
      <div className="h-9 w-72 rounded-md bg-default-100 animate-pulse" />

      {/* Attention panel. */}
      <div className="h-[180px] rounded-lg content-panel animate-pulse opacity-60" />

      {/* Shipment overview — bento board (Column: 2x2 feature + tall status rail). */}
      <div className="space-y-4">
        <div className="h-3 w-28 rounded bg-default-100 animate-pulse" />
        <div
          className="grid grid-cols-2 lg:grid-cols-4 gap-4"
          style={{ gridAutoRows: 'minmax(156px, auto)' }}
        >
          {['lg:col-span-2 lg:row-span-2', '', 'lg:row-span-2', '', '', '', '', ''].map((span, i) => (
            <div key={i} className={`${span} rounded-lg content-panel animate-pulse opacity-60`} />
          ))}
        </div>
      </div>

      {/* Business overview — bento board (accent feature + wide + two base). */}
      <div className="space-y-4">
        <div className="h-3 w-28 rounded bg-default-100 animate-pulse" />
        <div
          className="grid grid-cols-2 lg:grid-cols-4 gap-4"
          style={{ gridAutoRows: 'minmax(156px, auto)' }}
        >
          {['lg:col-span-2 lg:row-span-2', 'lg:col-span-2', '', ''].map((span, i) => (
            <div key={i} className={`${span} rounded-lg content-panel animate-pulse opacity-60`} />
          ))}
        </div>
      </div>

      {/* Trend chart and status breakdown. */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="h-72 rounded-lg content-panel animate-pulse opacity-60 lg:col-span-8" />
        <div className="h-72 rounded-lg content-panel animate-pulse opacity-60 lg:col-span-4" />
      </div>
    </div>
  );
}
