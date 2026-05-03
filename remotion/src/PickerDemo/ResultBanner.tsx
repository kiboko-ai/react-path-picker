import React from 'react';
import {
  ACCENT,
  ACCENT_LIGHT,
  PAGE_BG_TOP,
  BORDER,
  TEXT_MUTED,
  FONT_MONO,
} from '../theme';

interface ResultBannerProps {
  route: string;
  xpath: string;
  cssSelector: string;
  reactComponent?: string;
  reactSource?: string;
  /** 0..1 entrance progress (0 = below screen, 1 = settled) */
  enter?: number;
  /** 0..1 exit fade (0 = visible, 1 = faded) */
  exit?: number;
}

export const ResultBanner: React.FC<ResultBannerProps> = ({
  route,
  xpath,
  cssSelector,
  reactComponent,
  reactSource,
  enter = 1,
  exit = 0,
}) => {
  const translateY = (1 - enter) * 80;
  const opacity = enter * (1 - exit);

  return (
    <div
      style={{
        position: 'absolute',
        left: 80,
        right: 80,
        bottom: 60,
        background: PAGE_BG_TOP,
        border: `1px solid ${BORDER}`,
        borderRadius: 14,
        padding: '18px 22px',
        fontFamily: FONT_MONO,
        fontSize: 18,
        lineHeight: 1.45,
        color: TEXT_MUTED,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        opacity,
        transform: `translateY(${translateY}px)`,
        boxShadow: `0 16px 40px rgba(0,0,0,0.45), 0 0 0 1px ${ACCENT}22`,
        zIndex: 170,
      }}
    >
      <span style={{ color: '#64748b', marginRight: 10 }}>[xPathInfo]</span>
      <span>Route: </span>
      <span style={{ color: ACCENT_LIGHT }}>{route}</span>
      <span>, XPath: </span>
      <span style={{ color: ACCENT }}>{xpath}</span>
      <span>, CSS: </span>
      <span style={{ color: ACCENT }}>{cssSelector}</span>
      {reactComponent && (
        <>
          <span>, React: </span>
          <span style={{ color: ACCENT_LIGHT }}>{reactComponent}</span>
          {reactSource && (
            <span style={{ color: '#64748b' }}> ({reactSource})</span>
          )}
        </>
      )}
    </div>
  );
};
