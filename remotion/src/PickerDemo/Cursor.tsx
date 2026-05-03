import React from 'react';
import { ACCENT } from '../theme';

interface CursorProps {
  x: number;
  y: number;
  /** 0..1 click ripple intensity */
  click?: number;
}

export const Cursor: React.FC<CursorProps> = ({ x, y, click = 0 }) => {
  const rippleScale = 1 + click * 2.2;
  const rippleOpacity = (1 - click) * 0.6;

  return (
    <>
      {click > 0 && (
        <div
          style={{
            position: 'absolute',
            left: x - 18,
            top: y - 18,
            width: 36,
            height: 36,
            borderRadius: '50%',
            border: `2px solid ${ACCENT}`,
            transform: `scale(${rippleScale})`,
            opacity: rippleOpacity,
            pointerEvents: 'none',
            zIndex: 199,
          }}
        />
      )}
      <svg
        width="32"
        height="32"
        viewBox="0 0 32 32"
        style={{
          position: 'absolute',
          left: x - 4,
          top: y - 2,
          zIndex: 200,
          filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.5))',
          transform: `scale(${1 - click * 0.08})`,
          transformOrigin: '4px 2px',
        }}
      >
        <path
          d="M 4 2 L 4 24 L 10 18 L 14 26 L 17 24 L 13 16 L 21 16 Z"
          fill="#fff"
          stroke="#1e293b"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
    </>
  );
};
