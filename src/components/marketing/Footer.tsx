export function Footer() {
  return (
    <footer className="border-t border-gray-100">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-sm text-gray-500 sm:flex-row">
        <div className="flex items-center gap-2 font-semibold text-gray-700">
          <span className="grid h-6 w-6 place-items-center rounded-md bg-gray-900 text-xs text-white">
            S
          </span>
          SyncSpace
        </div>
        <p>
          A real-time collaborative whiteboard demo · Next.js · Supabase · Yjs
        </p>
      </div>
    </footer>
  );
}
