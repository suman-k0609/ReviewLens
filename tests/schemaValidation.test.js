const { validateAnalysisResult, VALID_SENTIMENTS, VALID_TOPICS } = require('../server/utils/schema');

describe('LLM Schema Validation', () => {
  test('approves valid structured JSON', () => {
    const validPayload = {
      sentiment: 'positive',
      topics: ['quality', 'price'],
      summary: 'Durable quality and worth the price.',
      needs_reply: false,
    };

    const result = validateAnalysisResult(validPayload);
    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
    expect(result.data.sentiment).toBe('positive');
    expect(result.data.topics).toEqual(['quality', 'price']);
    expect(result.data.summary).toBe('Durable quality and worth the price.');
    expect(result.data.needs_reply).toBe(false);
  });

  test('rejects invalid sentiment not in allowed list', () => {
    const invalidPayload = {
      sentiment: 'ecstatic', // not positive, neutral, negative
      topics: ['quality'],
      summary: 'Great item.',
      needs_reply: false,
    };

    const result = validateAnalysisResult(invalidPayload);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('Invalid sentiment'))).toBe(true);
  });

  test('normalizes topic synonyms and wraps single string topic into array', () => {
    const payloadWithStringTopic = {
      sentiment: 'negative',
      topics: 'shipping', // synonym for delivery, passed as single string
      summary: 'Package was delayed.',
      needs_reply: true,
    };

    const result = validateAnalysisResult(payloadWithStringTopic);
    expect(result.valid).toBe(true);
    expect(result.data.topics).toEqual(['delivery']);
  });

  test('maps known synonyms correctly and falls back to "other" for unknown topics', () => {
    const payload = {
      sentiment: 'neutral',
      topics: ['fit', 'cost', 'box', 'unknown_gibberish'],
      summary: 'Mixed feelings about size and packaging.',
      needs_reply: false,
    };

    const result = validateAnalysisResult(payload);
    expect(result.valid).toBe(true);
    // 'fit' -> 'size_fit', 'cost' -> 'price', 'box' -> 'packaging', 'unknown_gibberish' -> 'other'
    expect(result.data.topics).toContain('size_fit');
    expect(result.data.topics).toContain('price');
    expect(result.data.topics).toContain('packaging');
    expect(result.data.topics).toContain('other');
  });

  test('coerces needs_reply string representations to boolean', () => {
    const payloadTrue = {
      sentiment: 'negative',
      topics: ['support'],
      summary: 'No response from support.',
      needs_reply: 'true',
    };
    expect(validateAnalysisResult(payloadTrue).data.needs_reply).toBe(true);

    const payloadFalse = {
      sentiment: 'positive',
      topics: ['quality'],
      summary: 'Loved it.',
      needs_reply: 0,
    };
    expect(validateAnalysisResult(payloadFalse).data.needs_reply).toBe(false);
  });

  test('fails when summary is missing or empty', () => {
    const payload = {
      sentiment: 'positive',
      topics: ['quality'],
      summary: '   ',
      needs_reply: false,
    };

    const result = validateAnalysisResult(payload);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('Summary'))).toBe(true);
  });
});
