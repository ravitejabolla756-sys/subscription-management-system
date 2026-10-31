export default function PortalLoading() {
  return <div className="space-y-6" aria-label="Loading customer portal"><div className="h-8 w-64 animate-pulse rounded-lg bg-slate-200" /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[1, 2, 3, 4].map((item) => <div key={item} className="h-32 animate-pulse rounded-2xl bg-slate-200" />)}</div><div className="h-80 animate-pulse rounded-2xl bg-slate-200" /></div>;
}
