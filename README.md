# GuidedHelpJS

[![Validate GuidedHelpJS](https://github.com/bertmckay79/GuidedHelpJS/actions/workflows/ci.yml/badge.svg)](https://github.com/bertmckay79/GuidedHelpJS/actions/workflows/ci.yml)

Lightweight, offline-first, framework-agnostic JavaScript guided tutorials built around **real HTML controls**. Supports existing element IDs, `data-feature` attributes, JSON tutorial definitions, local progress and safe interaction. Optional Vue 3 integration.

> **Status:** v0.3.0 development preview. This repository is not yet published to npm; the API is subject to change. Sprite Rig Studio still uses its own existing implementation until an independently tested migration is merged.

## Features

- Zero runtime dependencies for the Vanilla JavaScript engine and DOM presenter.
- Optional developer-only visual authoring companion with target selection, editable steps, preview and JSON import/export.
- JSON definitions with an included [JSON Schema](./schema/tutorial.schema.json).
- Explicit `{ "id": "existingButton" }` or `{ "feature": "app.projects" }` targets. A legacy string target also means `data-feature`.
- Observes only native, trusted `click` / `change` events; **never performs clicks**, submits forms or approves artwork.
- Explicit Next, trusted user interaction, or named read-only state signal to advance.
- Skip optional steps; pause, resume, restart and track local progress.
- Blocks when targets are missing, hidden or disabled, or when the host declares a busy, modal or authenticated state.
- A DOM-based spotlight presenter and simple accessible control panel, with a separate theme stylesheet.
- Host-owned `page`, `stage`, capability and availability guards. No external model/network/telemetry service.

## Start the browser demo

Run a local static server from the repository root (Python 3 is sufficient):

```sh
python -m http.server 8000
```

Open http://localhost:8000/examples/ . This sample imports `src/index.js` directly and fetches a same-origin JSON file. It doesn't need Vue, npm installation, a CDN or a backend. (Loading a module directly from `file://` is not supported by most browsers.)

## Optional visual recorder and authoring editor

The recorder is a **development-only, opt-in companion**. It is not imported by the default `@bm3d/guided` entry point. The core runtime still has zero dependencies; the optional recorder reuses its validator, presenter and state engine.

**Try the [interactive authoring demo](./examples/author.html)** on the local server:

```sh
python3 -m http.server 8000
```

Open http://127.0.0.1:8000/examples/author.html.

1. Open **Tutorial Authoring**, then choose **Record**.
2. Hover and click application controls with a stable HTML `id` or `data-feature` attribute. The picker suppresses the selected control's actual click/activation and does **not** read page text or form values.
3. Press **Escape** or **Stop selecting**, then use **Edit** to rename the tutorial and steps, change the progression trigger, mark optional steps, and reorder or remove steps. Every captured step starts in `explicit-next` mode.
4. Select **Preview**. The actual runtime positions the help card on the live page and only follows genuine user actions or explicit Next. Preview is in-memory and cannot invoke host functions.
5. Use **Download JSON** or **Import JSON**. Imported tutorials are validated against the same strict contract. The editor does not automatically save content to a server or browser storage.

### Development-only integration

```js
// Import this only in your local/dev authoring entry point.
// Do not bundle into your production application.
import {createTutorialRecorder} from '@bm3d/guided/recorder';
import '@bm3d/guided/styles.css';
import '@bm3d/guided/recorder/styles.css';

const recorder=createTutorialRecorder({
  getContext:()=>({page:'home',busy:false,modal:false})
});
recorder.mount();

// Optionally: recorder.setMode('record');
// recorder.exportJSON(); // returns validated JSON
// recorder.destroy();    // removes listeners and DOM UI
```

Import accepts only one tutorial JSON object (1–32 steps) and rejects unknown fields, invalid IDs, unsupported interactions and oversized payloads. All step content remains local to the browser until the developer chooses to export it. The file export uses a browser download; no server or telemetry is involved.

**Safety:** "Record" means **select and describe targets**, not capture screen video, event replay or keystrokes. Private input fields and `data-guided-private` sections are unselectable. During selection, click, pointer and keyboard activation on host controls is intercepted; while editing/previewing, host interaction remains under the user's control. The recorder is not an app automation tool.

Current limitations: automatic route navigation, targetless introductory steps, arbitrary CSS selectors, draft autosave, native WebView2/touch verification and visual regression coverage are intentionally outside this first version. Live browser tests cover the provided Chromium demo, not every host application.

## Styling and theme configuration

The runtime and optional authoring recorder share **semantic CSS custom properties** with the `--gh-` prefix. Applications can configure styling through CSS alone, pass a JavaScript colour palette, or map roles to the application's existing CSS variable names. Appearance is **host configuration** and is intentionally **not embedded in exported tutorial JSON**.

### Option 1: Override CSS variables

Include `@bm3d/guided/styles.css` (and `@bm3d/guided/recorder/styles.css` for authoring), then add your application's own declarations:

```css
:root {
  --app-primary: #7c3aed;
  --app-panel: #f6f1ff;

  --gh-accent: var(--app-primary);
  --gh-highlight: var(--app-primary);
  --gh-focus: var(--app-primary);
  --gh-surface: var(--app-panel);
  --gh-text: #271041;
  --gh-button-bg: #e9ddff;
  --gh-button-text: #271041;
}
```

This approach needs **no JavaScript configuration**. It works for Vue, Razor, React and plain HTML. All overrides fall back to the built-in light/dark defaults where the host leaves a token unspecified.

### Option 2: Provide a palette or variable-name mapping

```js
import {createGuidedHelp} from '@bm3d/guided';

const help=createGuidedHelp({
  tutorials:approvedTutorials,
  namespace:'myapp.help',
  getContext:()=>({page:'home'}),
  theme:{
    palette:{
      surface:'#f6f1ff',
      text:'#271041',
      buttonBackground:'#e9ddff',
      buttonText:'#271041'
    },
    variables:{
      accent:'--app-primary',
      highlight:'--app-primary',
      focus:'--app-primary'
    }
  }
});

// Switch the active theme without remounting a tutorial.
help.setTheme({
  variables:{accent:'--brand-accent',surface:'--brand-panel'}
});
```

A palette value must be a CSS colour (hex, named colour, rgb/hsl/oklch, etc.); a variable mapping must be a **CSS custom property name**, for example `--app-primary`, not a CSS declaration or selector. Do not set the same role in both objects. Unknown roles and unsafe values are rejected. No arbitrary CSS is evaluated or injected. Use `--gh-shadow` directly in CSS for advanced shadows.

Supported roles:

| Theme role | CSS property | Purpose |
| --- | --- | --- |
| `accent`, `accentText` | `--gh-accent`, `--gh-accent-text` | Selected navigation and its text |
| `surface`, `text`, `mutedText` | `--gh-surface`, `--gh-text`, `--gh-muted-text` | Panel background and text |
| `border` | `--gh-border` | Fields, buttons and panel edges |
| `buttonBackground`, `buttonText` | `--gh-button-bg`, `--gh-button-text` | Buttons |
| `fieldBackground`, `fieldText` | `--gh-field-bg`, `--gh-field-text` | Recorder input fields |
| `highlight`, `focus` | `--gh-highlight`, `--gh-focus` | Highlighted target / keyboard outline |
| `selectedBackground`, `statusBackground`, `warningText` | `--gh-selected-bg`, `--gh-status-bg`, `--gh-warning-text` | Recorder selection and help messages |
| `shadow` | `--gh-shadow` | Panel shadows |

The library applies configured values only to its own panels and temporarily to the highlighted host control. It **restores previous inline CSS** when the target changes or the tutorial is destroyed; it never overwrites the host's global theme. CSS-only `--gh-*` variables naturally inherit from the application.

The authoring UI includes an **Appearance** tab where you can pick a fixed CSS colour or enter an existing CSS variable name for each role. Changes are reflected in the recorder and in live preview. The configuration JSON is displayed separately for copying into the host app; tutorial export remains appearance-neutral.

For a working side-by-side example, visit [the authoring demo](./examples/author.html) and select **Use purple palette**, **Map application CSS variables**, or **Use app/default CSS**.

**Accessibility note:** Users can select palettes that lack sufficient contrast; when creating app themes, check colour contrast in both light and dark host modes. The default styles honour reduced motion, but custom colours still require application-level accessibility review.

## Use in Vanilla JavaScript

```js
import { createGuidedHelp } from './src/index.js';
// Via a bundler, you can import a checked-in JSON file.
// Otherwise load same-origin JSON: const [tutorial] = await (await fetch('/help/tour.json')).json();

const tutorial = {
  id: 'home.basics',
  title: 'Explore the application',
  category: 'Getting started',
  summary: 'Learn two controls on the home screen.',
  steps: [
    {
      id: 'intro',
      title: 'Welcome',
      body: 'This is your existing projects control.',
      target: { id: 'projectsButton' },
      advance: 'explicit-next'
    },
    {
      id: 'open',
      title: 'Open Projects',
      body: 'Click the button yourself to complete the tour.',
      target: { feature: 'app.projects' },
      advance: 'observed-user-interaction',
      eventType: 'click',
      optional: true
    }
  ]
};

const help = createGuidedHelp({
  namespace: 'myapp.help', // isolates progress per application
  tutorials: [tutorial],
  getContext: () => ({
    page: 'home',
    busy: false,
    modal: false
  })
});

// Include src/styles.css in the page for the panel and target highlight.
document.getElementById('startHelp').addEventListener('click', () => {
  help.start('home.basics', { resume: true });
});

// On application teardown: help.destroy().
```

Targets should be visible, stable IDs on real controls, not transient framework-generated IDs. HTML IDs may contain mixed case and punctuation `_.:-`; data-feature semantic IDs are lower-case with `._-`. Arbitrary CSS selectors and embedded scripts are intentionally not accepted.

### Step progression

| `advance` | Requirement |
| --- | --- |
| `explicit-next` | User presses Next in the tutorial panel |
| `observed-user-interaction` | Trusted native click/change from the targeted element |
| `read-only-state-reached` | `getContext()` supplies a matching `signals` entry |

When `page`, `stage`, `capability`, or `availability` are declared they must match the host's current read-only context. For an availability guard, set `getContext().availability[name] = true`. The tutorial never navigates, opens a modal, modifies a document or executes a host action.

### Vue 3

The optional adapter is available from `@bm3d/guided/vue` once the package is installed, and is not imported by the Vanilla JS entry point:

```js
import {useGuidedHelp} from '@bm3d/guided/vue';
import '@bm3d/guided/styles.css';

const help = useGuidedHelp({
  namespace: 'myapp.vue-help',
  tutorials: approvedTutorials,
  getContext: () => ({ page: currentPage.value })
});

// help.state.value holds the current tutorial state.
// help.start('home.basics') begins the live walkthrough.
```

`useGuidedHelp` must run inside a Vue 3 `setup()` context; it mounts/unmounts the presenter through Vue lifecycle hooks. Consumers must provide the real application context and stable targets.

## Development

```sh
npm run check
npm test
npm install --no-audit --no-fund
npx playwright install chromium
npm run test:browser
npm pack --dry-run
```

There are no required runtime packages or build steps. Vue 3 is an optional peer dependency. The example is deliberately a pure HTML and JavaScript host. Tests exercise the engine without GPU, network, browser automation or AI services. CI does not by itself verify touch devices, WebView2 fullscreen or live Sprite Rig Studio migration.

## Security and privacy

- Text is rendered using `textContent`, not unsafe HTML from tutorial files.
- No arbitrary JavaScript callbacks or CSS selectors in tutorial descriptors.
- The library observes user interactions but never dispatches them.
- Only tutorial IDs, progress and step statuses are stored, scoped under `<namespace>:tutorials:v1`.
- Browser profile storage is shared across users of the same origin; do not store personal or workspace data in tutorial identifiers.
- Unknown or unavailable host state should be treated as blocked. The host is responsible for accurately declaring authentication, busy and modal state.
- This is **not** an approval engine, workflow automator or entitlement system.

## Extraction / provenance

The tutorial validator, state engine, progress store, DOM spotlight geometry and native-event presenter were adapted from the reviewed Product Discovery implementation in [BM3D-Media/Unity-Sprite-Rigging](https://github.com/BM3D-Media/Unity-Sprite-Rigging/tree/main/Tools/ConceptRig/studio/src/discovery). GuidedHelpJS removes Sprite Rigging-specific page/availability assumptions and adds a vanilla JS API and explicit HTML ID targeting while retaining the safe interaction model.

The current migration plan is: validate this package independently, then create a **separate** Sprite Rigging feature PR to replace its copied modules and run existing Unit/Playwright/Windows WebView2 checks. Do not remove the existing tested implementation early.

## Licence

[MIT](./LICENSE).
