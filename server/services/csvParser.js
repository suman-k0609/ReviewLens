const crypto = require('crypto');

const WORD_TO_NUMBER = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
};

/**
 * Detect delimiter: comma, semicolon, or tab.
 */
function detectDelimiter(firstLine) {
  const commas = (firstLine.match(/,/g) || []).length;
  const semicolons = (firstLine.match(/;/g) || []).length;
  const tabs = (firstLine.match(/\t/g) || []).length;

  if (semicolons > commas && semicolons > tabs) return ';';
  if (tabs > commas && tabs > semicolons) return '\t';
  return ',';
}

/**
 * Robust RFC 4180 CSV parser supporting multiline fields, quotes, and auto-detected delimiters.
 */
function parseRFC4180(text, delimiter = null) {
  // Strip BOM if present
  let cleanText = text.replace(/^\uFEFF/, '');

  if (!delimiter) {
    const firstLine = cleanText.split(/\r?\n/)[0] || '';
    delimiter = detectDelimiter(firstLine);
  }

  const lines = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let i = 0;

  while (i < cleanText.length) {
    const c = cleanText[i];
    if (inQuotes) {
      if (c === '"') {
        if (i + 1 < cleanText.length && cleanText[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === delimiter) {
        row.push(field);
        field = '';
      } else if (c === '\r') {
        if (i + 1 < cleanText.length && cleanText[i + 1] === '\n') i++;
        row.push(field);
        lines.push(row);
        row = [];
        field = '';
      } else if (c === '\n') {
        row.push(field);
        lines.push(row);
        row = [];
        field = '';
      } else {
        field += c;
      }
    }
    i++;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    lines.push(row);
  }

  // Remove trailing empty rows
  while (lines.length > 0 && lines[lines.length - 1].every((cell) => (cell || '').trim() === '')) {
    lines.pop();
  }

  if (lines.length === 0) return [];

  const headers = lines[0].map((h) => (h || '').trim());
  const records = [];

  for (let r = 1; r < lines.length; r++) {
    const values = lines[r];
    const record = {};
    for (let c = 0; c < headers.length; c++) {
      record[headers[c]] = values[c] !== undefined ? values[c] : '';
    }
    records.push(record);
  }

  return records;
}

/**
 * Generate SHA-256 hash of trimmed lowercase text.
 */
function hashText(text) {
  const normalized = (text || '').trim().toLowerCase();
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

/**
 * Remove HTML tags from text.
 */
function stripHtml(text) {
  if (typeof text !== 'string') return '';
  return text.replace(/<[^>]*>/g, '');
}

/**
 * Normalize a rating value to a number 0-5 or null.
 */
function normalizeRating(rating) {
  if (rating === null || rating === undefined || rating === '') return null;

  // Word numbers
  if (typeof rating === 'string') {
    const lower = rating.trim().toLowerCase();
    if (WORD_TO_NUMBER[lower] !== undefined) {
      return WORD_TO_NUMBER[lower];
    }
    // Numeric string
    const num = Number(lower);
    if (!isNaN(num) && num >= 0 && num <= 5) {
      return num;
    }
    return null;
  }

  if (typeof rating === 'number') {
    if (rating >= 0 && rating <= 5) return rating;
    return null;
  }

  return null;
}

/**
 * Fuzzy getter for row objects by trying multiple aliases case-insensitively.
 */
function getRowValue(row, normalizedMap, candidateKeys) {
  for (const candidate of candidateKeys) {
    const key = candidate.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (normalizedMap[key] !== undefined) {
      return normalizedMap[key];
    }
  }
  return null;
}

/**
 * Parse and clean CSV content.
 * Returns { reviews: cleaned[], issues: {reviewId, issue, detail}[] }
 */
function parseAndCleanCSV(csvContent) {
  // Strip BOM
  const cleanContent = (csvContent || '').replace(/^\uFEFF/, '');

  let records = [];
  try {
    const { parse } = require('csv-parse/sync');
    records = parse(cleanContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
      relax_quotes: true,
      bom: true,
    });
  } catch {
    // Graceful fallback to built-in RFC4180 parser
    records = parseRFC4180(cleanContent);
  }

  const reviews = [];
  const issues = [];
  const seenHashes = new Map(); // hash -> reviewId of first occurrence

  // Pre-analyze headers on first row if available
  let textFallbackKey = null;
  if (records.length > 0) {
    const sampleRow = records[0];
    const keys = Object.keys(sampleRow);

    // If standard review text keys aren't obvious, check which column has the longest string
    const normalizedKeys = keys.map((k) => k.toLowerCase().replace(/[^a-z0-9]/g, ''));
    const hasTextMatch = normalizedKeys.some((k) =>
      ['reviewtext', 'review', 'text', 'comment', 'comments', 'feedback', 'description', 'content', 'body', 'message'].includes(k)
    );

    if (!hasTextMatch && keys.length > 0) {
      // Find key with maximum average character length across first 5 records
      let maxLen = -1;
      for (const k of keys) {
        let totalLen = 0;
        let count = 0;
        for (let r = 0; r < Math.min(records.length, 5); r++) {
          totalLen += String(records[r][k] || '').length;
          count++;
        }
        const avg = totalLen / (count || 1);
        if (avg > maxLen) {
          maxLen = avg;
          textFallbackKey = k;
        }
      }
    }
  }

  for (let i = 0; i < records.length; i++) {
    const row = records[i];

    // Create a normalized lookup map for row keys
    const normalizedMap = {};
    for (const [k, v] of Object.entries(row)) {
      const cleanKey = k.toLowerCase().replace(/[^a-z0-9]/g, '');
      normalizedMap[cleanKey] = v;
    }

    // Extract ID
    const rawId = getRowValue(row, normalizedMap, ['reviewid', 'review_id', 'id', 'uid', 'orderid', 'no', 'number', 'index']);
    const reviewId = (rawId && String(rawId).trim()) || `R${String(i + 1).padStart(3, '0')}`;

    // Extract Product
    const rawProduct = getRowValue(row, normalizedMap, ['product', 'productname', 'product_name', 'item', 'itemname', 'item_name', 'title', 'name', 'category']);
    const product = rawProduct ? String(rawProduct).trim() : '';

    // Extract Date
    const rawDate = getRowValue(row, normalizedMap, ['date', 'createdat', 'created_at', 'timestamp', 'time', 'reviewdate']);
    const date = rawDate ? String(rawDate).trim() : '';

    // Extract Review Text
    let rawText = getRowValue(row, normalizedMap, [
      'reviewtext', 'review_text', 'review', 'text', 'comment', 'comments',
      'feedback', 'description', 'content', 'body', 'message', 'customerreview', 'details'
    ]);

    if (rawText === null && textFallbackKey && row[textFallbackKey] !== undefined) {
      rawText = row[textFallbackKey];
    }

    let reviewText = stripHtml(rawText !== null && rawText !== undefined ? String(rawText) : '').trim();

    const review = {
      review_id: reviewId,
      product,
      date,
      review_text: reviewText,
      rating: null,
      flags: [],
      skip_analysis: false,
    };

    // Check empty review
    if (!reviewText || reviewText.length === 0) {
      review.flags.push('empty_review');
      review.skip_analysis = true;
      issues.push({ reviewId, issue: 'empty_review', detail: 'Review text is empty' });
    }

    // Normalize rating
    const rawRating = getRowValue(row, normalizedMap, ['rating', 'ratings', 'stars', 'star', 'score', 'rate', 'starrating', 'points']);
    review.rating = normalizeRating(rawRating);

    if (rawRating !== undefined && rawRating !== null && String(rawRating).trim() !== '' && review.rating === null) {
      review.flags.push('invalid_rating');
      issues.push({ reviewId, issue: 'invalid_rating', detail: `Could not parse rating: "${rawRating}"` });
    }
    if (review.rating === null) {
      review.flags.push('unknown_rating');
      issues.push({ reviewId, issue: 'unknown_rating', detail: 'Rating is missing or could not be determined' });
    }

    // Duplicate detection by text hash
    if (reviewText && reviewText.length > 0) {
      const textHash = hashText(reviewText);
      review.text_hash = textHash;

      if (seenHashes.has(textHash)) {
        review.flags.push('duplicate');
        review.skip_analysis = true;
        review.duplicate_of = seenHashes.get(textHash);
        issues.push({ reviewId, issue: 'duplicate', detail: `Duplicate of review ${seenHashes.get(textHash)}` });
      } else {
        seenHashes.set(textHash, reviewId);
      }
    } else {
      review.text_hash = hashText('');
    }

    reviews.push(review);
  }

  return { reviews, issues };
}

module.exports = {
  parseAndCleanCSV,
  parseRFC4180,
  hashText,
  normalizeRating,
  stripHtml,
};
