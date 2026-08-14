# react-path-picker

> ## One click saves a thousand tokens.

Stop describing UI elements to your AI agent. Click any element on your dev build, paste the exact XPath, CSS selector, and React component name straight into **Cursor / Claude Code / Codex**.

🌐 **[Live demo & docs →](https://kiboko-ai.github.io/react-path-picker/)**

```
[xPathInfo], Origin: http://localhost:3000, Project: /Users/me/dev/acme/webapp, Route: /dashboard, XPath: /html/body/div[2]/main, CSS: main.layout-content, React: DashboardPage (app/dashboard/page.tsx)
```

## How it works

Three clicks. From mystery DOM node to a clipboard-ready snippet your agent can paste straight into a fix:

1. **Click the aim icon** in the top-right of your dev build, or press `Alt+P`.
2. **Hover any element.** A teal overlay highlights it with a tooltip showing its tag, classes, and detected component.
3. **Click to copy.** Origin, project root, route, XPath, CSS selector, and React component name + source path land on your clipboard.

## Features

- **Smart XPath** — ID shortcuts and SVG-boundary detection produce minimal, readable expressions.
- **Unique CSS selector** — capped at 5 levels, auto-filters Ant Design / emotion `css-*` hash classes.
- **React component detection** — walks the React Fiber tree at runtime to find the nearest user component name and (with a small dev-only loader) its source file.
- **Knows which app it came from** — every pick carries the page `Origin` and the `Project` root, so an agent juggling several repos never patches the wrong one. The root is derived from React's dev source info; override it with the `project` prop when you want a name instead of a path.
- **Picks what a normal click can't** — disabled buttons and inputs, and elements inside popovers, dropdowns, and menus that would close the moment you press. While picking, the page never sees the press: nothing closes, nothing submits, nothing navigates.
- **Keyboard shortcut** — `Alt+P` arms the picker without a click, so anything hover- or focus-driven stays on screen. Change it with the `hotkey` prop, or pass `false` to turn it off.
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
| `onPick` | `(result, formatted) => void` | clipboard copy | Custom handler invoked after a successful pick |
| `hotkey` | `string \| false` | `"alt+p"` | Keyboard shortcut that toggles picking, e.g. `"ctrl+shift+k"`. `false` disables it |

### Picking inside popovers and menus

Overlays usually close on the press that opens the pick — `mousedown` for antd/rc-trigger, `pointerdown` for Radix. While the picker is armed it swallows the whole press before the page sees it, so the overlay stays put and the element you highlighted is the one you get. Disabled controls work the same way, even though the browser normally fires no press events on them at all.

Arming the picker is safe too — `PathPickerButton` keeps its own press off the page, so an open dropdown survives the click on the aim icon. If you built your own UI on `usePathPicker`, that press is yours to handle; reach for `Alt+P` instead.

Still out of reach: a tooltip rendered in a portal with `pointer-events: none`. It isn't under the cursor as far as the browser is concerned, and it has no parent to trace it back from, so the picker sees whatever sits behind it.

### Exports

- Root (`react-path-picker`): `PathPickerButton`, `usePathPicker`, `formatResult`, `PathPickerInspector`, `getXPath`, `getCssSelector`, `getReactComponent`
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
`mousedown`, Radix-style popovers that close on `pointerdown`, hover tooltips, and a modal backdrop.
A panel on the right logs every event the page actually received, so anything leaking through the
picker shows up in red. Needs network the first time — React loads from esm.sh.

## License

MIT — made by [Kiboko AI](https://kiboko.ai).
