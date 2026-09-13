export default function LiveStreamLoading() {
  return (
    <div className="p-6 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-48 mb-4" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-16 bg-gray-200 rounded-lg" />
        ))}
      </div>
      <div className="h-80 bg-gray-200 rounded-lg mb-4" />
      <div className="h-48 bg-gray-200 rounded-lg" />
    </div>
  );
}
