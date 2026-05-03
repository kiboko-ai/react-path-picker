import React from 'react';
import {
  ACCENT,
  ACCENT_LIGHT,
  PAGE_BG_TOP,
  BORDER,
  TEXT_PRIMARY,
  TEXT_MUTED,
  FONT_MONO,
  FONT_SANS,
} from '../theme';

/**
 * Static faux page contents. Coordinates of inspectable elements are
 * exported so the composition can drive the cursor and overlay onto them
 * without measuring the DOM (Remotion can't measure during render).
 */

export const TARGETS = {
  // x, y, width, height in absolute pixels within the page content area
  hero: { x: 80, y: 60, width: 800, height: 150 },
  codeBlock: { x: 80, y: 250, width: 720, height: 150 },
  ctaButton: { x: 80, y: 440, width: 280, height: 56 },
} as const;

export const FauxPage: React.FC = () => (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      padding: '60px 80px',
      fontFamily: FONT_SANS,
      color: TEXT_PRIMARY,
    }}
  >
    {/* Hero h1 */}
    <h1
      style={{
        position: 'absolute',
        left: TARGETS.hero.x,
        top: TARGETS.hero.y,
        width: TARGETS.hero.width,
        height: TARGETS.hero.height,
        margin: 0,
        fontSize: 56,
        fontWeight: 800,
        lineHeight: 1.1,
        background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_LIGHT})`,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
      }}
    >
      One click saves a thousand tokens.
    </h1>

    {/* Code block */}
    <pre
      style={{
        position: 'absolute',
        left: TARGETS.codeBlock.x,
        top: TARGETS.codeBlock.y,
        width: TARGETS.codeBlock.width,
        height: TARGETS.codeBlock.height,
        margin: 0,
        padding: '14px 18px',
        background: PAGE_BG_TOP,
        border: `1px solid ${BORDER}`,
        borderRadius: 12,
        fontFamily: FONT_MONO,
        fontSize: 15,
        lineHeight: 1.55,
        color: TEXT_MUTED,
        overflow: 'hidden',
      }}
    >
      <span style={{ color: '#a78bfa' }}>import</span>{' '}
      <span style={{ color: TEXT_PRIMARY }}>{'{ PathPickerButton }'}</span>{' '}
      <span style={{ color: '#a78bfa' }}>from</span>{' '}
      <span style={{ color: ACCENT_LIGHT }}>'react-path-picker'</span>;{'\n'}
      {'\n'}
      <span style={{ color: '#a78bfa' }}>export default function</span>{' '}
      <span style={{ color: '#fde047' }}>DevPicker</span>() {'{'}
      {'\n'}
      {'  '}<span style={{ color: '#a78bfa' }}>return</span>{' '}
      <span style={{ color: TEXT_PRIMARY }}>{'<PathPickerButton />'}</span>;{'\n'}
      {'}'}
    </pre>

    {/* CTA button (the click target) */}
    <button
      style={{
        position: 'absolute',
        left: TARGETS.ctaButton.x,
        top: TARGETS.ctaButton.y,
        width: TARGETS.ctaButton.width,
        height: TARGETS.ctaButton.height,
        background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_LIGHT})`,
        color: '#fff',
        fontSize: 18,
        fontWeight: 600,
        border: 'none',
        borderRadius: 10,
        cursor: 'pointer',
        boxShadow: `0 10px 24px ${ACCENT}55`,
        fontFamily: FONT_SANS,
      }}
    >
      Get the AI agent prompt
    </button>
  </div>
);
