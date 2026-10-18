export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-8 animate-pulse">
      <div className="h-8 w-48 rounded-lg bg-muted/20" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="h-36 rounded-md content-panel bg-muted/10" />
        <div className="h-36 rounded-md content-panel bg-muted/10" />
        <div className="h-36 rounded-md content-panel bg-muted/10" />
      </div>
      <div className="h-72 rounded-md content-panel bg-muted/10" />
    </div>
  );
}
