import React from 'react';
import {
  PAGE_BG_TOP,
  PAGE_BG_BOTTOM,
  BORDER,
  TEXT_MUTED,
  FONT_MONO,
} from '../theme';

interface FauxBrowserProps {
  children: React.ReactNode;
}

export const FauxBrowser: React.FC<FauxBrowserProps> = ({ children }) => (
  <div
    style={{
      position: 'absolute',
      inset: 24,
      borderRadius: 16,
      overflow: 'hidden',
      background: `linear-gradient(180deg, ${PAGE_BG_TOP} 0%, ${PAGE_BG_BOTTOM} 100%)`,
      boxShadow: '0 30px 80px rgba(0,0,0,0.5)',
      border: `1px solid ${BORDER}`,
      display: 'flex',
      flexDirection: 'column',
    }}
  >
    {/* Browser chrome */}
    <div
      style={{
        height: 36,
        background: 'rgba(15,23,42,0.85)',
        borderBottom: `1px solid ${BORDER}`,
        display: 'flex',
        alignItems: 'center',
        padding: '0 14px',
        gap: 10,
        flexShrink: 0,
      }}
    >
      <span
        style={{
          width: 11,
          height: 11,
          borderRadius: '50%',
          background: '#f87171',
        }}
      />
      <span
        style={{
          width: 11,
          height: 11,
          borderRadius: '50%',
          background: '#fbbf24',
        }}
      />
      <span
        style={{
          width: 11,
          height: 11,
          borderRadius: '50%',
          background: '#34d399',
        }}
      />
      <div
        style={{
          flex: 1,
          marginLeft: 14,
          height: 20,
          borderRadius: 5,
          background: 'rgba(15,23,42,0.7)',
          border: `1px solid ${BORDER}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: FONT_MONO,
          fontSize: 11,
          color: TEXT_MUTED,
          maxWidth: 360,
        }}
      >
        kiboko-ai.github.io/react-path-picker
      </div>
      <div style={{ flex: 1 }} />
    </div>

    {/* Page content */}
    <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
      {children}
    </div>
  </div>
);
