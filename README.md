# GuidedHelpJS

[![Validate GuidedHelpJS](https://github.com/bertmckay79/GuidedHelpJS/actions/workflows/ci.yml/badge.svg)](https://github.com/bertmckay79/GuidedHelpJS/actions/workflows/ci.yml)

Lightweight, offline-first, framework-agnostic JavaScript guided tutorials built around **real HTML controls**. Supports existing element IDs, `data-feature` attributes, JSON tutorial definitions, local progress and safe interaction. Optional Vue 3 integration.

> **Status:** v0.1.0 development preview. This repository is not yet published to npm; the API is subject to change. Sprite Rig Studio still uses its own existing implementation until an independently tested migration is merged.

## Features

- Zero runtime dependencies for the Vanilla JavaScript engine and DOM presenter.
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
