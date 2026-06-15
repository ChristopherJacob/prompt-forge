# Prompt Forge

Prompt Forge is a simple, elegant, local-first web app for building and scoring AI prompts. It guides users through prompt-engineering best practices, assembles a structured prompt, and rates the finished prompt from 1 to 100.

## What it does

- Guided prompt builder for role, objective, context, instructions, output format, examples, and quality checks
- Live prompt score from 1 to 100 with a visible rubric
- Best-practice gates for objective, context, output contract, and reliability
- Strict copy gate that prevents copying weak prompts until minimum quality gates pass
- Light and dark mode
- Local draft saving with `localStorage`
- Prompt export as `.txt`
- Score export as JSON
- Optional PWA installation when served over `localhost` or HTTPS
- No API key, account, build tool, or external dependency required

## Fast install

### Option 1: Open directly

1. Unzip the folder.
2. Open `index.html` in a modern browser.

This works for normal use. PWA installation and service-worker caching require Option 2.

### Option 2: Run locally and install as an app

From the unzipped folder:

```bash
python3 -m http.server 8080
```

Then open:

```text
http://localhost:8080
```

Your browser may show an install option. The in-app "Install app" button appears when the browser supports PWA installation.

## Optional Node start

If you prefer npm as a launcher:

```bash
npm start
```

This runs the same Python local server command through `package.json`.

## Scoring model

The score is a local, heuristic rating from 0–100. It is computed by `analyzePrompt()` in `scoring.js`.

### How it works

The analyzer scans the prompt text for 20+ signals using regex pattern-matching against keywords, punctuation, and structural markers. Signals are grouped into 8 weighted categories:

| Category | Max | Signals and points |
|---|---|---|
| Role, objective, success | 15 | Role (4) + Objective (6) + Success criteria (5) |
| Context and inputs | 15 | Context (6) + Audience (4) + Delimiters (5) |
| Specific instructions | 15 | Instructions (7) + Constraints (5) + Positive guidance (3) |
| Output contract | 15 | Format (6) + Length (3) + Tone (3) + Structure (3) |
| Examples | 10 | Single example (7) + Multiple examples (3) |
| Reliability and safety | 15 | Verification (4) + Evidence (3) + Uncertainty (3) + Edge cases (2) + Safety (3) |
| Prompt structure | 10 | Delimiters (5) + Clear opening (3) + 4+ sections (2) |
| Clarity and precision | 5 | Min 60 words (2) + Under 1400 words (1) + ≤2 vague terms (2) |

### Score labels

| Score | Label |
|---|---|
| 90–100 | Excellent prompt |
| 80–89 | Strong prompt |
| 70–79 | Good prompt |
| 50–69 | Needs detail |
| 1–49 | Needs work |
| 0 | No prompt yet |

### Best-practice gates

Four gates must all pass before a prompt is "copy-ready" in strict mode:

| Gate | Condition |
|---|---|
| Objective | Objective signal AND success criteria signal |
| Context | Context signal AND delimiter signal |
| Output | Output format signal AND (length OR tone OR structure) |
| Quality | Verification signal AND (uncertainty OR evidence OR safety) |

### Tuning

All scoring weights, thresholds, vague-term list, and word limits live in `SCORING_CONFIG` at the top of `scoring.js`. Change values there — no other file needs to change.

### Limitations

The score is a practical heuristic. Regex-based signal detection can produce false positives (a word that matches a pattern but carries a different meaning). For important workflows, always validate prompts with real model outputs.

## Reference basis

This app was designed around public prompt-engineering guidance including OpenAI prompt engineering best practices, Anthropic prompt engineering guidance, and the publicly visible portions of The AI Maker 10-step prompt structure article. The Substack article is partially paywalled, so this app uses only the visible ideas from that page and does not copy paid-only content.

## Files

```text
prompt-forge/
  index.html       App markup
  styles.css       Light/dark responsive UI
  app.js           Builder, scoring, exports, storage, PWA hooks
  manifest.json    PWA metadata
  sw.js            Offline cache service worker
  assets/icon.svg  App icon
```

## Privacy

Prompt Forge runs in the browser. It does not call any AI API or send prompts to a server. Drafts are saved only in your browser's local storage.

## Reference links

- OpenAI Help Center: https://help.openai.com/en/articles/6654000-best-practices-for-prompt-engineering-with-the-openai-api
- Anthropic Claude prompt engineering overview: https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/overview
- Anthropic Claude prompting best practices: https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices
- The AI Maker 10-step prompt structure article: https://aimaker.substack.com/p/the-10-step-system-prompt-structure-guide-anthropic-claude
