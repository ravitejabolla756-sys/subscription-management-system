export default function QuotationsLoading() {
  return <div className="space-y-5" aria-label="Loading quotations"><div className="h-8 w-52 animate-pulse rounded-lg bg-slate-200" />{[1, 2, 3].map((item) => <div key={item} className="h-36 animate-pulse rounded-2xl bg-slate-200" />)}</div>;
}
