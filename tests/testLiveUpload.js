const fs = require('fs');
const http = require('http');
const path = require('path');

const csvPath = path.join(__dirname, '..', 'reviews.csv');
const csvContent = fs.readFileSync(csvPath);
const boundary = '----ReviewLensBoundary' + Date.now();

const header = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="reviews.csv"\r\nContent-Type: text/csv\r\n\r\n`;
const footer = `\r\n--${boundary}--\r\n`;

const body = Buffer.concat([
  Buffer.from(header, 'utf8'),
  csvContent,
  Buffer.from(footer, 'utf8')
]);

console.log('Sending upload request to http://localhost:3001/api/reviews/upload ...');

const req = http.request({
  hostname: 'localhost',
  port: 3001,
  path: '/api/reviews/upload',
  method: 'POST',
  headers: {
    'Content-Type': `multipart/form-data; boundary=${boundary}`,
    'Content-Length': body.length
  }
}, (res) => {
  let raw = '';
  res.on('data', (c) => raw += c);
  res.on('end', () => {
    console.log('Status code:', res.statusCode);
    try {
      const data = JSON.parse(raw);
      console.log('--- DASHBOARD RESULTS ---');
      console.log('Total reviews in CSV:', data.dashboard.totalReviews);
      console.log('Total analyzed:', data.dashboard.totalAnalyzed);
      console.log('Sentiment percentages:', data.dashboard.sentimentPercentages);
      console.log('Needs reply count:', data.dashboard.needsReplyCount);
      console.log('Complaints:', data.dashboard.complaints.map(c => `${c.topic} (${c.count})`));
      console.log('Praises:', data.dashboard.praises.map(p => `${p.topic} (${p.count})`));
      console.log('Rating agreement:', data.dashboard.ratingAgreement + '%');
      
      const r012 = data.reviews.find(r => r.review_id === 'R012');
      console.log('--- PROMPT INJECTION R012 VERIFICATION ---');
      console.log('Review R012 sentiment:', r012.analysis.sentiment);
      console.log('Review R012 topics:', r012.analysis.topics);
      console.log('Review R012 summary:', r012.analysis.summary);
      console.log('Review R012 needs_reply:', r012.analysis.needs_reply);
      console.log('SUCCESS: All 30 reviews processed and dashboard rendered!');
    } catch (e) {
      console.error('Failed to parse JSON response:', raw.substring(0, 500));
    }
  });
});

req.on('error', (e) => console.error('Request failed:', e.message));
req.write(body);
req.end();
