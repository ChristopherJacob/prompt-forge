(function () {
  'use strict';

  var selectors = {
    form: '#promptForm',
    finalPrompt: '#finalPrompt',
    buildPrompt: '#buildPrompt',
    copyPrompt: '#copyPrompt',
    downloadTxt: '#downloadTxt',
    downloadJson: '#downloadJson',
    loadSample: '#loadSample',
    saveDraft: '#saveDraft',
    resetAll: '#resetAll',
    strictMode: '#strictMode',
    themeToggle: '#themeToggle',
    installBtn: '#installBtn',
    scoreRing: '#scoreRing',
    scoreValue: '#scoreValue',
    scoreLabel: '#scoreLabel',
    scoreSummary: '#scoreSummary',
    suggestionsList: '#suggestionsList',
    breakdown: '#breakdown',
    copyGate: '#copyGate',
    copyHelp: '#copyHelp'
  };

  var fieldNames = [
    'taskType', 'delimiterStyle', 'role', 'objective', 'successCriteria', 'audience', 'context',
    'sourceMaterial', 'instructions', 'constraints', 'positiveGuidance', 'outputFormat',
    'lengthTarget', 'tone', 'structure', 'examples', 'temperature', 'includeModelSettings'
  ];

  var taskDefaults = {
    general: {
      role: 'You are a precise, practical AI assistant.',
      instruction: 'Follow the instructions in order and optimize for usefulness, accuracy, and clarity.'
    },
    research: {
      role: 'You are a careful research analyst who distinguishes evidence from inference.',
      instruction: 'Synthesize the material, compare competing interpretations, cite evidence when available, and flag uncertainty.'
    },
    coding: {
      role: 'You are a senior software engineer who writes maintainable, tested code.',
      instruction: 'First identify requirements and edge cases, then produce the implementation with clear setup and test notes.'
    },
    extraction: {
      role: 'You are a data extraction specialist who returns consistent, machine-readable output.',
      instruction: 'Extract only information supported by the input. Use null for missing values rather than guessing.'
    },
    strategy: {
      role: 'You are a pragmatic business strategist who balances ambition, risk, and execution detail.',
      instruction: 'Frame tradeoffs, state assumptions, and recommend the next best action.'
    },
    creative: {
      role: 'You are a creative director with strong taste and clear editorial judgment.',
      instruction: 'Generate distinctive options while preserving the requested audience, tone, and constraints.'
    },
    agent: {
      role: 'You are an autonomous workflow planner who keeps state and works incrementally.',
      instruction: 'Plan the work, identify required tools or inputs, execute in safe steps, and report progress against the goal.'
    }
  };

  function $(selector) {
    return document.querySelector(selector);
  }

  function all(selector) {
    return Array.prototype.slice.call(document.querySelectorAll(selector));
  }

  function value(id) {
    var el = document.getElementById(id);
    if (!el) return '';
    if (el.type === 'checkbox') return el.checked;
    return String(el.value || '').trim();
  }

  function setValue(id, newValue) {
    var el = document.getElementById(id);
    if (!el) return;
    if (el.type === 'checkbox') el.checked = Boolean(newValue);
    else el.value = newValue || '';
  }

  function checkedQualityItems() {
    return all('input[name="quality"]:checked').map(function (item) { return item.value; });
  }

  function normalizeLines(text) {
    return String(text || '')
      .split(/\r?\n/)
      .map(function (line) { return line.trim(); })
      .filter(Boolean)
      .join('\n');
  }

  function numbered(text) {
    var clean = normalizeLines(text);
    if (!clean) return '';
    var lines = clean.split('\n');
    var alreadyNumbered = lines.some(function (line) { return /^\d+[.)]\s+/.test(line); });
    if (alreadyNumbered) return clean;
    return lines.map(function (line, index) { return (index + 1) + '. ' + line.replace(/^[-*]\s+/, ''); }).join('\n');
  }

  function sectionMarkdown(title, body) {
    if (!body) return '';
    return '### ' + title + '\n' + body.trim();
  }

  function sectionXml(tag, body) {
    if (!body) return '';
    return '<' + tag + '>\n' + body.trim() + '\n</' + tag + '>';
  }

  function sectionQuotes(title, body) {
    if (!body) return '';
    if (/context|material|input|data/i.test(title)) {
      return title + ':\n"""\n' + body.trim() + '\n"""';
    }
    return title + ':\n' + body.trim();
  }

  function createSection(style, title, tag, body) {
    if (style === 'xml') return sectionXml(tag, body);
    if (style === 'quotes') return sectionQuotes(title, body);
    return sectionMarkdown(title, body);
  }

  function getBuilderData() {
    var data = {};
    fieldNames.forEach(function (name) { data[name] = value(name); });
    data.quality = checkedQualityItems();
    return data;
  }

  function buildPromptFromData(data) {
    var style = data.delimiterStyle || 'markdown';
    var selectedDefaults = taskDefaults[data.taskType] || taskDefaults.general;
    var role = data.role || selectedDefaults.role;
    var instructions = data.instructions || selectedDefaults.instruction;
    var quality = data.quality || [];
    var parts = [];

    parts.push(createSection(style, 'Role', 'role', role));
    parts.push(createSection(style, 'Objective', 'objective', data.objective));
    parts.push(createSection(style, 'Success criteria', 'success_criteria', data.successCriteria));

    var contextParts = [];
    if (data.audience) contextParts.push('Audience or stakeholder: ' + data.audience);
    if (data.context) contextParts.push(data.context);
    parts.push(createSection(style, 'Context', 'context', contextParts.join('\n\n')));

    if (data.sourceMaterial) {
      parts.push(createSection(style, 'Source material', 'source_material', data.sourceMaterial));
    }

    parts.push(createSection(style, 'Instructions', 'instructions', numbered(instructions)));
    parts.push(createSection(style, 'Constraints and non-goals', 'constraints', data.constraints));
    parts.push(createSection(style, 'Preferred behavior', 'preferred_behavior', data.positiveGuidance));

    var outputBits = [];
    if (data.outputFormat) outputBits.push('Format: ' + data.outputFormat + '.');
    if (data.lengthTarget) outputBits.push('Length: ' + data.lengthTarget + '.');
    if (data.tone) outputBits.push('Tone and style: ' + data.tone + '.');
    if (data.structure) outputBits.push('Required structure:\n' + data.structure);
    parts.push(createSection(style, 'Output format', 'output_format', outputBits.join('\n')));

    if (data.examples) {
      parts.push(createSection(style, 'Examples', 'examples', data.examples));
    }

    if (quality.length) {
      parts.push(createSection(style, 'Quality checks', 'quality_checks', numbered(quality.join('\n'))));
    }

    if (data.includeModelSettings) {
      parts.push(createSection(style, 'Suggested model settings', 'model_settings', data.temperature));
    }

    return parts.filter(Boolean).join('\n\n').trim();
  }

  function renderAnalysis(analysis) {
    var scorePct = analysis.score + '%';
    $(selectors.scoreRing).style.setProperty('--score', scorePct);
    $(selectors.scoreValue).textContent = analysis.score;
    $(selectors.scoreLabel).textContent = analysis.label;
    $(selectors.scoreSummary).textContent = analysis.summary;

    ['Objective', 'Context', 'Format', 'Quality'].forEach(function (name) {
      var el = document.getElementById('gate' + name);
      if (!el) return;
      var pass = analysis.gates[name.toLowerCase()];
      el.classList.toggle('pass', Boolean(pass));
      el.classList.toggle('fail', !pass && analysis.wordCount > 0);
    });

    var breakdownHtml = analysis.breakdown.map(function (item) {
      var pct = item.max ? Math.round((item.points / item.max) * 100) : 0;
      return '<div class="bar-row">' +
        '<div class="bar-meta"><strong>' + escapeHtml(item.label) + '</strong><span>' + item.points + '/' + item.max + '</span></div>' +
        '<div class="bar-track" aria-hidden="true"><div class="bar-fill" style="--w: ' + pct + '%"></div></div>' +
      '</div>';
    }).join('');
    $(selectors.breakdown).innerHTML = breakdownHtml;

    var suggestions = analysis.suggestions.length ? analysis.suggestions : ['Looks strong. Test it with real model outputs and refine based on failures.'];
    $(selectors.suggestionsList).innerHTML = suggestions.map(function (item) { return '<li>' + escapeHtml(item) + '</li>'; }).join('');

    var strict = $(selectors.strictMode).checked;
    var gatesPassed = Object.keys(analysis.gates).every(function (key) { return analysis.gates[key]; });
    var canCopy = Boolean($(selectors.finalPrompt).value.trim()) && (!strict || (analysis.score >= 70 && gatesPassed));
    $(selectors.copyPrompt).disabled = !canCopy;
    var gate = $(selectors.copyGate);
    gate.classList.toggle('pass', canCopy);
    gate.classList.toggle('fail', !canCopy && analysis.wordCount > 0);
    gate.textContent = canCopy ? 'Copy ready' : (strict ? 'Score gate active' : 'Copy allowed');
    $(selectors.copyHelp).textContent = strict
      ? 'Strict mode requires a score of at least 70 and all core gates before copying.'
      : 'Strict mode is off. You can copy any prompt, but the score still reflects best-practice coverage.';
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"]/g, function (char) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char];
    });
  }

  function updateAnalysis() {
    var analysis = analyzePrompt($(selectors.finalPrompt).value);
    renderAnalysis(analysis);
    persistDraft(false);
    return analysis;
  }

  function showToast(message) {
    var existing = document.querySelector('.toast');
    if (existing) existing.remove();
    var toast = document.createElement('div');
    toast.className = 'toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.textContent = message;
    document.body.appendChild(toast);
    requestAnimationFrame(function () { toast.classList.add('show'); });
    window.setTimeout(function () {
      toast.classList.remove('show');
      window.setTimeout(function () { toast.remove(); }, 220);
    }, 2600);
  }

  function persistDraft(showMessage) {
    var data = getBuilderData();
    data.finalPrompt = $(selectors.finalPrompt).value;
    data.qualityChecked = all('input[name="quality"]').map(function (input) { return input.checked; });
    var serialized = JSON.stringify(data);
    if (serialized.length > 400000) {
      showToast('Draft is too large to save. Trim the source material or prompt text.');
      return;
    }
    try {
      localStorage.setItem('prompt-forge-draft', serialized);
      if (showMessage) showToast('Draft saved locally in this browser.');
    } catch (_e) {
      showToast('Could not save draft — browser storage may be full.');
    }
  }

  function restoreDraft() {
    var raw = localStorage.getItem('prompt-forge-draft');
    if (!raw) return false;
    try {
      var data = JSON.parse(raw);
      fieldNames.forEach(function (name) {
        if (Object.prototype.hasOwnProperty.call(data, name)) setValue(name, data[name]);
      });
      if (Array.isArray(data.qualityChecked)) {
        all('input[name="quality"]').forEach(function (input, index) { input.checked = Boolean(data.qualityChecked[index]); });
      }
      $(selectors.finalPrompt).value = data.finalPrompt || '';
      updateAnalysis();
      return true;
    } catch (error) {
      console.warn('Could not restore draft', error);
      return false;
    }
  }

  function loadSample() {
    setValue('taskType', 'strategy');
    setValue('delimiterStyle', 'markdown');
    setValue('role', 'You are a field-tested AI strategy advisor who explains technical risk in business language.');
    setValue('objective', 'Create an executive-ready AI prompt governance checklist that helps a leadership team approve safe, useful prompts for internal business workflows.');
    setValue('successCriteria', 'Success looks like a checklist that is practical, easy to scan, specific enough for governance reviews, and clear about risk, ownership, evidence, and output quality.');
    setValue('audience', 'CIO, CISO, legal, privacy, and business leaders who need practical controls without slowing teams down.');
    setValue('context', 'The organization is rolling out generative AI for sales, support, engineering, and internal knowledge work. Leaders want teams to write better prompts while reducing leakage, hallucination, and inconsistent outputs.');
    setValue('sourceMaterial', 'Known concerns: sensitive customer data, unsupported claims, unclear success criteria, vague prompts, inconsistent formats, and prompts that only list what not to do.');
    setValue('instructions', 'Identify the governance categories.\nFor each category, explain the purpose in plain language.\nProvide a pass or fail check that a reviewer can apply quickly.\nPrioritize controls that improve prompt quality without requiring a new platform.');
    setValue('constraints', 'Do not use legalese. Do not recommend sending sensitive data to a model. Keep the checklist vendor-neutral and usable in a one-hour review meeting.');
    setValue('positiveGuidance', 'Instead of only warning teams what to avoid, give them a preferred prompt-writing behavior and a concrete review question.');
    setValue('outputFormat', 'Markdown table');
    setValue('lengthTarget', '10 rows maximum, followed by a 5-bullet rollout plan.');
    setValue('tone', 'Direct, practical, executive-ready, plain language, no hype.');
    setValue('structure', 'Columns: Control area, why it matters, pass/fail review question, example improvement.\nAfter the table: rollout plan, owner suggestions, and quick metrics.');
    setValue('examples', 'Example row:\nControl area: Output format\nWhy it matters: Makes model responses easier to review and reuse\nPass/fail review question: Does the prompt define the exact format, fields, and length?\nExample improvement: "Return a markdown table with columns A, B, and C" instead of "summarize this clearly."');
    setValue('temperature', 'Low temperature for factual, deterministic, or extraction tasks');
    all('input[name="quality"]').forEach(function (input) { input.checked = true; });
    buildAndScore();
    showToast('Sample prompt loaded.');
  }

  function buildAndScore() {
    var prompt = buildPromptFromData(getBuilderData());
    $(selectors.finalPrompt).value = prompt;
    updateAnalysis();
  }

  function downloadFile(filename, text, type) {
    var blob = new Blob([text], { type: type || 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 250);
  }

  async function copyPrompt() {
    var text = $(selectors.finalPrompt).value;
    if (!text.trim()) return;
    try {
      await navigator.clipboard.writeText(text);
      showToast('Prompt copied.');
    } catch (_error) {
      var promptEl = $(selectors.finalPrompt);
      promptEl.focus();
      promptEl.select();
      document.execCommand('copy');
      showToast('Prompt copied using fallback.');
    }
  }

  function updateThemeButton() {
    var theme = document.documentElement.dataset.theme || 'light';
    var button = $(selectors.themeToggle);
    button.textContent = theme === 'dark' ? 'Light mode' : 'Dark mode';
    button.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
  }

  function toggleTheme() {
    var current = document.documentElement.dataset.theme || 'light';
    var next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('prompt-forge-theme', next);
    updateThemeButton();
  }

  function resetAll() {
    var confirmed = window.confirm('Reset the builder and remove the saved local draft?');
    if (!confirmed) return;
    localStorage.removeItem('prompt-forge-draft');
    $(selectors.form).reset();
    setValue('delimiterStyle', 'markdown');
    setValue('temperature', 'Medium temperature for balanced reasoning and writing');
    setValue('includeModelSettings', true);
    $(selectors.finalPrompt).value = '';
    updateAnalysis();
    showToast('Prompt Forge was reset.');
  }

  function downloadScoreJson() {
    var analysis = analyzePrompt($(selectors.finalPrompt).value);
    var payload = {
      generatedAt: new Date().toISOString(),
      score: analysis.score,
      label: analysis.label,
      wordCount: analysis.wordCount,
      gates: analysis.gates,
      breakdown: analysis.breakdown,
      suggestions: analysis.suggestions,
      prompt: $(selectors.finalPrompt).value
    };
    downloadFile('prompt-score.json', JSON.stringify(payload, null, 2), 'application/json;charset=utf-8');
  }

  function registerServiceWorker() {
    if ('serviceWorker' in navigator && window.location.protocol !== 'file:') {
      navigator.serviceWorker.register('./sw.js').catch(function (error) {
        console.warn('Service worker registration failed', error);
      });
    }
  }

  function setupInstallPrompt() {
    var deferredPrompt = null;
    var installButton = $(selectors.installBtn);
    window.addEventListener('beforeinstallprompt', function (event) {
      event.preventDefault();
      deferredPrompt = event;
      installButton.hidden = false;
    });
    installButton.addEventListener('click', async function () {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      installButton.hidden = true;
    });
  }

  function bindEvents() {
    $(selectors.buildPrompt).addEventListener('click', buildAndScore);
    $(selectors.copyPrompt).addEventListener('click', copyPrompt);
    $(selectors.downloadTxt).addEventListener('click', function () {
      downloadFile('prompt.txt', $(selectors.finalPrompt).value || '', 'text/plain;charset=utf-8');
    });
    $(selectors.downloadJson).addEventListener('click', downloadScoreJson);
    $(selectors.loadSample).addEventListener('click', loadSample);
    $(selectors.saveDraft).addEventListener('click', function () { persistDraft(true); });
    $(selectors.resetAll).addEventListener('click', resetAll);
    $(selectors.strictMode).addEventListener('change', updateAnalysis);
    $(selectors.themeToggle).addEventListener('click', toggleTheme);
    $(selectors.finalPrompt).addEventListener('input', updateAnalysis);

    all('input, textarea, select').forEach(function (item) {
      item.addEventListener('change', function () { persistDraft(false); });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    bindEvents();
    updateThemeButton();
    setupInstallPrompt();
    registerServiceWorker();
    if (!restoreDraft()) updateAnalysis();
  });
}());
