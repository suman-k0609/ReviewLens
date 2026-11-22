function formatTopic(topic) {
  if (!topic) return '';
  return topic
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function InsightsPanel({ complaints = [], praises = [] }) {
  const maxComplaint = Math.max(...complaints.map((c) => c.count), 1);
  const maxPraise = Math.max(...praises.map((p) => p.count), 1);

  return (
    <div className="insights-panel">
      {/* Top Complaints Card */}
      <div className="insight-column complaints-card">
        <div className="insight-card-header">
          <div className="insight-header-left">
            <span className="insight-badge-icon neg">🔴</span>
            <div>
              <h3>Top Critical Complaints</h3>
              <p>Primary friction points causing negative reviews</p>
            </div>
          </div>
          <span className="insight-total-badge neg">{complaints.length} Major Issues</span>
        </div>

        {complaints && complaints.length > 0 ? (
          <div className="insight-items-list">
            {complaints.map((item, i) => {
              const widthPct = Math.round((item.count / maxComplaint) * 100);
              return (
                <div key={i} className="insight-row complaint">
                  <div className="insight-row-top">
                    <div className="topic-rank-wrapper">
                      <span className="rank-tag neg">#{i + 1}</span>
                      <span className="topic-name">{formatTopic(item.topic)}</span>
                    </div>
                    <span className="frequency-badge neg">{item.count} complaints</span>
                  </div>

                  <div className="frequency-track">
                    <div
                      className="frequency-bar neg"
                      style={{ width: `${widthPct}%` }}
                    ></div>
                  </div>

                  {item.examples && item.examples.length > 0 && (
                    <div className="example-quotes">
                      {item.examples.slice(0, 2).map((ex, j) => (
                        <div key={j} className="quote-item">
                          <span className="quote-bullet">“</span>
                          <span className="quote-text">{ex}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-insight-state">No negative complaints detected.</div>
        )}
      </div>

      {/* Top Praises Card */}
      <div className="insight-column praises-card">
        <div className="insight-card-header">
          <div className="insight-header-left">
            <span className="insight-badge-icon pos">🟢</span>
            <div>
              <h3>Top Customer Praises</h3>
              <p>Key highlights and strengths loved by buyers</p>
            </div>
          </div>
          <span className="insight-total-badge pos">{praises.length} Highlights</span>
        </div>

        {praises && praises.length > 0 ? (
          <div className="insight-items-list">
            {praises.map((item, i) => {
              const widthPct = Math.round((item.count / maxPraise) * 100);
              return (
                <div key={i} className="insight-row praise">
                  <div className="insight-row-top">
                    <div className="topic-rank-wrapper">
                      <span className="rank-tag pos">#{i + 1}</span>
                      <span className="topic-name">{formatTopic(item.topic)}</span>
                    </div>
                    <span className="frequency-badge pos">{item.count} praises</span>
                  </div>

                  <div className="frequency-track">
                    <div
                      className="frequency-bar pos"
                      style={{ width: `${widthPct}%` }}
                    ></div>
                  </div>

                  {item.examples && item.examples.length > 0 && (
                    <div className="example-quotes">
                      {item.examples.slice(0, 2).map((ex, j) => (
                        <div key={j} className="quote-item">
                          <span className="quote-bullet">“</span>
                          <span className="quote-text">{ex}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-insight-state">No positive praises detected yet.</div>
        )}
      </div>
    </div>
  );
}

export default InsightsPanel;
