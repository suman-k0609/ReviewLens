const path = require('path');
const fs = require('fs');

// Ensure data directory exists
const dataDir = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'cache.db');
const jsonStorePath = path.join(dataDir, 'cache.json');

let db = null;
let useJsonFallback = false;

try {
  const Database = require('better-sqlite3');
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS review_cache (
      text_hash TEXT PRIMARY KEY,
      review_id TEXT,
      product TEXT,
      analysis TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      session_id TEXT PRIMARY KEY,
      file_name TEXT,
      total_reviews INTEGER,
      stats TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS session_reviews (
      session_id TEXT,
      review_id TEXT,
      text_hash TEXT,
      review_data TEXT,
      analysis TEXT,
      PRIMARY KEY (session_id, review_id)
    );
  `);
} catch (e) {
  // If better-sqlite3 is not available, gracefully use JSON file store
  useJsonFallback = true;
}

// Helpers for JSON fallback
function loadJsonStore() {
  if (!fs.existsSync(jsonStorePath)) {
    return { review_cache: {}, sessions: {}, session_reviews: {} };
  }
  try {
    return JSON.parse(fs.readFileSync(jsonStorePath, 'utf8'));
  } catch {
    return { review_cache: {}, sessions: {}, session_reviews: {} };
  }
}

function saveJsonStore(store) {
  fs.writeFileSync(jsonStorePath, JSON.stringify(store, null, 2), 'utf8');
}

/**
 * Get cached analysis for a text hash.
 * @returns parsed analysis object or null
 */
function getCachedAnalysis(textHash) {
  if (!textHash) return null;

  if (!useJsonFallback && db) {
    try {
      const row = db.prepare('SELECT analysis FROM review_cache WHERE text_hash = ?').get(textHash);
      if (!row) return null;
      return JSON.parse(row.analysis);
    } catch {
      // Fallback
    }
  }

  const store = loadJsonStore();
  const cached = store.review_cache[textHash];
  return cached ? cached.analysis : null;
}

/**
 * Cache an analysis result.
 */
function setCachedAnalysis(textHash, reviewId, product, analysis) {
  if (!textHash) return;

  if (!useJsonFallback && db) {
    try {
      db.prepare(
        'INSERT OR REPLACE INTO review_cache (text_hash, review_id, product, analysis) VALUES (?, ?, ?, ?)'
      ).run(textHash, reviewId, product, JSON.stringify(analysis));
      return;
    } catch {
      // Fallback
    }
  }

  const store = loadJsonStore();
  store.review_cache[textHash] = {
    review_id: reviewId,
    product,
    analysis,
    created_at: new Date().toISOString(),
  };
  saveJsonStore(store);
}

/**
 * Save a full session with all reviews and their analyses.
 */
function saveSession(sessionId, fileName, totalReviews, stats, reviewsWithAnalysis) {
  if (!useJsonFallback && db) {
    try {
      const insertSessionStmt = db.prepare(
        'INSERT OR REPLACE INTO sessions (session_id, file_name, total_reviews, stats) VALUES (?, ?, ?, ?)'
      );
      const insertSessionReviewStmt = db.prepare(
        'INSERT OR REPLACE INTO session_reviews (session_id, review_id, text_hash, review_data, analysis) VALUES (?, ?, ?, ?, ?)'
      );

      const txn = db.transaction(() => {
        insertSessionStmt.run(sessionId, fileName, totalReviews, JSON.stringify(stats));
        for (const item of reviewsWithAnalysis) {
          insertSessionReviewStmt.run(
            sessionId,
            item.review_id,
            item.text_hash || '',
            JSON.stringify(item),
            JSON.stringify(item.analysis || {})
          );
        }
      });
      txn();
      return;
    } catch {
      // Fallback
    }
  }

  const store = loadJsonStore();
  store.sessions[sessionId] = {
    session_id: sessionId,
    file_name: fileName,
    total_reviews: totalReviews,
    stats,
    created_at: new Date().toISOString(),
  };

  store.session_reviews[sessionId] = reviewsWithAnalysis.map((item) => ({
    session_id: sessionId,
    review_id: item.review_id,
    text_hash: item.text_hash || '',
    review_data: item,
    analysis: item.analysis || {},
  }));

  saveJsonStore(store);
}

/**
 * Get a session by ID, with parsed reviews.
 */
function getSession(sessionId) {
  if (!useJsonFallback && db) {
    try {
      const session = db.prepare('SELECT * FROM sessions WHERE session_id = ?').get(sessionId);
      if (session) {
        const reviewRows = db.prepare('SELECT * FROM session_reviews WHERE session_id = ?').all(sessionId);
        const reviews = reviewRows.map((row) => {
          let reviewData = {};
          let analysis = {};
          try { reviewData = JSON.parse(row.review_data); } catch {}
          try { analysis = JSON.parse(row.analysis); } catch {}
          return {
            review_id: row.review_id,
            text_hash: row.text_hash,
            ...reviewData,
            analysis,
          };
        });

        let stats = {};
        try { stats = JSON.parse(session.stats); } catch {}

        return {
          session_id: session.session_id,
          file_name: session.file_name,
          total_reviews: session.total_reviews,
          stats,
          created_at: session.created_at,
          reviews,
        };
      }
    } catch {
      // Fallback
    }
  }

  const store = loadJsonStore();
  const session = store.sessions[sessionId];
  if (!session) return null;

  const rows = store.session_reviews[sessionId] || [];
  const reviews = rows.map((r) => ({
    ...r.review_data,
    analysis: r.analysis,
  }));

  return {
    ...session,
    reviews,
  };
}

module.exports = {
  getCachedAnalysis,
  setCachedAnalysis,
  saveSession,
  getSession,
};
