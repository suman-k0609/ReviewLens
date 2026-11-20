function StatsBar({ stats }) {
  if (!stats) return null;

  const timeSeconds = stats.totalTime != null
    ? (stats.totalTime / 1000).toFixed(1)
    : '—';

  return (
    <div className="stats-bar">
      <div className="stat-item">
        🤖 AI Calls: <strong>{stats.aiCalls ?? '—'}</strong>
      </div>
      <div className="stat-item">
        💾 Cache Hits: <strong>{stats.cacheHits ?? '—'}</strong>
      </div>
      <div className="stat-item">
        ⏱️ Processing Time: <strong>{timeSeconds}s</strong>
      </div>
      <div className="stat-item">
        📝 Reviews Processed: <strong>{stats.totalReviews ?? '—'}</strong>
      </div>
      {stats.skippedEmpty > 0 && (
        <div className="stat-item">
          📭 Skipped (Empty): <strong>{stats.skippedEmpty}</strong>
        </div>
      )}
      {stats.duplicates > 0 && (
        <div className="stat-item">
          🔁 Duplicates: <strong>{stats.duplicates}</strong>
        </div>
      )}
    </div>
  );
}

export default StatsBar;
