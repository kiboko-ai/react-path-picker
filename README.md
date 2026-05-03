# react-path-picker

> ## One click saves a thousand tokens.

Stop describing UI elements to your AI agent. Click any element on your dev build, paste the exact XPath, CSS selector, and React component name straight into **Cursor / Claude Code / Codex**.

🌐 **[Live demo & docs →](https://kiboko-ai.github.io/react-path-picker/)**

```
[xPathInfo] Route: /dashboard, XPath: /html/body/div[2]/main, CSS: main.layout-content, React: DashboardPage (app/dashboard/page.tsx)
```

## How it works

Three clicks. From mystery DOM node to a clipboard-ready snippet your agent can paste straight into a fix:

1. **Click the aim icon** in the top-right of your dev build.
2. **Hover any element.** A teal overlay highlights it with a tooltip showing its tag, classes, and detected component.
3. **Click to copy.** Route, XPath, CSS selector, and React component name + source path land on your clipboard.

## Features

- **Smart XPath** — ID shortcuts and SVG-boundary detection produce minimal, readable expressions.
- **Unique CSS selector** — capped at 5 levels, auto-filters Ant Design / emotion `css-*` hash classes.
- **React component detection** — walks the React Fiber tree at runtime to find the nearest user component name and (with a small dev-only loader) its source file.
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
          `[xPathInfo] Route: ${r.route}, XPath: ${r.xpath}, CSS: ${r.cssSelector}`
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
| `color` | `string` | `#329D9C` | Active accent color |
| `onPick` | `(result, formatted) => void` | clipboard copy | Custom handler invoked after a successful pick |

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

## License

MIT — made by [Kiboko AI](https://kiboko.ai).
