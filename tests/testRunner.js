const fs = require('fs');
const path = require('path');

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
  return lines;
}

const csvPath = path.join(__dirname, '..', 'reviews.csv');
const content = fs.readFileSync(csvPath, 'utf8');
const rows = parseRFC4180(content);
console.log('Total rows parsed:', rows.length);
console.log('Header:', rows[0]);
console.log('Row 1 (R001):', rows[1]);
console.log('Row 30 (R030):', rows[30]);
