function StatsBar({ stats }) {
  if (!stats) return null;

  const timeSeconds = stats.totalTime != null
    ? (stats.totalTime / 1000).toFixed(2)
    : '—';

  const cacheRate = stats.totalReviews > 0
    ? Math.round(((stats.cacheHits || 0) / stats.totalReviews) * 100)
    : 0;

  return (
    <div className="telemetry-bar">
      <div className="telemetry-header">
        <span className="live-pulse-dot"></span>
        <span className="telemetry-title">System Telemetry & Performance</span>
      </div>

      <div className="telemetry-chips">
        <div className="tele-chip">
          <span className="tele-icon">🤖</span>
          <span className="tele-label">AI Engine Calls:</span>
          <strong className="tele-val">{stats.aiCalls ?? 0}</strong>
        </div>

        <div className="tele-chip highlight">
          <span className="tele-icon">💾</span>
          <span className="tele-label">Cache Hit Ratio:</span>
          <strong className="tele-val">{stats.cacheHits ?? 0} ({cacheRate}%)</strong>
        </div>

        <div className="tele-chip">
          <span className="tele-icon">⏱️</span>
          <span className="tele-label">Total Latency:</span>
          <strong className="tele-val">{timeSeconds}s</strong>
        </div>

        <div className="tele-chip">
          <span className="tele-icon">📝</span>
          <span className="tele-label">Reviews Ingested:</span>
          <strong className="tele-val">{stats.totalReviews ?? 0}</strong>
        </div>

        {stats.skippedEmpty > 0 && (
          <div className="tele-chip warning">
            <span className="tele-icon">📭</span>
            <span className="tele-label">Skipped (Empty):</span>
            <strong className="tele-val">{stats.skippedEmpty}</strong>
          </div>
        )}

        {stats.duplicates > 0 && (
          <div className="tele-chip info">
            <span className="tele-icon">🔁</span>
            <span className="tele-label">Deduplicated:</span>
            <strong className="tele-val">{stats.duplicates}</strong>
          </div>
        )}
      </div>
    </div>
  );
}

export default StatsBar;
