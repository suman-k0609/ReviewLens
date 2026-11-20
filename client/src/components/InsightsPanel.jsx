function formatTopic(topic) {
  return topic
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function InsightsPanel({ complaints, praises }) {
  return (
    <div className="insights-panel">
      <div className="insights-column">
        <h3>🔴 Top Complaints</h3>
        {complaints && complaints.length > 0 ? (
          <ul className="complaints-list">
            {complaints.map((item, i) => (
              <li key={i} className="insight-item">
                <div className="insight-topic">
                  {formatTopic(item.topic)}
                  <span className="insight-count">{item.count}</span>
                </div>
                {item.examples && item.examples.length > 0 && (
                  <div className="insight-examples">
                    {item.examples.slice(0, 2).map((ex, j) => (
                      <div key={j}>• {ex}</div>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No complaints found</p>
        )}
      </div>

      <div className="insights-column">
        <h3>🟢 Top Praises</h3>
        {praises && praises.length > 0 ? (
          <ul className="praises-list">
            {praises.map((item, i) => (
              <li key={i} className="insight-item">
                <div className="insight-topic">
                  {formatTopic(item.topic)}
                  <span className="insight-count">{item.count}</span>
                </div>
                {item.examples && item.examples.length > 0 && (
                  <div className="insight-examples">
                    {item.examples.slice(0, 2).map((ex, j) => (
                      <div key={j}>• {ex}</div>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No praises found</p>
        )}
      </div>
    </div>
  );
}

export default InsightsPanel;
