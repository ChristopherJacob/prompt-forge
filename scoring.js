(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    var exports = factory();
    root.SCORING_CONFIG = exports.SCORING_CONFIG;
    root.analyzePrompt = exports.analyzePrompt;
    root.labelForScore = exports.labelForScore;
    root.summaryForScore = exports.summaryForScore;
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var SCORING_CONFIG = {
    thresholds: { excellent: 90, strong: 80, good: 70, needsDetail: 50 },
    maxSuggestions: 8,
    vagueTerms: [
      'stuff', 'things', 'good', 'nice', 'better', 'quickly', 'asap', 'simple',
      'robust', 'user friendly', 'best', 'great', 'interesting', 'make it pop',
      'somehow', 'various', 'etc'
    ],
    weights: {
      roleObjective: { max: 15, role: 4, objective: 6, success: 5 },
      contextInputs: { max: 15, context: 6, audience: 4, delimiter: 5 },
      specificInstructions: { max: 15, instructions: 7, constraints: 5, positiveGuidance: 3 },
      outputContract: { max: 15, outputFormat: 6, length: 3, tone: 3, structure: 3 },
      examples: { max: 10, single: 7, multiple: 3 },
      reliability: { max: 15, verification: 4, evidence: 3, uncertainty: 3, edgeCases: 2, safety: 3 },
      structure: { max: 10, delimiter: 5, clearStart: 3, multipleSections: 2 },
      clarity: { max: 5, minWords: 2, underLimit: 1, lowVague: 2 }
    },
    wordLimits: { min: 60, max: 1400 },
    copyGateThreshold: 70
  };

  function hasAny(text, patterns) {
    return patterns.some(function (pattern) { return pattern.test(text); });
  }

  function countMatches(text, regex) {
    var match = text.match(regex);
    return match ? match.length : 0;
  }

  function cap(value, max) {
    return Math.min(max, Math.max(0, value));
  }

  function analyzePrompt(rawText) {
    var text = String(rawText || '').trim();
    var lower = text.toLowerCase();
    var wordCount = text ? text.split(/\s+/).length : 0;
    var suggestions = [];
    var w = SCORING_CONFIG.weights;
    var vague = SCORING_CONFIG.vagueTerms;

    var signals = {
      role: hasAny(lower, [/\byou are\b/, /\bact as\b/, /\brole\b/, /<role>/]),
      objective: hasAny(lower, [/\bobjective\b/, /\bgoal\b/, /\btask\b/, /\byour task\b/, /\byou will\b/, /\baccomplish\b/]),
      success: hasAny(lower, [/success criteria/, /success looks like/, /acceptance criteria/, /done when/, /quality bar/, /must satisfy/, /rubric/]),
      audience: hasAny(lower, [/audience/, /stakeholder/, /reader/, /user persona/, /customer/, /executive/, /developer/, /client/]),
      context: hasAny(lower, [/context/, /background/, /situation/, /source material/, /input/, /data/, /constraints/, /assumptions/]),
      delimiter: hasAny(text, [/###/, /"""/, /```/, /<\/?[a-z][a-z0-9_-]*>/i]),
      instructions: hasAny(lower, [/instructions/, /steps/, /do the following/, /requirements/, /first\b/, /then\b/, /finally\b/]) || countMatches(text, /^\s*(\d+[.)]|[-*])\s+/gm) >= 2,
      constraints: hasAny(lower, [/constraints/, /non-goals/, /must\b/, /should\b/, /only\b/, /avoid\b/, /do not\b/, /deadline/, /scope/, /requirements/]),
      outputFormat: hasAny(lower, [/output format/, /format:/, /json/, /schema/, /markdown table/, /table/, /bullets?/, /checklist/, /sections?/, /fields?/, /csv/, /yaml/]),
      length: hasAny(lower, [/\bwords?\b/, /\bsentences?\b/, /\bparagraphs?\b/, /\btokens?\b/, /length:/, /no more than/, /under \d+/, /at least \d+/, /concise/, /brief/]),
      tone: hasAny(lower, [/tone/, /style/, /voice/, /formal/, /casual/, /professional/, /friendly/, /direct/, /plain language/, /technical/, /executive/]),
      structure: hasAny(lower, [/required structure/, /include these sections/, /columns?/, /keys?/, /fields?/, /schema/, /template/]),
      examples: hasAny(lower, [/example/, /few-shot/, /multishot/, /input:/, /output:/, /good:/, /bad:/, /<example>/, /desired format/]),
      verification: hasAny(lower, [/verify/, /validate/, /self-check/, /check your work/, /quality checks?/, /test criteria/, /review against/]),
      evidence: hasAny(lower, [/cite/, /citation/, /sources?/, /evidence/, /unsupported claims?/, /quote/, /reference/]),
      uncertainty: hasAny(lower, [/uncertain/, /uncertainty/, /i don't know/, /unknown/, /confidence/, /assumption/, /do not guess/, /null for missing/]),
      edgeCases: hasAny(lower, [/edge cases?/, /failure modes?/, /exceptions?/, /risks?/, /tradeoffs?/]),
      safety: hasAny(lower, [/sensitive/, /privacy/, /pii/, /personal data/, /confidential/, /security/, /prompt injection/, /policy/]),
      positiveGuidance: !hasAny(lower, [/do not/, /don't/, /avoid/]) || hasAny(lower, [/instead/, /prefer/, /replace/, /use .* rather than/, /do .* instead/])
    };

    var vagueHits = vague.filter(function (term) {
      return lower.indexOf(term) !== -1;
    });

    var breakdown = [
      {
        key: 'roleObjective',
        label: 'Role, objective, success',
        max: w.roleObjective.max,
        points: cap((signals.role ? w.roleObjective.role : 0) + (signals.objective ? w.roleObjective.objective : 0) + (signals.success ? w.roleObjective.success : 0), w.roleObjective.max)
      },
      {
        key: 'contextInputs',
        label: 'Context and inputs',
        max: w.contextInputs.max,
        points: cap((signals.context ? w.contextInputs.context : 0) + (signals.audience ? w.contextInputs.audience : 0) + (signals.delimiter ? w.contextInputs.delimiter : 0), w.contextInputs.max)
      },
      {
        key: 'specificInstructions',
        label: 'Specific instructions',
        max: w.specificInstructions.max,
        points: cap((signals.instructions ? w.specificInstructions.instructions : 0) + (signals.constraints ? w.specificInstructions.constraints : 0) + (signals.positiveGuidance ? w.specificInstructions.positiveGuidance : 0), w.specificInstructions.max)
      },
      {
        key: 'outputContract',
        label: 'Output contract',
        max: w.outputContract.max,
        points: cap((signals.outputFormat ? w.outputContract.outputFormat : 0) + (signals.length ? w.outputContract.length : 0) + (signals.tone ? w.outputContract.tone : 0) + (signals.structure ? w.outputContract.structure : 0), w.outputContract.max)
      },
      {
        key: 'examples',
        label: 'Examples',
        max: w.examples.max,
        points: cap((signals.examples ? w.examples.single : 0) + (countMatches(lower, /input:|output:|good:|bad:|<example>/g) >= 2 ? w.examples.multiple : 0), w.examples.max)
      },
      {
        key: 'reliability',
        label: 'Reliability and safety',
        max: w.reliability.max,
        points: cap((signals.verification ? w.reliability.verification : 0) + (signals.evidence ? w.reliability.evidence : 0) + (signals.uncertainty ? w.reliability.uncertainty : 0) + (signals.edgeCases ? w.reliability.edgeCases : 0) + (signals.safety ? w.reliability.safety : 0), w.reliability.max)
      },
      {
        key: 'structure',
        label: 'Prompt structure',
        max: w.structure.max,
        points: cap((signals.delimiter ? w.structure.delimiter : 0) + (/^(###|<role>|role:|you are|act as|objective:|task:)/i.test(text) ? w.structure.clearStart : 0) + (countMatches(text, /^###|^<[a-z]/gmi) >= 4 ? w.structure.multipleSections : 0), w.structure.max)
      },
      {
        key: 'clarity',
        label: 'Clarity and precision',
        max: w.clarity.max,
        points: cap((wordCount >= SCORING_CONFIG.wordLimits.min ? w.clarity.minWords : 0) + (wordCount <= SCORING_CONFIG.wordLimits.max ? w.clarity.underLimit : 0) + (vagueHits.length <= 2 ? w.clarity.lowVague : 0), w.clarity.max)
      }
    ];

    var score = breakdown.reduce(function (sum, item) { return sum + item.points; }, 0);
    if (!text) score = 0;
    score = cap(score, 100);

    var gates = {
      objective: Boolean(signals.objective && signals.success),
      context: Boolean(signals.context && signals.delimiter),
      format: Boolean(signals.outputFormat && (signals.length || signals.tone || signals.structure)),
      quality: Boolean(signals.verification && (signals.uncertainty || signals.evidence || signals.safety))
    };

    if (wordCount > SCORING_CONFIG.wordLimits.max) suggestions.push('This prompt is long. Move reusable background to a separate knowledge base or trim duplicated instructions.');
    if (wordCount > 0 && wordCount < SCORING_CONFIG.wordLimits.min) suggestions.push('This prompt is short. Add context, success criteria, output format, and quality checks.');
    if (vagueHits.length > 2) suggestions.push('Replace vague terms like ' + vagueHits.slice(0, 4).join(', ') + ' with measurable requirements.');
    if (!signals.role) suggestions.push('Add an AI role or expertise statement, such as "You are a senior analyst...".');
    if (!signals.objective) suggestions.push('State the primary objective near the top of the prompt.');
    if (!signals.success) suggestions.push('Define success criteria so the model has a target to optimize for.');
    if (!signals.context) suggestions.push('Add context: audience, situation, constraints, assumptions, and input material.');
    if (!signals.delimiter) suggestions.push('Separate instructions and context with ### headings, XML-style tags, triple quotes, or code fences.');
    if (!signals.instructions) suggestions.push('Use numbered steps or bullets for the actions the model must perform.');
    if (!signals.outputFormat) suggestions.push('Specify the desired output format, such as JSON, table, sections, checklist, or email.');
    if (!signals.length) suggestions.push('Add a length target, for example "under 500 words" or "8 bullets maximum".');
    if (!signals.tone) suggestions.push('Describe tone and style with concrete words, not just "professional".');
    if (!signals.examples) suggestions.push('Include at least one example or desired-format template for more consistent output.');
    if (!signals.verification) suggestions.push('Add a self-check instruction before the final answer.');
    if (!signals.uncertainty && !signals.evidence) suggestions.push('Add an uncertainty policy, citation requirement, or "do not guess" instruction.');
    if (!signals.positiveGuidance) suggestions.push('Pair negative rules with preferred behavior, for example "Instead, do X".');
    if (!signals.safety) suggestions.push('For business or user-data tasks, add privacy, sensitive-data, or source-of-truth boundaries.');

    return {
      score: score,
      wordCount: wordCount,
      label: labelForScore(score),
      summary: summaryForScore(score, gates),
      breakdown: breakdown,
      suggestions: suggestions.slice(0, SCORING_CONFIG.maxSuggestions),
      gates: gates,
      signals: signals
    };
  }

  function labelForScore(score) {
    var t = SCORING_CONFIG.thresholds;
    if (score >= t.excellent) return 'Excellent prompt';
    if (score >= t.strong) return 'Strong prompt';
    if (score >= t.good) return 'Good prompt';
    if (score >= t.needsDetail) return 'Needs detail';
    if (score > 0) return 'Needs work';
    return 'No prompt yet';
  }

  function summaryForScore(score, gates) {
    var t = SCORING_CONFIG.thresholds;
    if (score === 0) return 'Fill the builder or paste a prompt to get a live rating.';
    var missing = Object.keys(gates).filter(function (key) { return !gates[key]; });
    if (score >= t.excellent && missing.length === 0) return 'Ready to use. It has clear structure, context, output requirements, examples, and quality controls.';
    if (score >= t.good) return missing.length ? 'Usable, but one or more best-practice gates still needs attention.' : 'Usable and well structured. Add examples or tighter quality controls to raise confidence.';
    return 'Improve the required gates before using this prompt for important work.';
  }

  return { SCORING_CONFIG: SCORING_CONFIG, analyzePrompt: analyzePrompt, labelForScore: labelForScore, summaryForScore: summaryForScore };
}));
