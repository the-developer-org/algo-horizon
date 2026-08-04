export default function ScalpingLoading() {
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="mx-auto w-full max-w-5xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          <p className="text-lg font-semibold text-slate-900">Loading scalping page…</p>
          <p className="text-sm text-slate-600">Preparing the alphabet loading flow.</p>
        </div>
      </div>
    </main>
  );
}
