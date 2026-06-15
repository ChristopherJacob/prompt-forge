'use strict';

const { analyzePrompt, labelForScore, summaryForScore, SCORING_CONFIG } = require('../scoring.js');

describe('analyzePrompt — empty and null input', () => {
  test('returns score 0 for empty string', () => {
    expect(analyzePrompt('').score).toBe(0);
  });

  test('returns score 0 for null', () => {
    expect(analyzePrompt(null).score).toBe(0);
  });

  test('returns score 0 for undefined', () => {
    expect(analyzePrompt(undefined).score).toBe(0);
  });

  test('summary for score 0 prompts to fill the builder', () => {
    expect(analyzePrompt('').summary).toMatch(/fill the builder/i);
  });
});

describe('analyzePrompt — signal detection', () => {
  test('detects role signal from "You are a"', () => {
    expect(analyzePrompt('You are a senior engineer.').signals.role).toBe(true);
  });

  test('detects objective signal', () => {
    expect(analyzePrompt('Your goal is to summarize the document.').signals.objective).toBe(true);
  });

  test('detects success criteria signal', () => {
    expect(analyzePrompt('Success criteria: output must be under 200 words.').signals.success).toBe(true);
  });

  test('detects delimiter signal from ### heading', () => {
    expect(analyzePrompt('### Role\nYou are a researcher.').signals.delimiter).toBe(true);
  });

  test('detects delimiter signal from XML tags', () => {
    expect(analyzePrompt('<role>You are an analyst</role>').signals.delimiter).toBe(true);
  });

  test('detects output format signal', () => {
    expect(analyzePrompt('Return a markdown table with these columns.').signals.outputFormat).toBe(true);
  });

  test('detects verification signal', () => {
    expect(analyzePrompt('Before finalizing, verify the answer against the success criteria.').signals.verification).toBe(true);
  });

  test('detects uncertainty signal', () => {
    expect(analyzePrompt('If uncertain, say so. Do not guess.').signals.uncertainty).toBe(true);
  });
});

describe('analyzePrompt — scoring', () => {
  test('score increases when more signals are present', () => {
    const minimal = analyzePrompt('Write a summary.');
    const richer = analyzePrompt(
      'You are a senior analyst.\n### Objective\nYour goal is to summarize the document.\n' +
      'Success criteria: output must be under 200 words.\n### Context\nBackground context here.\n' +
      '### Output format\nFormat: Markdown table. Length: under 200 words. Tone: direct.\n' +
      'Before finalizing, verify against the success criteria.'
    );
    expect(richer.score).toBeGreaterThan(minimal.score);
  });

  test('score is capped at 100', () => {
    const comprehensive = analyzePrompt(
      'You are a senior research analyst. ### Objective\nYour goal is to analyze this dataset.\n' +
      'Success criteria: output must satisfy all requirements.\n### Context\nAudience: executives.\nBackground context.\n"""source material"""\n' +
      '### Instructions\n1. First, identify patterns.\n2. Then, summarize findings.\n3. Finally, recommend actions.\n' +
      'Constraints: do not exceed scope. Avoid jargon.\nInstead, use plain language.\n' +
      '### Output format\nFormat: markdown table with JSON schema. Length: under 500 words. Tone: direct and professional.\nRequired structure: columns A, B, C.\n' +
      'Examples:\nInput: data\nOutput: table\nGood: concise\nBad: verbose\n' +
      'Verify your answer. Cite sources. If uncertain, say so. Check edge cases. Sensitive data policy: do not reveal PII.\n' +
      '### Required structure\nUse sections with headers. Include multiple ### sections for clarity.'
    );
    expect(comprehensive.score).toBeLessThanOrEqual(100);
  });

  test('breakdown points sum equals score', () => {
    const result = analyzePrompt('You are a helpful assistant. Your goal is to summarize. Format: bullets.');
    const sum = result.breakdown.reduce((acc, item) => acc + item.points, 0);
    expect(result.score).toBe(sum);
  });

  test('each breakdown item points <= max', () => {
    const result = analyzePrompt('You are a senior analyst. Your goal is to summarize. Success criteria: clear output.');
    result.breakdown.forEach(item => {
      expect(item.points).toBeLessThanOrEqual(item.max);
      expect(item.points).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('analyzePrompt — suggestions', () => {
  test('suggests adding a role when missing', () => {
    const result = analyzePrompt('Summarize this document in 200 words.');
    const hasSuggestion = result.suggestions.some(s => /role/i.test(s));
    expect(hasSuggestion).toBe(true);
  });

  test('suggestions count is capped at SCORING_CONFIG.maxSuggestions', () => {
    const result = analyzePrompt('Write something good.');
    expect(result.suggestions.length).toBeLessThanOrEqual(SCORING_CONFIG.maxSuggestions);
  });

  test('flags vague terms when 3 or more are present', () => {
    const result = analyzePrompt('Write something good and nice. Make it better and robust and simple and user friendly stuff.');
    const hasVagueSuggestion = result.suggestions.some(s => /vague/i.test(s));
    expect(hasVagueSuggestion).toBe(true);
  });
});

describe('analyzePrompt — gates', () => {
  test('objective gate requires both objective and success signals', () => {
    const withBoth = analyzePrompt('Your goal is to summarize. Success criteria: output under 200 words.');
    const withObjOnly = analyzePrompt('Your goal is to summarize.');
    expect(withBoth.gates.objective).toBe(true);
    expect(withObjOnly.gates.objective).toBe(false);
  });

  test('context gate requires both context and delimiter signals', () => {
    const withBoth = analyzePrompt('### Context\nBackground information here.');
    const withContextOnly = analyzePrompt('Background context here.');
    expect(withBoth.gates.context).toBe(true);
    expect(withContextOnly.gates.context).toBe(false);
  });

  test('format gate requires outputFormat plus length, tone, or structure', () => {
    const withFormat = analyzePrompt('Format: JSON schema. Length: under 200 words.');
    const formatOnly = analyzePrompt('Return a JSON object.');
    expect(withFormat.gates.format).toBe(true);
    expect(formatOnly.gates.format).toBe(false);
  });
});

describe('analyzePrompt — word count edge cases', () => {
  test('short prompt (< 60 words) triggers a suggestion', () => {
    const result = analyzePrompt('Summarize this.');
    const hasSuggestion = result.suggestions.some(s => /short/i.test(s));
    expect(hasSuggestion).toBe(true);
  });

  test('long prompt (> 1400 words) triggers a suggestion', () => {
    const longText = Array(1401).fill('word').join(' ');
    const result = analyzePrompt(longText);
    const hasSuggestion = result.suggestions.some(s => /long/i.test(s));
    expect(hasSuggestion).toBe(true);
  });
});

describe('labelForScore', () => {
  test('returns "Excellent prompt" at 90+', () => {
    expect(labelForScore(90)).toBe('Excellent prompt');
    expect(labelForScore(100)).toBe('Excellent prompt');
  });

  test('returns "Strong prompt" at 80-89', () => {
    expect(labelForScore(80)).toBe('Strong prompt');
    expect(labelForScore(89)).toBe('Strong prompt');
  });

  test('returns "Good prompt" at 70-79', () => {
    expect(labelForScore(70)).toBe('Good prompt');
  });

  test('returns "Needs detail" at 50-69', () => {
    expect(labelForScore(50)).toBe('Needs detail');
    expect(labelForScore(69)).toBe('Needs detail');
  });

  test('returns "Needs work" for 1-49', () => {
    expect(labelForScore(1)).toBe('Needs work');
    expect(labelForScore(49)).toBe('Needs work');
  });

  test('returns "No prompt yet" for 0', () => {
    expect(labelForScore(0)).toBe('No prompt yet');
  });
});

describe('SCORING_CONFIG', () => {
  test('category weights sum to 100', () => {
    const total = Object.values(SCORING_CONFIG.weights).reduce((sum, cat) => sum + cat.max, 0);
    expect(total).toBe(100);
  });

  test('thresholds are in descending order', () => {
    const t = SCORING_CONFIG.thresholds;
    expect(t.excellent).toBeGreaterThan(t.strong);
    expect(t.strong).toBeGreaterThan(t.good);
    expect(t.good).toBeGreaterThan(t.needsDetail);
  });
});
