# react-path-picker-docs

Static landing page + docs for the [`react-path-picker`](../react-path-picker) package.

## What's here

- `index.html` — single-file landing page (Tailwind + Prism via CDN, no build step).

The page covers:

- **Hero** — pitch, install command, sample output for both React/Next.js apps and the framework-agnostic core.
- **How it works** — three-step usage flow (click aim icon → hover element → click to copy) with the resulting `[xPathInfo]` clipboard payload.
- **Features** — XPath, CSS selector, React component detection, framework-agnostic core.
- **Quick Start** — tabbed snippets for Next.js App Router, Next.js Pages Router, and React Router.
- **Core API** — vanilla TS snippet using `PathPickerInspector`, `getXPath`, `getCssSelector`, plus a compact export reference table.

## View locally

It's a single HTML file with no build tooling. Open it directly:

```bash
# from the repo root
open proto/react-path-picker-docs/index.html
# or serve it (any static server works)
npx serve proto/react-path-picker-docs
```

## Editing

- The page uses Tailwind via the CDN (`cdn.tailwindcss.com`) — Tailwind classes work out of the box, no rebuild required.
- Code blocks are highlighted with Prism's Tomorrow theme. Add a language by importing the matching `prism-<lang>.min.js` component in `<head>`.
- Tabs and copy buttons are powered by the small inline `<script>` at the bottom of `index.html`.

## Links

- Repository: <https://github.com/kiboko-ai/react-path-picker>
- Package source: [`proto/react-path-picker`](../react-path-picker)
- Install: `npm install react-path-picker`

## License

MIT

<!-- redeploy-marker -->
