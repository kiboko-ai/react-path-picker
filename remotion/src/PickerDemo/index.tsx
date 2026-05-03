import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { loadFont as loadCaveat } from '@remotion/google-fonts/Caveat';
import { loadFont as loadJetBrainsMono } from '@remotion/google-fonts/JetBrainsMono';
import { loadFont as loadInter } from '@remotion/google-fonts/Inter';

import { FauxBrowser } from './FauxBrowser';
import { FauxPage, TARGETS } from './FauxPage';
import { PickerButton } from './PickerButton';
import { HintCallout } from './HintCallout';
import { Cursor } from './Cursor';
import { HighlightOverlay } from './HighlightOverlay';
import { Tooltip } from './Tooltip';
import { ResultBanner } from './ResultBanner';
import { PAGE_BG_TOP, PAGE_BG_BOTTOM } from '../theme';

loadCaveat();
loadJetBrainsMono();
loadInter();

// Browser inset = 24, chrome = 36px tall
const PAGE_OFFSET_X = 24;
const PAGE_OFFSET_Y = 24 + 36;

// Picker button is mounted in the page coord space (top-right of page area)
const BUTTON_RIGHT_IN_PAGE = 16;
const BUTTON_TOP_IN_PAGE = 14;

// Cursor keyframes (in absolute video canvas coords)
// Picker button center (used as cursor target for click 1)
const BUTTON_CENTER_X_VIDEO =
  // canvas width - browser inset - button right offset - half button
  1280 - 24 - BUTTON_RIGHT_IN_PAGE - 18;
const BUTTON_CENTER_Y_VIDEO = PAGE_OFFSET_Y + BUTTON_TOP_IN_PAGE + 18;

// Page-area target centers (translate by page offset)
const heroCenter = {
  x: PAGE_OFFSET_X + TARGETS.hero.x + TARGETS.hero.width / 2,
  y: PAGE_OFFSET_Y + TARGETS.hero.y + TARGETS.hero.height / 2,
};
const codeCenter = {
  x: PAGE_OFFSET_X + TARGETS.codeBlock.x + TARGETS.codeBlock.width / 2,
  y: PAGE_OFFSET_Y + TARGETS.codeBlock.y + TARGETS.codeBlock.height / 2,
};
const ctaCenter = {
  x: PAGE_OFFSET_X + TARGETS.ctaButton.x + TARGETS.ctaButton.width / 2,
  y: PAGE_OFFSET_Y + TARGETS.ctaButton.y + TARGETS.ctaButton.height / 2,
};

interface CursorKeyframe {
  frame: number;
  x: number;
  y: number;
}

const cursorKeyframes: CursorKeyframe[] = [
  // Start off-screen bottom-left
  { frame: 0, x: -60, y: 720 },
  { frame: 20, x: -40, y: 700 },
  // Move to picker button by frame 80
  { frame: 80, x: BUTTON_CENTER_X_VIDEO, y: BUTTON_CENTER_Y_VIDEO },
  { frame: 95, x: BUTTON_CENTER_X_VIDEO, y: BUTTON_CENTER_Y_VIDEO },
  // Move to hero (h1) by frame 140
  { frame: 140, x: heroCenter.x, y: heroCenter.y },
  { frame: 170, x: heroCenter.x, y: heroCenter.y },
  // Move to code block by frame 210
  { frame: 210, x: codeCenter.x, y: codeCenter.y },
  // Move to CTA button by frame 260
  { frame: 260, x: ctaCenter.x, y: ctaCenter.y },
  { frame: 285, x: ctaCenter.x, y: ctaCenter.y },
  // Drift slightly after pick
  { frame: 360, x: ctaCenter.x + 20, y: ctaCenter.y + 60 },
];

function cursorAt(frame: number) {
  for (let i = 0; i < cursorKeyframes.length - 1; i++) {
    const a = cursorKeyframes[i];
    const b = cursorKeyframes[i + 1];
    if (frame >= a.frame && frame <= b.frame) {
      return {
        x: interpolate(frame, [a.frame, b.frame], [a.x, b.x], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        }),
        y: interpolate(frame, [a.frame, b.frame], [a.y, b.y], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        }),
      };
    }
  }
  const last = cursorKeyframes[cursorKeyframes.length - 1];
  return { x: last.x, y: last.y };
}

// 0..1 click bursts at frames F that decay over ~12 frames
function clickPulse(frame: number, clickFrame: number) {
  if (frame < clickFrame || frame > clickFrame + 14) return 0;
  const progress = (frame - clickFrame) / 14;
  return 1 - progress;
}

export const PickerDemo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Page fade-in
  const pageOpacity = interpolate(frame, [0, 18], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Hint callout: pulse 0..1 modulating, fade out by frame 90
  const hintOpacity = interpolate(frame, [10, 22, 80, 92], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const hintPulse =
    0.5 + 0.5 * Math.sin((frame / fps) * Math.PI * 1.5);

  // Picker active state: 0 before frame 88, ramps to 1 by frame 95
  const buttonActive = interpolate(frame, [85, 95], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Cursor click pulses at button click (frame 88) and target click (frame 270)
  const cursorClick = Math.max(
    clickPulse(frame, 88),
    clickPulse(frame, 270),
  );

  // Cursor position
  const { x: cursorX, y: cursorY } = cursorAt(frame);

  // Picker label state (Pick… / Copied!)
  // Pick… visible from frame 95 → 270; Copied! from 270 → 320
  const pickLabelOpacity = interpolate(frame, [95, 105, 268, 272], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const copiedLabelOpacity = interpolate(
    frame,
    [272, 280, 330, 345],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  let labelText = '';
  let labelOpacity = 0;
  let copied = false;
  if (copiedLabelOpacity > pickLabelOpacity) {
    labelText = 'Copied!';
    labelOpacity = copiedLabelOpacity;
    copied = true;
  } else if (pickLabelOpacity > 0) {
    labelText = 'Pick…';
    labelOpacity = pickLabelOpacity;
  }

  // Highlight + tooltip — visible only after picking starts (frame 95)
  // Switch target based on cursor position window
  // 95–170: hero | 170–225: code | 225–290: cta | 290+: hidden after click flash
  let highlightTarget: { x: number; y: number; width: number; height: number } | null =
    null;
  let tooltip: { tag: string; component?: string } | null = null;

  if (frame >= 95 && frame < 170) {
    highlightTarget = {
      x: PAGE_OFFSET_X + TARGETS.hero.x,
      y: PAGE_OFFSET_Y + TARGETS.hero.y,
      width: TARGETS.hero.width,
      height: TARGETS.hero.height,
    };
    tooltip = { tag: '<h1.gradient-text>', component: 'HeroTitle' };
  } else if (frame >= 170 && frame < 225) {
    highlightTarget = {
      x: PAGE_OFFSET_X + TARGETS.codeBlock.x,
      y: PAGE_OFFSET_Y + TARGETS.codeBlock.y,
      width: TARGETS.codeBlock.width,
      height: TARGETS.codeBlock.height,
    };
    tooltip = { tag: '<pre.language-tsx>', component: 'CodeBlock' };
  } else if (frame >= 225 && frame < 295) {
    highlightTarget = {
      x: PAGE_OFFSET_X + TARGETS.ctaButton.x,
      y: PAGE_OFFSET_Y + TARGETS.ctaButton.y,
      width: TARGETS.ctaButton.width,
      height: TARGETS.ctaButton.height,
    };
    tooltip = { tag: '<button.cta>', component: 'CtaButton' };
  }

  // Highlight flash on click (frame 270): brief brightness spike
  const highlightOpacity = highlightTarget
    ? Math.min(
        1,
        interpolate(frame, [95, 105], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        }) +
          (frame >= 270 && frame < 285
            ? interpolate(frame, [270, 277, 285], [0, 0.5, 0])
            : 0),
      )
    : 0;

  // Result banner — slides up after click (frame 285), peaks ~315, holds, then exit fade 345-360
  const resultEnter = spring({
    frame: frame - 285,
    fps,
    config: { damping: 14, stiffness: 80, mass: 0.8 },
  });
  const resultExit = interpolate(frame, [345, 360], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, ${PAGE_BG_TOP} 0%, #020617 100%)`,
      }}
    >
      <AbsoluteFill style={{ opacity: pageOpacity }}>
        <FauxBrowser>
          <FauxPage />
          {/* Picker button mounted in page coord space (top-right) */}
          <PickerButton
            x={BUTTON_RIGHT_IN_PAGE}
            y={BUTTON_TOP_IN_PAGE}
            active={buttonActive}
            click={clickPulse(frame, 88)}
            label={labelText}
            labelOpacity={labelOpacity}
            copied={copied}
          />
          {/* Hint callout */}
          {hintOpacity > 0 && (
            <HintCallout
              buttonRight={BUTTON_RIGHT_IN_PAGE}
              buttonTop={BUTTON_TOP_IN_PAGE}
              opacity={hintOpacity}
              pulse={hintPulse}
            />
          )}
        </FauxBrowser>
      </AbsoluteFill>

      {/* Highlight + tooltip live in canvas-absolute coords */}
      {highlightTarget && (
        <HighlightOverlay {...highlightTarget} opacity={highlightOpacity} />
      )}
      {tooltip && highlightTarget && (
        <Tooltip
          x={highlightTarget.x}
          y={highlightTarget.y + highlightTarget.height + 8}
          tag={tooltip.tag}
          componentName={tooltip.component}
          opacity={highlightOpacity}
        />
      )}

      {/* Cursor (always last so it's on top) */}
      <Cursor x={cursorX} y={cursorY} click={cursorClick} />

      {/* Result banner */}
      {frame >= 285 && (
        <ResultBanner
          route="/"
          xpath="/html/body/main/section[1]/button"
          cssSelector="main > section.hero > button.cta"
          reactComponent="CtaButton"
          reactSource="app/page.tsx"
          enter={Math.min(1, resultEnter)}
          exit={resultExit}
        />
      )}
    </AbsoluteFill>
  );
};
