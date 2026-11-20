function SummaryCards({ dashboard }) {
  const {
    totalAnalyzed,
    sentimentPercentages,
    sentimentCounts,
    needsReplyCount,
    ratingAgreement,
    ratingMismatches,
  } = dashboard;

  return (
    <div>
      <div className="summary-cards">
        <div className="card card-info">
          <div className="card-icon">📊</div>
          <div className="card-number">{totalAnalyzed}</div>
          <div className="card-label">Total Analyzed</div>
        </div>

        <div className="card card-positive">
          <div className="card-icon">😊</div>
          <div className="card-number">{sentimentPercentages.positive}%</div>
          <div className="card-label">Positive</div>
          <div className="card-sub">({sentimentCounts.positive} reviews)</div>
        </div>

        <div className="card card-negative">
          <div className="card-icon">😟</div>
          <div className="card-number">{sentimentPercentages.negative}%</div>
          <div className="card-label">Negative</div>
          <div className="card-sub">({sentimentCounts.negative} reviews)</div>
        </div>

        <div className="card card-neutral">
          <div className="card-icon">⚠️</div>
          <div className="card-number">{needsReplyCount}</div>
          <div className="card-label">Needs Reply</div>
        </div>
      </div>

      {(ratingAgreement != null || (ratingMismatches != null && ratingMismatches > 0)) && (
        <div className="extra-cards">
          {ratingAgreement != null && (
            <div className="card card-info">
              <div className="card-icon">✅</div>
              <div className="card-number">{ratingAgreement}%</div>
              <div className="card-label">Rating Agreement</div>
            </div>
          )}
          {ratingMismatches != null && ratingMismatches > 0 && (
            <div className="card card-negative">
              <div className="card-icon">⚡</div>
              <div className="card-number">{ratingMismatches}</div>
              <div className="card-label">Rating Mismatches</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SummaryCards;
