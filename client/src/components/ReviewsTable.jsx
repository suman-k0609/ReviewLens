import { useState, useMemo } from 'react';

function formatTopic(topic) {
  if (!topic) return '';
  return topic.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const FLAG_LABELS = {
  duplicate: '🔁 Duplicate',
  empty_review: '📭 Empty',
  rating_mismatch: '⚡ Mismatch',
  unknown_rating: '❓ No Rating',
  invalid_rating: '⚠️ Bad Rating',
  analysis_failed: '❌ Failed',
};

function ReviewsTable({ reviews, products }) {
  const [filterProduct, setFilterProduct] = useState('all');
  const [filterSentiment, setFilterSentiment] = useState('all');
  const [filterTopic, setFilterTopic] = useState('all');
  const [replies, setReplies] = useState({});
  const [loadingReply, setLoadingReply] = useState({});

  // Collect unique products and topics from the reviews
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

  // Apply filters
  const filtered = useMemo(() => {
    return reviews.filter((r) => {
      if (filterProduct !== 'all' && r.product !== filterProduct) return false;
      if (filterSentiment !== 'all' && r.analysis?.sentiment !== filterSentiment) return false;
      if (filterTopic !== 'all' && !(r.analysis?.topics || []).includes(filterTopic)) return false;
      return true;
    });
  }, [reviews, filterProduct, filterSentiment, filterTopic]);

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

  return (
    <div>
      <div className="filters-bar">
        <label>Product:</label>
        <select value={filterProduct} onChange={(e) => setFilterProduct(e.target.value)}>
          <option value="all">All Products</option>
          {productNames.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>

        <label>Sentiment:</label>
        <select value={filterSentiment} onChange={(e) => setFilterSentiment(e.target.value)}>
          <option value="all">All Sentiments</option>
          <option value="positive">Positive</option>
          <option value="neutral">Neutral</option>
          <option value="negative">Negative</option>
        </select>

        <label>Topic:</label>
        <select value={filterTopic} onChange={(e) => setFilterTopic(e.target.value)}>
          <option value="all">All Topics</option>
          {allTopics.map((t) => (
            <option key={t} value={t}>{formatTopic(t)}</option>
          ))}
        </select>

        <span style={{ marginLeft: 'auto', fontSize: '0.85rem', color: '#64748b' }}>
          Showing <strong>{filtered.length}</strong> of {reviews.length} reviews
        </span>
      </div>

      <div className="table-wrapper">
        <table className="reviews-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Product</th>
              <th>Rating</th>
              <th>Sentiment</th>
              <th>Topics</th>
              <th>Original & Summary</th>
              <th>Flags</th>
              <th>Action</th>
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

              return (
                <tr key={rid}>
                  <td style={{ fontFamily: 'monospace', fontWeight: '600', fontSize: '0.8rem' }}>{rid}</td>
                  <td><strong>{review.product || '—'}</strong></td>
                  <td>
                    {review.rating != null ? (
                      <span>{'⭐'.repeat(review.rating)} ({review.rating})</span>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>—</span>
                    )}
                  </td>
                  <td>
                    {analysis.sentiment ? (
                      <span className={`sentiment-badge ${analysis.sentiment}`}>
                        {analysis.sentiment}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {(analysis.topics || []).map((t) => (
                        <span key={t} className="topic-tag">{formatTopic(t)}</span>
                      ))}
                    </div>
                  </td>
                  <td style={{ maxWidth: '320px', fontSize: '0.82rem' }}>
                    {analysis.summary && (
                      <div style={{ fontWeight: '600', color: '#1e293b', marginBottom: '4px' }}>
                        💡 {analysis.summary}
                      </div>
                    )}
                    <div style={{ fontSize: '0.78rem', color: '#64748b', fontStyle: 'italic', wordBreak: 'break-word' }}>
                      "{review.review_text || '(Empty text)'}"
                    </div>
                    {replies[rid] && (
                      <div className="reply-box">
                        <strong>💬 Suggested Reply:</strong>
                        <p style={{ margin: '4px 0 0 0' }}>{replies[rid]}</p>
                      </div>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {flags.map((f) => (
                        <span
                          key={f}
                          className={`flag-badge${f === 'analysis_failed' || f === 'rating_mismatch' ? ' error-flag' : ''}`}
                        >
                          {FLAG_LABELS[f] || f}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    {analysis.needs_reply && !replies[rid] && (
                      <button
                        className="reply-btn"
                        disabled={loadingReply[rid]}
                        onClick={() => handleGenerateReply(review)}
                      >
                        {loadingReply[rid] ? 'Generating…' : '💬 Reply'}
                      </button>
                    )}
                    {replies[rid] && (
                      <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 'bold' }}>✓ Replied</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                  No reviews match the current filters.
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
