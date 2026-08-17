export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-6 p-6 animate-pulse">
      <div className="h-8 w-48 rounded bg-muted/20" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="h-32 rounded-sm bg-muted/20" />
        <div className="h-32 rounded-sm bg-muted/20" />
        <div className="h-32 rounded-sm bg-muted/20" />
      </div>
      <div className="h-64 rounded-sm bg-muted/20" />
    </div>
  );
}
