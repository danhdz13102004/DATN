export default function ComingSoonPage() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mb-6">
        <i className="fas fa-rocket text-3xl text-primary"></i>
      </div>
      <h2 className="text-2xl font-bold text-text mb-2">Coming Soon</h2>
      <p className="text-text-muted max-w-md">
        We're working hard to bring you this feature. Stay tuned for updates!
      </p>
    </div>
  );
}
