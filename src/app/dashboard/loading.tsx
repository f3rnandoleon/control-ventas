export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 animate-pulse rounded-xl bg-white/10" />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="h-32 animate-pulse rounded-2xl bg-white/10" />
        <div className="h-32 animate-pulse rounded-2xl bg-white/10" />
        <div className="h-32 animate-pulse rounded-2xl bg-white/10" />
      </div>
      <div className="h-72 animate-pulse rounded-2xl bg-white/10" />
    </div>
  );
}
