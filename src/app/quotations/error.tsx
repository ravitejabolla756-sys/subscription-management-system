"use client";

export default function QuotationsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div className="flex min-h-[60vh] flex-col items-center justify-center text-center"><h1 className="text-lg font-semibold text-slate-900">Quotations are unavailable</h1><p className="mt-2 text-sm text-slate-500">Please try reloading this page.</p><button onClick={() => reset()} className="mt-5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-700">Try again</button></div>;
}
