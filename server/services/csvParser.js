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
 * Robust RFC 4180 CSV parser supporting multiline fields, quotes, and commas.
 */
function parseRFC4180(text) {
  const lines = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
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
      } else if (c === ',') {
        row.push(field);
        field = '';
      } else if (c === '\r') {
        if (i + 1 < text.length && text[i + 1] === '\n') i++;
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
  while (lines.length > 0 && lines[lines.length - 1].every((cell) => cell.trim() === '')) {
    lines.pop();
  }

  if (lines.length === 0) return [];

  const headers = lines[0].map((h) => h.trim());
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
 * Parse and clean CSV content.
 * Returns { reviews: cleaned[], issues: {reviewId, issue, detail}[] }
 */
function parseAndCleanCSV(csvContent) {
  let records = [];

  try {
    const { parse } = require('csv-parse/sync');
    records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
      relax_quotes: true,
    });
  } catch {
    // Graceful fallback to built-in RFC4180 parser
    records = parseRFC4180(csvContent);
  }

  const reviews = [];
  const issues = [];
  const seenHashes = new Map(); // hash -> reviewId of first occurrence

  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    const reviewId = row.review_id || row.id || `R${String(i + 1).padStart(3, '0')}`;
    const product = row.product || row.product_name || '';
    const date = row.date || '';

    // Strip HTML from review text
    let reviewText = stripHtml(row.review_text || row.text || row.review || '');

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
    if (!reviewText || reviewText.trim().length === 0) {
      review.flags.push('empty_review');
      review.skip_analysis = true;
      issues.push({ reviewId, issue: 'empty_review', detail: 'Review text is empty' });
    }

    // Normalize rating
    const rawRating = row.rating || row.stars || row.score;
    review.rating = normalizeRating(rawRating);
    if (rawRating !== undefined && rawRating !== null && rawRating !== '' && review.rating === null) {
      review.flags.push('invalid_rating');
      issues.push({ reviewId, issue: 'invalid_rating', detail: `Could not parse rating: "${rawRating}"` });
    }
    if (review.rating === null) {
      review.flags.push('unknown_rating');
      issues.push({ reviewId, issue: 'unknown_rating', detail: 'Rating is missing or could not be determined' });
    }

    // Duplicate detection by text hash
    if (reviewText && reviewText.trim().length > 0) {
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
