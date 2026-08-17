export default function InvoiceDetailLoading() {
  return (
    <div className="flex flex-col gap-6 p-6 animate-pulse">
      <div className="h-8 w-64 rounded bg-muted/20" />
      <div className="h-48 rounded-sm bg-muted/20" />
      <div className="h-64 rounded-sm bg-muted/20" />
    </div>
  );
}
