function formatTopic(topic) {
  if (!topic) return '';
  return topic.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function ProductView({ products }) {
  if (!products || Object.keys(products).length === 0) {
    return <p style={{ color: '#94a3b8', padding: '2rem', textAlign: 'center' }}>No product data available.</p>;
  }

  const entries = Object.entries(products);

  return (
    <div className="product-grid">
      {entries.map(([name, info]) => {
        const positive = info.sentiment?.positive ?? info.positive ?? 0;
        const neutral = info.sentiment?.neutral ?? info.neutral ?? 0;
        const negative = info.sentiment?.negative ?? info.negative ?? 0;
        const total = info.reviewCount ?? (positive + neutral + negative);

        const pctPos = total > 0 ? (positive / total) * 100 : 0;
        const pctNeu = total > 0 ? (neutral / total) * 100 : 0;
        const pctNeg = total > 0 ? (negative / total) * 100 : 0;

        // Normalize topIssues whether array of objects or key-value map
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
          <div key={name} className="product-card">
            <h3>📦 {name}</h3>

            <div className="sentiment-bar">
              {pctPos > 0 && <div className="bar-positive" style={{ width: `${pctPos}%` }} title={`Positive: ${positive}`} />}
              {pctNeu > 0 && <div className="bar-neutral" style={{ width: `${pctNeu}%` }} title={`Neutral: ${neutral}`} />}
              {pctNeg > 0 && <div className="bar-negative" style={{ width: `${pctNeg}%` }} title={`Negative: ${negative}`} />}
            </div>

            <div className="sentiment-counts">
              <span><span className="count-dot pos" /> {positive} positive</span>
              <span><span className="count-dot neu" /> {neutral} neutral</span>
              <span><span className="count-dot neg" /> {negative} negative</span>
            </div>

            {issuesList.length > 0 && (
              <div className="product-issues">
                <h4>Top Issues</h4>
                <ul>
                  {issuesList.map((item, idx) => (
                    <li key={idx}>{formatTopic(item.topic)} ({item.count})</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="product-total">
              {total} total review{total !== 1 ? 's' : ''}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default ProductView;
