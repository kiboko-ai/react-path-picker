# react-path-picker

> ## One click saves a thousand tokens.

Stop describing UI elements to your AI agent. Click any element on your dev build, paste the exact XPath, CSS selector, and React component name straight into **Cursor / Claude Code / Codex**.

🌐 **[Live demo & docs →](https://kiboko-ai.github.io/react-path-picker/)**

```
[xPathInfo], Origin: http://localhost:3000, Project: /Users/me/dev/acme/webapp, Route: /dashboard, XPath: /html/body/div[2]/main, CSS: main.layout-content, React: DashboardPage (app/dashboard/page.tsx)
```

## How it works

Three clicks. From mystery DOM node to a clipboard-ready snippet your agent can paste straight into a fix:

1. **Click the aim icon** in the top-right of your dev build, or **tap `Shift` twice**.
2. **Hover any element.** A teal overlay highlights it with a tooltip showing its tag, classes, and detected component.
3. **Click to copy.** Origin, project root, route, XPath, CSS selector, and React component name + source path land on your clipboard.

Need several at once? **Shift+click** each one, or **drag a box** around them, then press `Enter`.

## Features

- **Smart XPath** — ID shortcuts and SVG-boundary detection produce minimal, readable expressions.
- **Unique CSS selector** — capped at 5 levels, auto-filters Ant Design / emotion `css-*` hash classes.
- **React component detection** — walks the React Fiber tree at runtime to find the nearest user component name and (with a small dev-only loader) its source file.
- **Knows which app it came from** — every pick carries the page `Origin` and the `Project` root, so an agent juggling several repos never patches the wrong one. The root is derived from React's dev source info; override it with the `project` prop when you want a name instead of a path.
- **Picks what a normal click can't** — disabled buttons and inputs, and elements inside popovers, dropdowns, and menus that would close the moment you press. While picking, the page never sees the press: nothing closes, nothing submits, nothing navigates.
- **Several elements in one go** — Shift+click to stack picks, or drag a box to grab everything inside it. `Enter` copies them all under one shared header, so three elements cost barely more than one.
- **A shortcut nothing else wants** — tapping `Shift` twice arms the picker. Every `Ctrl`/`Alt`/`Shift` + letter combo is already spoken for by some browser; a modifier double-tap is bound by none. Change it with the `hotkey` prop, or pass `false` to turn it off.
- **Framework-agnostic core** — `react-path-picker/core` exposes `PathPickerInspector`, `getXPath()`, `getCssSelector()`, and `getReactComponent()`. No React required — works in plain HTML too via esm.sh.

## Quick Start

Pick one. The Prompt tab is the default — your AI agent does the wiring for you.

### [Prompt (Default)]

Paste this prompt into Claude Code, Cursor, Codex, or any AI coding agent that has shell + filesystem access in your project. It will install and wire `react-path-picker` for you — no copy-pasting snippets.

````
Install and wire up react-path-picker into this project.
Repo: https://github.com/kiboko-ai/react-path-picker

Steps:
1. Detect the project type:
   - **React app** — Next.js App Router, Pages Router, or React with React Router / Vite. Follow steps 2–6.
   - **Plain HTML** — static `.html` files, no bundler / no npm. Skip steps 2–5 and use the Plain HTML snippet at the bottom instead.
2. Install the package: `npm install react-path-picker`.
3. Create a dev-only `DevPathPicker` component that uses `PathPickerButton` from `react-path-picker`.
   Pass the current pathname via the framework's router hook
   (`usePathname` for Next.js App Router, `useRouter().pathname` for Pages Router,
   or `useLocation().pathname` for React Router).
4. Gate it on development (`process.env.NODE_ENV !== 'production'` or `!import.meta.env.PROD`)
   so it never renders in production.
5. Mount it once at the root (`app/layout.tsx`, `pages/_app.tsx`, or `App.tsx`) so the inspector
   button shows on every page.
6. Run the project's typecheck/build (e.g. `npm run typecheck`) and fix any issues.

For **Plain HTML**, add this `<script type="module">` to a dev-only HTML page (never ship to
production). It loads `react-path-picker/core` from esm.sh, mounts a fixed top-right button, and
copies `[xPathInfo] Route, XPath, CSS` to the clipboard on pick:

```html
<script type="module">
  import { PathPickerInspector } from 'https://esm.sh/react-path-picker/core';
  const btn = document.createElement('button');
  btn.textContent = '◎';
  btn.title = 'xPathInfo: pick an element to copy';
  btn.setAttribute('data-pathpicker-ignore', '');
  btn.style.cssText =
    'position:fixed;top:6px;right:6px;z-index:99998;width:28px;height:28px;' +
    'border-radius:6px;border:1px solid rgba(255,255,255,0.22);background:#0f172a;' +
    'color:#fff;cursor:pointer;font:14px/1 monospace';
  document.body.appendChild(btn);
  let ins = null;
  const reset = () => { ins = null; btn.style.background = '#0f172a'; };
  btn.onclick = () => {
    if (ins) { ins.deactivate(); reset(); return; }
    ins = new PathPickerInspector({
      getRoute: () => location.pathname,
      onPick: (r) => {
        navigator.clipboard?.writeText(
          `[xPathInfo], Origin: ${r.origin}, Route: ${r.route}, XPath: ${r.xpath}, CSS: ${r.cssSelector}`
        );
        reset();
      },
      onCancel: reset,
    });
    ins.activate();
    btn.style.background = '#329D9C';
  };
</script>
```

Do not modify production code paths or render the picker in production builds.
````

That's it — your agent reads this repo and handles the rest.

---

### [Manual (Optional)]

<sub>Prefer to wire it up by hand? Pick the router you're using.</sub>

<sub>Install:</sub>

```bash
npm install react-path-picker
```

<sub>**Next.js (App Router)**</sub>

```tsx
'use client';

import { usePathname } from 'next/navigation';
import { PathPickerButton } from 'react-path-picker';

export default function DevPathPicker() {
  const pathname = usePathname();
  if (process.env.NODE_ENV !== 'development') return null;
  return <PathPickerButton pathname={pathname} />;
}
```

<sub>Add it to `app/layout.tsx` (inside `<body>`).</sub>

<sub>**Next.js (Pages Router)**</sub>

```tsx
import { useRouter } from 'next/router';
import { PathPickerButton } from 'react-path-picker';

export default function App({ Component, pageProps }) {
  const router = useRouter();
  return (
    <>
      {process.env.NODE_ENV === 'development' && (
        <PathPickerButton pathname={router.pathname} />
      )}
      <Component {...pageProps} />
    </>
  );
}
```

<sub>**React Router**</sub>

```tsx
import { useLocation } from 'react-router-dom';
import { PathPickerButton } from 'react-path-picker';

export function DevPathPicker() {
  const location = useLocation();
  if (import.meta.env.PROD) return null;
  return <PathPickerButton pathname={location.pathname} />;
}
```

## Core API (framework-agnostic)

Need to use the inspector outside React, or wire up your own UI? Import from the framework-agnostic `react-path-picker/core` subpath.

```ts
import { PathPickerInspector, getXPath, getCssSelector } from 'react-path-picker/core';

const inspector = new PathPickerInspector({
  getRoute: () => window.location.pathname,
  getProject: () => 'acme-web', // optional — omit to auto-derive from React dev source info
  onPick: (result) => console.log(result),
  onCancel: () => console.log('cancelled'),
});

inspector.activate();
```

## API

### `PathPickerButton` props

| Prop | Type | Default | Description |
|---|---|---|---|
| `pathname` | `string` | `window.location.pathname` | Route text copied to clipboard |
| `project` | `string` | repo root from React dev source info | Which codebase this app is, e.g. `"acme-web"` or an absolute path |
| `color` | `string` | `#329D9C` | Active accent color |
| `onPick` | `(result, formatted) => void` | clipboard copy | Custom handler invoked after a single-element pick |
| `onPickMany` | `(results, formatted) => void` | clipboard copy | Custom handler for a multi-element selection. Passing only `onPick` does not cover this path |
| `hotkey` | `string \| string[] \| false` | `"shift shift"` | Shortcut that arms picking. Combos toggle (`"alt+p"`), double-taps only arm (`"shift shift"`). `false` disables it |
| `multi` | `boolean` | `true` | Shift+click stacking and drag-region select. `false` restores one-pick-then-close |

### Picking several at once

While the picker is armed:

| | |
|---|---|
| **click** | pick one, copy, close — unchanged |
| **Shift+click** | add it to the selection and stay open. Shift+click it again to drop it |
| **drag** | select every element the box fully covers, replacing the selection |
| **Shift+drag** | same, but added to what you already have |
| **Enter** | copy the whole selection and close |
| **Esc** | mid-drag, undo the drag; otherwise throw the selection away and close |

A box takes **the outermost element that fits inside it**. Drag around two cards and you get the two
cards, not the eighteen wrappers, headings, and spans they contain. Nudge the box wider until it
clears their shared wrapper and you get the wrapper instead. Once a selection exists, a plain click
replaces it rather than picking-and-closing — a stray click should not cost you the work.

The copied text hoists what every pick shares:

```
[xPathInfo] 3 elements, Origin: http://localhost:3000, Project: /Users/me/dev/acme/webapp, Route: /dashboard
1. XPath: /html/body/div[2]/main/ul/li[1], CSS: li.row:nth-child(1), React: RowItem (src/Row.tsx:12)
2. XPath: /html/body/div[2]/main/ul/li[2], CSS: li.row:nth-child(2), React: RowItem (src/Row.tsx:12)
3. XPath: /html/body/div[2]/main/footer, CSS: main > footer, React: PageFooter (src/Footer.tsx:4)
```

Set `multi={false}` to turn all of it off and get the one-pick-then-close picker back.

### Why double-tap Shift

Every plain combo is taken by someone. `Ctrl`+letter is browser chrome, `Ctrl+Shift`+letter is
devtools territory, and on Windows and Linux `Alt`+letter reaches for the menu bar. A modifier
double-tap is the one gesture no browser binds — Windows Sticky Keys needs five taps, and Chrome,
Firefox, Edge, and Safari all ignore two.

It only arms, never disarms: `Shift` doubles as the accumulate modifier, so a toggle would close the
picker in the middle of stacking picks. Close it with `Esc` or the aim icon. The gesture counts only when
the second tap lands within 400ms of releasing the first, with no other key and no mouse press in
between — so typing `Hello World` and Shift+clicking your way down a list both stay quiet.

`hotkey` still takes the old combo form, and an array of either:

```tsx
<PathPickerButton hotkey="alt+p" />                     {/* combo — toggles */}
<PathPickerButton hotkey={['alt+p', 'shift shift']} />  {/* both */}
<PathPickerButton hotkey={false} />                     {/* off */}
```

### Picking inside popovers and menus

Overlays usually close on the press that opens the pick — `mousedown` for antd/rc-trigger, `pointerdown` for Radix. While the picker is armed it swallows the whole press before the page sees it, so the overlay stays put and the element you highlighted is the one you get. Disabled controls work the same way, even though the browser normally fires no press events on them at all.

Arming the picker is safe too — `PathPickerButton` keeps its own press off the page, so an open dropdown survives the click on the aim icon. If you built your own UI on `usePathPicker`, that press is yours to handle; tap `Shift` twice instead.

Still out of reach: a tooltip rendered in a portal with `pointer-events: none`. It isn't under the cursor as far as the browser is concerned, and it has no parent to trace it back from, so the picker sees whatever sits behind it.

### Exports

- Root (`react-path-picker`): `PathPickerButton`, `usePathPicker`, `formatResult`, `formatResults`, `createHotkeyMatcher`, `describeHotkey`, `PathPickerInspector`, `getXPath`, `getCssSelector`, `getReactComponent`, `selectInBand`, `snapshotElements`
- Subpath (`react-path-picker/core`): same core utilities, no React dependency.

## Development

```bash
npm install
npm run typecheck
npm test
npm run build
npm pack
```

### Playground

```bash
npm run playground     # builds dist/, serves http://localhost:5174
```

A local page wired to your `dist/` build — not the published package — so you can click through the
cases that are hard to unit-test: native and library-styled disabled controls, dropdowns that close on
`mousedown`, Radix-style popovers that close on `pointerdown`, hover tooltips, a modal backdrop,
Shift+click stacking, and drag-region select over deliberately nested wrappers.
A panel on the right logs every event the page actually received, so anything leaking through the
picker shows up in red. Needs network the first time — React loads from esm.sh.

## License

MIT — made by [Kiboko AI](https://kiboko.ai).
