const VALID_SENTIMENTS = ['positive', 'neutral', 'negative'];

const VALID_TOPICS = ['quality', 'delivery', 'price', 'packaging', 'support', 'size_fit', 'other'];

const TOPIC_SYNONYMS = {
  size: 'size_fit',
  fit: 'size_fit',
  sizing: 'size_fit',
  shipping: 'delivery',
  courier: 'delivery',
  customer_support: 'support',
  service: 'support',
  value: 'price',
  cost: 'price',
  build_quality: 'quality',
  material: 'quality',
  pack: 'packaging',
  box: 'packaging',
};

function validateAnalysisResult(result) {
  const errors = [];

  if (!result || typeof result !== 'object') {
    return { valid: false, data: null, errors: ['Result must be an object'] };
  }

  // Validate sentiment
  let sentiment = result.sentiment;
  if (typeof sentiment === 'string') {
    sentiment = sentiment.trim().toLowerCase();
  }
  if (!VALID_SENTIMENTS.includes(sentiment)) {
    errors.push(`Invalid sentiment: "${result.sentiment}". Must be one of: ${VALID_SENTIMENTS.join(', ')}`);
    sentiment = null;
  }

  // Validate topics
  let topics = result.topics;
  if (typeof topics === 'string') {
    topics = [topics];
  }
  if (!Array.isArray(topics) || topics.length === 0) {
    errors.push('Topics must be a non-empty array');
    topics = [];
  } else {
    topics = topics.map((t) => {
      if (typeof t !== 'string') return 'other';
      const normalized = t.trim().toLowerCase();
      if (VALID_TOPICS.includes(normalized)) return normalized;
      if (TOPIC_SYNONYMS[normalized]) return TOPIC_SYNONYMS[normalized];
      return 'other';
    });
    // Deduplicate
    topics = [...new Set(topics)];
  }

  // Validate summary
  let summary = result.summary;
  if (typeof summary !== 'string' || summary.trim().length === 0) {
    errors.push('Summary must be a non-empty string');
    summary = '';
  } else {
    summary = summary.trim();
  }

  // Validate needs_reply (coerce to boolean)
  let needsReply = result.needs_reply;
  if (typeof needsReply === 'string') {
    needsReply = needsReply.toLowerCase() === 'true' || needsReply === '1';
  } else {
    needsReply = Boolean(needsReply);
  }

  const data = {
    sentiment,
    topics,
    summary,
    needs_reply: needsReply,
  };

  return {
    valid: errors.length === 0,
    data,
    errors,
  };
}

module.exports = {
  VALID_SENTIMENTS,
  VALID_TOPICS,
  TOPIC_SYNONYMS,
  validateAnalysisResult,
};
