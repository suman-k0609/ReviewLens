function SummaryCards({ dashboard }) {
  const {
    totalAnalyzed = 0,
    sentimentPercentages = { positive: 0, neutral: 0, negative: 0 },
    sentimentCounts = { positive: 0, neutral: 0, negative: 0 },
    needsReplyCount = 0,
    ratingAgreement = 100,
    ratingMismatches = 0,
  } = dashboard;

  const posPct = sentimentPercentages.positive || 0;
  const neuPct = sentimentPercentages.neutral || 0;
  const negPct = sentimentPercentages.negative || 0;

  return (
    <div className="summary-section">
      {/* Horizontal Sentiment Visual Breakdown Bar */}
      <div className="sentiment-overview-card">
        <div className="sentiment-overview-header">
          <div className="overview-title">
            <span className="overview-icon">📊</span>
            <div>
              <h3>Overall Sentiment Breakdown</h3>
              <p>Aggregated customer perception across all {totalAnalyzed} analyzed reviews</p>
            </div>
          </div>
          <div className="sentiment-legend">
            <span className="legend-chip pos">
              <span className="dot"></span> Positive {posPct}% ({sentimentCounts.positive || 0})
            </span>
            <span className="legend-chip neu">
              <span className="dot"></span> Neutral {neuPct}% ({sentimentCounts.neutral || 0})
            </span>
            <span className="legend-chip neg">
              <span className="dot"></span> Negative {negPct}% ({sentimentCounts.negative || 0})
            </span>
          </div>
        </div>

        <div className="segmented-progress-bar">
          <div
            className="segment pos"
            style={{ width: `${posPct}%` }}
            title={`Positive: ${posPct}%`}
          ></div>
          <div
            className="segment neu"
            style={{ width: `${neuPct}%` }}
            title={`Neutral: ${neuPct}%`}
          ></div>
          <div
            className="segment neg"
            style={{ width: `${negPct}%` }}
            title={`Negative: ${negPct}%`}
          ></div>
        </div>
      </div>

      {/* Main KPI Cards Grid */}
      <div className="summary-cards">
        <div className="kpi-card kpi-total">
          <div className="kpi-header">
            <span className="kpi-label">Total Analyzed</span>
            <span className="kpi-icon">📈</span>
          </div>
          <div className="kpi-value">{totalAnalyzed}</div>
          <div className="kpi-footer">
            <span className="kpi-badge neutral">100% Processed</span>
            <span className="kpi-sub">Cleaned & deduplicated</span>
          </div>
        </div>

        <div className="kpi-card kpi-pos">
          <div className="kpi-header">
            <span className="kpi-label">Positive Sentiment</span>
            <span className="kpi-icon">✨</span>
          </div>
          <div className="kpi-value">{posPct}<span>%</span></div>
          <div className="kpi-footer">
            <span className="kpi-badge positive">{sentimentCounts.positive || 0} reviews</span>
            <span className="kpi-sub">Satisfied customers</span>
          </div>
        </div>

        <div className="kpi-card kpi-neg">
          <div className="kpi-header">
            <span className="kpi-label">Negative Sentiment</span>
            <span className="kpi-icon">⚠️</span>
          </div>
          <div className="kpi-value">{negPct}<span>%</span></div>
          <div className="kpi-footer">
            <span className="kpi-badge negative">{sentimentCounts.negative || 0} reviews</span>
            <span className="kpi-sub">Critical feedback</span>
          </div>
        </div>

        <div className="kpi-card kpi-reply">
          <div className="kpi-header">
            <span className="kpi-label">Action Required</span>
            <span className="kpi-icon">💬</span>
          </div>
          <div className="kpi-value">{needsReplyCount}</div>
          <div className="kpi-footer">
            <span className="kpi-badge warning">{needsReplyCount > 0 ? 'Pending replies' : 'All clear'}</span>
            <span className="kpi-sub">Complaints & tickets</span>
          </div>
        </div>
      </div>

      {/* Bonus Metrics: Rating Agreement & Mismatches */}
      {(ratingAgreement != null || ratingMismatches > 0) && (
        <div className="bonus-kpi-row">
          <div className="bonus-kpi-card">
            <div className="bonus-icon">🎯</div>
            <div className="bonus-info">
              <span className="bonus-title">Star Rating vs Sentiment Agreement</span>
              <span className="bonus-desc">Measures how accurately customer star ratings align with true text sentiment</span>
            </div>
            <div className="bonus-metric-pill agreement">
              {ratingAgreement}% Agreement
            </div>
          </div>

          {ratingMismatches > 0 && (
            <div className="bonus-kpi-card mismatch">
              <div className="bonus-icon">⚡</div>
              <div className="bonus-info">
                <span className="bonus-title">{ratingMismatches} Rating Mismatches Detected</span>
                <span className="bonus-desc">E.g., 5-star rating with scathing text, or 1-star with positive text</span>
              </div>
              <div className="bonus-metric-pill mismatch">
                {ratingMismatches} Discrepancies
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SummaryCards;
