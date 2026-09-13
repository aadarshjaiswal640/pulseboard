'use client';

export default function SettingsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="p-6 flex flex-col items-center justify-center min-h-[400px]">
      <h2 className="text-lg font-semibold text-gray-900 mb-2">Settings Error</h2>
      <p className="text-sm text-gray-500 mb-4">{error.message || 'Failed to load settings'}</p>
      <button onClick={reset} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
        Try again
      </button>
    </div>
  );
}
