import React from 'react';
import { TOOLTIP_BG, TOOLTIP_TEXT, FONT_MONO } from '../theme';

interface TooltipProps {
  x: number;
  y: number;
  tag: string;
  componentName?: string;
  opacity?: number;
}

export const Tooltip: React.FC<TooltipProps> = ({
  x,
  y,
  tag,
  componentName,
  opacity = 1,
}) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: y,
      background: TOOLTIP_BG,
      color: TOOLTIP_TEXT,
      fontFamily: FONT_MONO,
      fontSize: 13,
      lineHeight: 1.5,
      padding: '6px 10px',
      borderRadius: 6,
      whiteSpace: 'pre-line',
      maxWidth: 460,
      pointerEvents: 'none',
      zIndex: 160,
      opacity,
      boxShadow: '0 6px 18px rgba(0,0,0,0.4)',
    }}
  >
    {componentName ? `${tag}\n${componentName}` : tag}
  </div>
);
