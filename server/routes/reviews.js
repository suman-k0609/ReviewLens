const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const { parseAndCleanCSV } = require('../services/csvParser');
const { getCachedAnalysis, setCachedAnalysis, saveSession, getSession } = require('../services/cache');
const { analyzeReviewBatch, generateReply } = require('../services/aiService');

const router = express.Router();

// Multer config: memory storage, 5MB limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

const BATCH_SIZE = 5;

/**
 * Sleep for a given number of milliseconds.
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Determine expected sentiment from rating.
 */
function expectedSentimentFromRating(rating) {
  if (rating === null || rating === undefined) return null;
  if (rating >= 4) return 'positive';
  if (rating === 3) return 'neutral';
  return 'negative';
}

/**
 * POST /upload — Upload and analyze a CSV file of reviews.
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const csvContent = req.file.buffer.toString('utf-8');
    const fileName = req.file.originalname || 'unknown.csv';

    // Parse CSV
    const { reviews, issues } = parseAndCleanCSV(csvContent);

    if (reviews.length === 0) {
      return res.status(400).json({ error: 'No reviews found in CSV' });
    }

    const sessionId = crypto.randomUUID();

    // Count flags
    const skippedEmpty = reviews.filter((r) => r.flags.includes('empty_review')).length;
    const duplicates = reviews.filter((r) => r.flags.includes('duplicate')).length;

    const stats = {
      aiCalls: 0,
      cacheHits: 0,
      totalTime: 0,
      totalReviews: reviews.length,
      skippedEmpty,
      duplicates,
    };

    const toAnalyze = [];
    const reviewAnalysis = new Array(reviews.length); // parallel array for results

    // Phase 1: Check cache and sort reviews
    for (let i = 0; i < reviews.length; i++) {
      const review = reviews[i];

      if (review.flags.includes('empty_review')) {
        // Default analysis for empty reviews
        reviewAnalysis[i] = {
          sentiment: 'neutral',
          topics: ['other'],
          summary: 'Empty review — skipped',
          needs_reply: false,
          skipped: true,
        };
        continue;
      }

      // Check cache
      const cached = getCachedAnalysis(review.text_hash);
      if (cached) {
        reviewAnalysis[i] = cached;
        stats.cacheHits++;
        continue;
      }

      if (!review.skip_analysis) {
        // Needs AI analysis
        toAnalyze.push({ index: i, review });
      }
      // duplicates that aren't cached yet will be filled in later (pendingFromOriginal)
    }

    // Phase 2: Batch AI analysis
    for (let batchStart = 0; batchStart < toAnalyze.length; batchStart += BATCH_SIZE) {
      const batch = toAnalyze.slice(batchStart, batchStart + BATCH_SIZE);
      const batchReviews = batch.map((item) => item.review);

      const results = await analyzeReviewBatch(batchReviews, stats);

      for (let j = 0; j < batch.length; j++) {
        const { index, review } = batch[j];
        const analysis = results[j] || {
          sentiment: 'neutral',
          topics: ['other'],
          summary: 'Analysis unavailable',
          needs_reply: false,
          analysis_failed: true,
        };

        // Check rating mismatch
        if (review.rating !== null) {
          const expected = expectedSentimentFromRating(review.rating);
          if (expected && expected !== analysis.sentiment) {
            analysis.rating_mismatch = true;
          }
        }

        reviewAnalysis[index] = analysis;

        // Cache the result
        setCachedAnalysis(review.text_hash, review.review_id, review.product, analysis);
      }

      // Delay between batches (not after the last one)
      if (batchStart + BATCH_SIZE < toAnalyze.length) {
        await sleep(1000);
      }
    }

    // Phase 3: Fill in duplicates from cache
    for (let i = 0; i < reviews.length; i++) {
      if (!reviewAnalysis[i]) {
        const review = reviews[i];
        const cached = getCachedAnalysis(review.text_hash);
        if (cached) {
          reviewAnalysis[i] = { ...cached, duplicate: true };
        } else {
          reviewAnalysis[i] = {
            sentiment: 'neutral',
            topics: ['other'],
            summary: 'Could not analyze (duplicate with no cached result)',
            needs_reply: false,
          };
        }
      }
    }

    // Phase 4: Build dashboard
    const analyzedReviews = reviewAnalysis.filter((a) => !a.skipped);
    const totalAnalyzed = analyzedReviews.length;

    const sentimentCounts = { positive: 0, neutral: 0, negative: 0 };
    for (const a of analyzedReviews) {
      if (sentimentCounts[a.sentiment] !== undefined) {
        sentimentCounts[a.sentiment]++;
      }
    }

    const sentimentPercentages = {};
    for (const [key, count] of Object.entries(sentimentCounts)) {
      sentimentPercentages[key] = totalAnalyzed > 0 ? Math.round((count / totalAnalyzed) * 100) : 0;
    }

    const needsReplyCount = analyzedReviews.filter((a) => a.needs_reply).length;

    // Complaints: top 3 negative-sentiment topics
    const complaintTopics = {};
    const praiseTopics = {};

    for (let i = 0; i < reviews.length; i++) {
      const analysis = reviewAnalysis[i];
      if (analysis.skipped) continue;

      const topics = analysis.topics || [];
      if (analysis.sentiment === 'negative') {
        for (const topic of topics) {
          if (!complaintTopics[topic]) complaintTopics[topic] = { count: 0, examples: [] };
          complaintTopics[topic].count++;
          if (complaintTopics[topic].examples.length < 3) {
            complaintTopics[topic].examples.push(analysis.summary);
          }
        }
      }
      if (analysis.sentiment === 'positive') {
        for (const topic of topics) {
          if (!praiseTopics[topic]) praiseTopics[topic] = { count: 0, examples: [] };
          praiseTopics[topic].count++;
          if (praiseTopics[topic].examples.length < 3) {
            praiseTopics[topic].examples.push(analysis.summary);
          }
        }
      }
    }

    const complaints = Object.entries(complaintTopics)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 3)
      .map(([topic, data]) => ({ topic, count: data.count, examples: data.examples }));

    const praises = Object.entries(praiseTopics)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 3)
      .map(([topic, data]) => ({ topic, count: data.count, examples: data.examples }));

    // Rating mismatches
    const ratingMismatches = analyzedReviews.filter((a) => a.rating_mismatch).length;
    const reviewsWithRating = reviews.filter((r) => r.rating !== null).length;
    const ratingAgreement = reviewsWithRating > 0 ? Math.round(((reviewsWithRating - ratingMismatches) / reviewsWithRating) * 100) : 100;

    // Phase 5: Build products object
    const products = {};
    for (let i = 0; i < reviews.length; i++) {
      const review = reviews[i];
      const analysis = reviewAnalysis[i];
      if (analysis.skipped) continue;

      const product = review.product || 'Unknown';
      if (!products[product]) {
        products[product] = {
          sentiment: { positive: 0, neutral: 0, negative: 0 },
          issues: {},
          reviewCount: 0,
        };
      }
      products[product].reviewCount++;
      if (products[product].sentiment[analysis.sentiment] !== undefined) {
        products[product].sentiment[analysis.sentiment]++;
      }

      if (analysis.sentiment === 'negative') {
        for (const topic of analysis.topics || []) {
          products[product].issues[topic] = (products[product].issues[topic] || 0) + 1;
        }
      }
    }

    // Convert products issues to sorted arrays
    const productsFormatted = {};
    for (const [name, data] of Object.entries(products)) {
      productsFormatted[name] = {
        sentiment: data.sentiment,
        reviewCount: data.reviewCount,
        topIssues: Object.entries(data.issues)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([topic, count]) => ({ topic, count })),
      };
    }

    // Phase 6: Prepare reviews with analysis for session save
    const reviewsWithAnalysis = reviews.map((review, i) => ({
      ...review,
      analysis: reviewAnalysis[i],
    }));

    // Save session
    saveSession(sessionId, fileName, reviews.length, stats, reviewsWithAnalysis);

    // Build response
    const response = {
      sessionId,
      fileName,
      stats,
      issues,
      dashboard: {
        totalReviews: reviews.length,
        totalAnalyzed,
        sentimentCounts,
        sentimentPercentages,
        needsReplyCount,
        complaints,
        praises,
        ratingMismatches,
        ratingAgreement,
      },
      products: productsFormatted,
      reviews: reviewsWithAnalysis,
    };

    res.json(response);
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to process CSV file', detail: error.message });
  }
});

/**
 * POST /:reviewId/reply — Generate a reply for a specific review.
 */
router.post('/:reviewId/reply', async (req, res) => {
  try {
    const { review, analysis } = req.body;

    if (!review || !analysis) {
      return res.status(400).json({ error: 'Review and analysis are required' });
    }

    const reply = await generateReply(review, analysis);
    res.json({ reply });
  } catch (error) {
    console.error('Reply generation error:', error);
    res.status(500).json({ error: 'Failed to generate reply', detail: error.message });
  }
});

/**
 * GET /session/:sessionId — Retrieve a saved session.
 */
router.get('/session/:sessionId', (req, res) => {
  try {
    const session = getSession(req.params.sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    res.json(session);
  } catch (error) {
    console.error('Session retrieval error:', error);
    res.status(500).json({ error: 'Failed to retrieve session', detail: error.message });
  }
});

module.exports = router;
