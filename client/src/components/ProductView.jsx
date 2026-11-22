function formatTopic(topic) {
  if (!topic) return '';
  return topic.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function ProductView({ products = {} }) {
  const entries = Object.entries(products);

  if (!products || entries.length === 0) {
    return (
      <div className="empty-products-state">
        <span className="empty-icon">📦</span>
        <h3>No product data available</h3>
        <p>Upload a reviews CSV to generate per-product sentiment analytics</p>
      </div>
    );
  }

  return (
    <div className="product-view-container">
      <div className="product-view-header">
        <div>
          <h2>Product-Level Intelligence</h2>
          <p>Sentiment performance and critical issues broken down across {entries.length} catalog items</p>
        </div>
      </div>

      <div className="product-grid-modern">
        {entries.map(([name, info]) => {
          const positive = info.sentiment?.positive ?? info.positive ?? 0;
          const neutral = info.sentiment?.neutral ?? info.neutral ?? 0;
          const negative = info.sentiment?.negative ?? info.negative ?? 0;
          const total = info.reviewCount ?? (positive + neutral + negative);

          const pctPos = total > 0 ? Math.round((positive / total) * 100) : 0;
          const pctNeu = total > 0 ? Math.round((neutral / total) * 100) : 0;
          const pctNeg = total > 0 ? Math.round((negative / total) * 100) : 0;

          // Health Score
          const healthScore = total > 0 ? Math.round(((positive * 1.0 + neutral * 0.5) / total) * 100) : 0;

          // Issues list
          let issuesList = [];
          if (Array.isArray(info.topIssues)) {
            issuesList = info.topIssues.map((item) =>
              typeof item === 'object' && item !== null
                ? { topic: item.topic, count: item.count }
                : { topic: String(item), count: 1 }
            );
          } else if (info.topIssues && typeof info.topIssues === 'object') {
            issuesList = Object.entries(info.topIssues).map(([topic, count]) => ({ topic, count }));
          }

          return (
            <div key={name} className="product-card-modern">
              <div className="product-card-top">
                <div className="product-identity">
                  <span className="product-box-icon">📦</span>
                  <div>
                    <h3 className="product-heading">{name}</h3>
                    <span className="product-volume">{total} total reviews</span>
                  </div>
                </div>

                <div className={`product-health-gauge ${healthScore >= 70 ? 'good' : healthScore >= 40 ? 'warning' : 'poor'}`}>
                  <span className="health-num">{healthScore}%</span>
                  <span className="health-lbl">Health</span>
                </div>
              </div>

              {/* Stacked Sentiment Visual Progress Bar */}
              <div className="product-progress-track">
                <div
                  className="seg pos"
                  style={{ width: `${pctPos}%` }}
                  title={`Positive: ${pctPos}%`}
                ></div>
                <div
                  className="seg neu"
                  style={{ width: `${pctNeu}%` }}
                  title={`Neutral: ${pctNeu}%`}
                ></div>
                <div
                  className="seg neg"
                  style={{ width: `${pctNeg}%` }}
                  title={`Negative: ${pctNeg}%`}
                ></div>
              </div>

              {/* Sentiment Stat Counts */}
              <div className="product-stat-row">
                <div className="stat-pill pos">
                  <span className="dot"></span>
                  <strong>{positive}</strong> pos ({pctPos}%)
                </div>
                <div className="stat-pill neu">
                  <span className="dot"></span>
                  <strong>{neutral}</strong> neu ({pctNeu}%)
                </div>
                <div className="stat-pill neg">
                  <span className="dot"></span>
                  <strong>{negative}</strong> neg ({pctNeg}%)
                </div>
              </div>

              {/* Top Friction Points */}
              <div className="product-issues-section">
                <span className="issues-heading">Primary Customer Friction Points</span>
                {issuesList.length > 0 ? (
                  <div className="issues-chips-list">
                    {issuesList.map((item, idx) => (
                      <span key={idx} className="issue-chip">
                        ⚠️ {formatTopic(item.topic)} <strong className="issue-num">({item.count})</strong>
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="no-issues-clean">✓ Zero recurring defect complaints</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ProductView;
