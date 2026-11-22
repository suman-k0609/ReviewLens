import { useState, useMemo } from 'react';

function formatTopic(topic) {
  if (!topic) return '';
  return topic.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const FLAG_CONFIG = {
  duplicate: { label: 'Duplicate', icon: '🔁', color: 'orange' },
  empty_review: { label: 'Empty Text', icon: '📭', color: 'gray' },
  rating_mismatch: { label: 'Mismatch', icon: '⚡', color: 'purple' },
  unknown_rating: { label: 'No Rating', icon: '❓', color: 'gray' },
  invalid_rating: { label: 'Bad Rating', icon: '⚠️', color: 'orange' },
  analysis_failed: { label: 'Failed', icon: '❌', color: 'red' },
};

function ReviewsTable({ reviews = [], products = {} }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProduct, setFilterProduct] = useState('all');
  const [filterSentiment, setFilterSentiment] = useState('all');
  const [filterTopic, setFilterTopic] = useState('all');
  const [quickFilter, setQuickFilter] = useState('all');
  const [replies, setReplies] = useState({});
  const [loadingReply, setLoadingReply] = useState({});
  const [copiedId, setCopiedId] = useState(null);

  // Collect unique products and topics
  const productNames = useMemo(() => {
    const set = new Set();
    reviews.forEach((r) => r.product && set.add(r.product));
    return Array.from(set).sort();
  }, [reviews]);

  const allTopics = useMemo(() => {
    const set = new Set();
    reviews.forEach((r) => {
      if (r.analysis?.topics) r.analysis.topics.forEach((t) => set.add(t));
    });
    return Array.from(set).sort();
  }, [reviews]);

  // Filtering logic
  const filtered = useMemo(() => {
    return reviews.filter((r) => {
      const rid = r.review_id || '';
      const prod = r.product || '';
      const text = (r.review_text || r.text || '').toLowerCase();
      const summary = (r.analysis?.summary || '').toLowerCase();
      const q = searchQuery.toLowerCase().trim();

      // Text search
      if (q && !text.includes(q) && !summary.includes(q) && !prod.toLowerCase().includes(q) && !rid.toLowerCase().includes(q)) {
        return false;
      }

      // Quick filter tabs
      if (quickFilter === 'needs_reply' && !r.analysis?.needs_reply) return false;
      if (quickFilter === 'positive' && r.analysis?.sentiment !== 'positive') return false;
      if (quickFilter === 'negative' && r.analysis?.sentiment !== 'negative') return false;
      if (quickFilter === 'mismatch' && !r.analysis?.rating_mismatch && !r.flags?.includes('rating_mismatch')) return false;
      if (quickFilter === 'duplicate' && !r.flags?.includes('duplicate')) return false;

      // Dropdown filters
      if (filterProduct !== 'all' && prod !== filterProduct) return false;
      if (filterSentiment !== 'all' && r.analysis?.sentiment !== filterSentiment) return false;
      if (filterTopic !== 'all' && !(r.analysis?.topics || []).includes(filterTopic)) return false;

      return true;
    });
  }, [reviews, searchQuery, quickFilter, filterProduct, filterSentiment, filterTopic]);

  const handleGenerateReply = async (review) => {
    const reviewId = review.review_id;
    setLoadingReply((prev) => ({ ...prev, [reviewId]: true }));
    try {
      const res = await fetch(`/api/reviews/${reviewId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          review: {
            review_id: review.review_id,
            product: review.product,
            rating: review.rating,
            review_text: review.review_text,
          },
          analysis: review.analysis,
        }),
      });
      if (!res.ok) throw new Error('Failed to generate reply');
      const data = await res.json();
      setReplies((prev) => ({ ...prev, [reviewId]: data.reply }));
    } catch (err) {
      setReplies((prev) => ({ ...prev, [reviewId]: `Error: ${err.message}` }));
    } finally {
      setLoadingReply((prev) => ({ ...prev, [reviewId]: false }));
    }
  };

  const handleCopy = (reviewId, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(reviewId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportCSV = () => {
    const headers = ['Review ID', 'Product', 'Rating', 'Sentiment', 'Topics', 'Summary', 'Review Text', 'Needs Reply'];
    const rows = filtered.map((r) => [
      `"${r.review_id || ''}"`,
      `"${r.product || ''}"`,
      r.rating !== null ? r.rating : '""',
      `"${r.analysis?.sentiment || ''}"`,
      `"${(r.analysis?.topics || []).join(';')}"`,
      `"${(r.analysis?.summary || '').replace(/"/g, '""')}"`,
      `"${(r.review_text || '').replace(/"/g, '""')}"`,
      r.analysis?.needs_reply ? 'Yes' : 'No',
    ]);
    const csvString = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `reviewlens-analysis-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="table-card-container">
      {/* Controls & Quick Filter Toolbar */}
      <div className="table-toolbar">
        <div className="toolbar-top">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search by keywords, product, summary, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            {searchQuery && (
              <button className="clear-search-btn" onClick={() => setSearchQuery('')}>✕</button>
            )}
          </div>

          <div className="toolbar-actions">
            <button className="btn btn-export" onClick={handleExportCSV}>
              📥 Export Filtered ({filtered.length})
            </button>
          </div>
        </div>

        {/* Quick Filter Pill Buttons */}
        <div className="quick-filter-pills">
          <button
            className={`pill-btn ${quickFilter === 'all' ? 'active' : ''}`}
            onClick={() => setQuickFilter('all')}
          >
            All Reviews ({reviews.length})
          </button>
          <button
            className={`pill-btn warning ${quickFilter === 'needs_reply' ? 'active' : ''}`}
            onClick={() => setQuickFilter('needs_reply')}
          >
            ⚠️ Needs Reply ({reviews.filter((r) => r.analysis?.needs_reply).length})
          </button>
          <button
            className={`pill-btn negative ${quickFilter === 'negative' ? 'active' : ''}`}
            onClick={() => setQuickFilter('negative')}
          >
            😟 Negative ({reviews.filter((r) => r.analysis?.sentiment === 'negative').length})
          </button>
          <button
            className={`pill-btn positive ${quickFilter === 'positive' ? 'active' : ''}`}
            onClick={() => setQuickFilter('positive')}
          >
            😊 Positive ({reviews.filter((r) => r.analysis?.sentiment === 'positive').length})
          </button>
          <button
            className={`pill-btn purple ${quickFilter === 'mismatch' ? 'active' : ''}`}
            onClick={() => setQuickFilter('mismatch')}
          >
            ⚡ Mismatches ({reviews.filter((r) => r.analysis?.rating_mismatch || r.flags?.includes('rating_mismatch')).length})
          </button>
          <button
            className={`pill-btn orange ${quickFilter === 'duplicate' ? 'active' : ''}`}
            onClick={() => setQuickFilter('duplicate')}
          >
            🔁 Duplicates ({reviews.filter((r) => r.flags?.includes('duplicate')).length})
          </button>
        </div>

        {/* Dropdown Filters */}
        <div className="dropdown-filters-row">
          <div className="select-group">
            <label>Product</label>
            <select value={filterProduct} onChange={(e) => setFilterProduct(e.target.value)}>
              <option value="all">All Products ({productNames.length})</option>
              {productNames.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div className="select-group">
            <label>Sentiment</label>
            <select value={filterSentiment} onChange={(e) => setFilterSentiment(e.target.value)}>
              <option value="all">All Sentiments</option>
              <option value="positive">Positive</option>
              <option value="neutral">Neutral</option>
              <option value="negative">Negative</option>
            </select>
          </div>

          <div className="select-group">
            <label>Topic</label>
            <select value={filterTopic} onChange={(e) => setFilterTopic(e.target.value)}>
              <option value="all">All Topics ({allTopics.length})</option>
              {allTopics.map((t) => (
                <option key={t} value={t}>{formatTopic(t)}</option>
              ))}
            </select>
          </div>

          <div className="results-count-chip">
            Showing <strong>{filtered.length}</strong> of {reviews.length} reviews
          </div>
        </div>
      </div>

      {/* Main Reviews Table */}
      <div className="table-wrapper">
        <table className="reviews-table">
          <thead>
            <tr>
              <th style={{ width: '80px' }}>ID</th>
              <th style={{ width: '180px' }}>Product</th>
              <th style={{ width: '110px' }}>Rating</th>
              <th style={{ width: '100px' }}>Sentiment</th>
              <th style={{ width: '140px' }}>Topics</th>
              <th>Analysis & Feedback</th>
              <th style={{ width: '120px' }}>Status Flags</th>
              <th style={{ width: '110px', textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((review) => {
              const rid = review.review_id;
              const analysis = review.analysis || {};
              const flags = [...(review.flags || [])];
              if (analysis.rating_mismatch && !flags.includes('rating_mismatch')) {
                flags.push('rating_mismatch');
              }
              if (analysis.analysis_failed && !flags.includes('analysis_failed')) {
                flags.push('analysis_failed');
              }

              const sentiment = analysis.sentiment || 'neutral';

              return (
                <tr key={rid} className={`review-table-row ${sentiment}`}>
                  <td>
                    <span className="row-id-badge">{rid}</span>
                  </td>
                  <td>
                    <div className="product-cell-name">{review.product || '—'}</div>
                    {review.date && <div className="product-cell-date">{review.date}</div>}
                  </td>
                  <td>
                    {review.rating !== null ? (
                      <div className="star-rating-display">
                        <span className="stars-gold">{'★'.repeat(review.rating)}</span>
                        <span className="stars-muted">{'★'.repeat(Math.max(0, 5 - review.rating))}</span>
                        <span className="rating-num">({review.rating})</span>
                      </div>
                    ) : (
                      <span className="no-rating-pill">No Rating</span>
                    )}
                  </td>
                  <td>
                    <span className={`sentiment-badge-modern ${sentiment}`}>
                      <span className="sentiment-dot"></span>
                      {sentiment}
                    </span>
                  </td>
                  <td>
                    <div className="topics-wrap">
                      {(analysis.topics || []).map((t) => (
                        <span key={t} className="topic-pill">
                          {formatTopic(t)}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="content-cell">
                    {analysis.summary && (
                      <div className="summary-bubble">
                        <span className="summary-bulb">💡</span>
                        <span className="summary-text">{analysis.summary}</span>
                      </div>
                    )}
                    <div className="original-review-box">
                      <span className="quote-mark">“</span>
                      <span>{review.review_text || '(Empty text submitted)'}</span>
                    </div>

                    {/* Expandable Suggested Reply Box */}
                    {replies[rid] && (
                      <div className="suggested-reply-bubble">
                        <div className="reply-header">
                          <span className="reply-label">💬 Suggested Store Reply</span>
                          <button
                            className="copy-reply-btn"
                            onClick={() => handleCopy(rid, replies[rid])}
                          >
                            {copiedId === rid ? '✓ Copied!' : '📋 Copy'}
                          </button>
                        </div>
                        <p className="reply-text">{replies[rid]}</p>
                      </div>
                    )}
                  </td>
                  <td>
                    <div className="flags-cell">
                      {flags.map((f) => {
                        const cfg = FLAG_CONFIG[f] || { label: f, icon: '🏷️', color: 'gray' };
                        return (
                          <span key={f} className={`flag-chip-modern ${cfg.color}`}>
                            {cfg.icon} {cfg.label}
                          </span>
                        );
                      })}
                      {flags.length === 0 && (
                        <span className="flag-clean">✓ Clean</span>
                      )}
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {analysis.needs_reply && !replies[rid] && (
                      <button
                        className="btn-action-reply"
                        disabled={loadingReply[rid]}
                        onClick={() => handleGenerateReply(review)}
                      >
                        {loadingReply[rid] ? (
                          <span className="spinner-mini"></span>
                        ) : (
                          '💬 Reply'
                        )}
                      </button>
                    )}
                    {replies[rid] && (
                      <span className="reply-sent-pill">✓ Generated</span>
                    )}
                    {!analysis.needs_reply && !replies[rid] && (
                      <span className="action-none-pill">—</span>
                    )}
                  </td>
                </tr>
              );
            })}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="empty-table-state">
                  <div className="empty-state-content">
                    <span className="empty-state-icon">🔍</span>
                    <h4>No matching reviews found</h4>
                    <p>Try resetting the search query or adjusting your filters</p>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        setSearchQuery('');
                        setQuickFilter('all');
                        setFilterProduct('all');
                        setFilterSentiment('all');
                        setFilterTopic('all');
                      }}
                    >
                      Clear All Filters
                    </button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ReviewsTable;
