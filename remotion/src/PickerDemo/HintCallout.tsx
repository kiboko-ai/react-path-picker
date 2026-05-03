import React from 'react';
import { ACCENT, FONT_HAND } from '../theme';

interface HintCalloutProps {
  /** Anchor position (top-right of the picker button) */
  buttonRight: number;
  buttonTop: number;
  /** 0..1 visibility */
  opacity: number;
  /** Text scale pulse 0..1 (gentle pulsing) */
  pulse?: number;
}

export const HintCallout: React.FC<HintCalloutProps> = ({
  buttonRight,
  buttonTop,
  opacity,
  pulse = 0,
}) => {
  // Position the callout below-left of the button so the arrow points up-right at it.
  // containerTop tuned so the arrow tip (SVG y=14) lands just below the button bottom.
  const containerRight = buttonRight + 0;
  const containerTop = buttonTop - 4;
  const textScale = 1 + pulse * 0.06;

  return (
    <div
      style={{
        position: 'absolute',
        top: containerTop,
        right: containerRight,
        width: 320,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 6,
        opacity,
        pointerEvents: 'none',
        zIndex: 95,
      }}
    >
      <div
        style={{
          width: 200,
          height: 140,
          marginRight: 12,
          filter: 'drop-shadow(0 2px 5px rgba(0,0,0,0.55))',
        }}
      >
        <svg
          width="200"
          height="140"
          viewBox="0 0 200 140"
          fill="none"
          stroke={ACCENT}
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* squiggly hand-drawn curve from lower-left up to upper-right (toward button) */}
          <path d="M 18 128 C 6 100 38 88 40 76 C 42 62 18 54 46 40 C 64 34 48 26 76 22 C 104 18 130 16 178 14" />
          {/* arrowhead — symmetric V opening backward */}
          <path d="M 178 14 L 162 6" />
          <path d="M 178 14 L 162 24" />
        </svg>
      </div>
      <div
        style={{
          fontFamily: FONT_HAND,
          fontSize: 92,
          fontWeight: 700,
          lineHeight: 1,
          color: ACCENT,
          textShadow:
            '0 2px 8px rgba(0,0,0,0.6), 0 0 28px rgba(50,157,156,0.45)',
          transform: `rotate(-7deg) scale(${textScale})`,
          marginTop: -20,
          marginRight: 110,
          whiteSpace: 'nowrap',
        }}
      >
        Try it!
      </div>
    </div>
  );
};
