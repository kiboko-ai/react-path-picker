# react-path-picker

Dev-only DOM inspector for React/Next.js apps.

Click an element → copy `[xPathInfo] Route, XPath, CSS, React` to clipboard.

## Install

```bash
npm install react-path-picker
```

## Quick Start

### Next.js (App Router)

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

Add it to `app/layout.tsx` (inside `<body>`).

### Next.js (Pages Router)

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

### React Router

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
