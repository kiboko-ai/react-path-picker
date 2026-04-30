# react-path-picker

Dev-only DOM inspector for React/Next.js apps.

Click an element → copy `[xPathInfo] Route, XPath, CSS, React` to clipboard.

## Quick Start

Pick one. The Prompt tab is the default — your AI agent does the wiring for you.

### [Prompt 방식 (기본)]

Paste this prompt into Claude Code, Cursor, Codex, or any AI coding agent that has shell + filesystem access in your project. It will install and wire `react-path-picker` for you — no copy-pasting snippets.

````
Install and wire up react-path-picker into this project.
Repo: https://github.com/kiboko-ai/react-path-picker

Steps:
1. Detect the framework (Next.js App Router, Pages Router, or React with React Router / Vite).
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

Do not modify production code paths or render the picker in production builds.
````

That's it — your agent reads this repo and handles the rest.

---

### [Manual 방식 (옵션)]

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
| `color` | `string` | `#329D9C` | Active color |

### Exports

- Root: `PathPickerButton`, `usePathPicker`, `PathPickerInspector`, `getXPath`, `getCssSelector`, `getReactComponent`
- Subpath: `react-path-picker/core`

## Development

```bash
npm install
npm run typecheck
npm test
npm run build
npm pack
```

## Publish (npm public)

1. Login: `npm login`
2. Check name availability: `npm view react-path-picker name`
3. Dry run: `npm pack`
4. Publish: `npm publish --access public`
5. Create GitHub release/tag after publish (recommended).

## License

MIT
