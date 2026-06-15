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

The score is local and heuristic. It rewards prompts that include:

1. Role, objective, and success criteria
2. Context, audience, source material, and delimiters
3. Specific instructions, constraints, and positive guidance
4. Output format, length, tone, and schema
5. Examples or few-shot patterns
6. Verification, evidence, uncertainty handling, edge cases, and safety boundaries
7. Clear section structure
8. Precise wording with minimal vague language

The score is not a guarantee of model quality. For important workflows, test prompts against real examples and use task-specific evaluations.

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
