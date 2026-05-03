# react-path-picker demo video

Remotion composition that renders the path picker workflow demo embedded in
the docs site.

## Setup

```bash
cd remotion
npm install      # downloads Remotion + Chromium (~150MB, one-time)
```

## Develop

```bash
npm run dev      # opens Remotion Studio (http://localhost:3000)
```

Scrub the timeline of the `PickerDemo` composition to verify each sequence.

## Render

```bash
npm run render   # → out/path-picker-demo.mp4
npm run still    # → out/path-picker-demo-poster.png (frame 0)
```

After rendering, copy outputs into `docs/` and embed via `<video>` in the
hero section of `docs/index.html`.

## Composition

- Resolution: 1280×720 @ 30fps
- Duration: 360 frames (12s)
- Output codec: H.264 / CRF 20 (target file size ~1.5–3 MB)

## Design tokens

`src/theme.ts` mirrors the tokens used in `src/core/inspector.ts`,
`src/react/PathPickerButton.tsx`, and `docs/index.html`. If those change, sync
them here manually.
