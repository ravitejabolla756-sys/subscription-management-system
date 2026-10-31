"use client";

export default function PortalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div className="flex min-h-[60vh] flex-col items-center justify-center text-center"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">!</div><h1 className="mt-5 text-lg font-semibold text-slate-900">We couldn’t load this page</h1><p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">Something went wrong while loading your portal. Please try again.</p><button onClick={() => reset()} className="mt-6 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-700">Try again</button></div>;
}
