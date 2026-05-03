import React from 'react';
import { HIGHLIGHT_BG, HIGHLIGHT_BORDER } from '../theme';

interface HighlightOverlayProps {
  x: number;
  y: number;
  width: number;
  height: number;
  opacity?: number;
}

export const HighlightOverlay: React.FC<HighlightOverlayProps> = ({
  x,
  y,
  width,
  height,
  opacity = 1,
}) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: y,
      width,
      height,
      background: HIGHLIGHT_BG,
      border: `2px solid ${HIGHLIGHT_BORDER}`,
      borderRadius: 4,
      opacity,
      pointerEvents: 'none',
      zIndex: 150,
      boxShadow: `0 0 24px ${HIGHLIGHT_BORDER}33`,
    }}
  />
);
