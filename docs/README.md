# react-path-picker

> **Click any element. Get its XPath, CSS selector, and React component — instantly.**
> A dev-only DOM inspector for React / Next.js (and plain HTML) that turns "the green button on the right" into a paste-ready clipboard string your AI agent can actually use.

- 📦 npm: <https://www.npmjs.com/package/react-path-picker>
- 💻 Source: <https://github.com/kiboko-ai/react-path-picker>
- 🌐 Live demo & docs: <https://kiboko-ai.github.io/react-path-picker/>

```bash
npm install react-path-picker
```

```tsx
// app/layout.tsx (Next.js App Router)
import { PathPickerButton } from 'react-path-picker';
import { usePathname } from 'next/navigation';

export default function RootLayout({ children }) {
  const pathname = usePathname();
  return (
    <html><body>
      {process.env.NODE_ENV !== 'production' && <PathPickerButton pathname={pathname} />}
      {children}
    </body></html>
  );
}
```

Output on the clipboard:

```
[xPathInfo] Route: /checkout, XPath: /html/body/div[2]/footer/button[2],
            CSS: button.btn-primary, React: BuyButton (components/BuyButton.tsx)
```

---

## About this folder

This folder hosts the static landing page deployed at <https://kiboko-ai.github.io/react-path-picker/>.

- `index.html` — single-file landing page (Tailwind + Prism via CDN, no build step).
- `path-picker-demo.mp4` / `path-picker-demo-poster.png` — hero demo video and poster.
- `favicon.png` — site favicon.

The page covers:

- **Hero** — pitch, before/after comparison, target-agent pills, install command, trust signals, demo video.
- **How it works** — three-step usage flow + "where you can paste the result".
- **Features** — outcome-framed feature cards + comparison vs Browser Inspect / React DevTools.
- **Quick Start** — Prompt-for-AI-agent (default) and Manual snippets for Next.js App / Pages Router and React Router. Includes a production-safe callout.
- **Core API** — vanilla TS snippet using `PathPickerInspector`, `getXPath`, `getCssSelector`, plus a compact export reference table.

## View locally

Single HTML file, no build tooling. Open it directly:

```bash
open docs/index.html
# or serve it (any static server works)
npx serve docs
```

## Editing

- Tailwind via the CDN (`cdn.tailwindcss.com`) — classes work out of the box, no rebuild.
- Code blocks use Prism's Tomorrow theme. Add a language by importing `prism-<lang>.min.js` in `<head>`.
- Tabs and copy buttons are powered by the small inline `<script>` at the bottom of `index.html`.
- The live in-page inspector is loaded from `https://esm.sh/react-path-picker/core` at the very bottom.

## License

MIT

<!-- redeploy-marker -->
