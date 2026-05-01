'use client';

import { useState } from 'react';
import { usePathPicker, type UsePathPickerOptions } from './usePathPicker';

const AimIcon = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <circle cx="8" cy="8" r="5.5" />
    <circle cx="8" cy="8" r="1.5" fill="currentColor" stroke="none" />
    <line x1="8" y1="0" x2="8" y2="3" />
    <line x1="8" y1="13" x2="8" y2="16" />
    <line x1="0" y1="8" x2="3" y2="8" />
    <line x1="13" y1="8" x2="16" y2="8" />
  </svg>
);

export interface PathPickerButtonProps {
  /** Current route. Pass usePathname() in Next.js, useLocation().pathname in React Router, etc. */
  pathname?: string;
  /** Active accent color (default: #329D9C). */
  color?: string;
  /** Custom handler invoked after a successful pick (default: clipboard copy). */
  onPick?: UsePathPickerOptions['onPick'];
}

export function PathPickerButton({
  pathname,
  color = '#329D9C',
  onPick,
}: PathPickerButtonProps) {
  const [hovered, setHovered] = useState(false);
  const { isActive, justCopied, toggle } = usePathPicker({ pathname, onPick });

  const label = justCopied ? 'Copied!' : isActive ? 'Pick…' : null;

  return (
    <div
      data-pathpicker-ignore=""
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        zIndex: 99998,
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 2px 8px 8px',
      }}
    >
      {label && (
        <span
          style={{
            fontSize: 10,
            color: justCopied ? '#56C596' : color,
            background: justCopied ? 'rgba(86,197,150,0.1)' : `${color}18`,
            padding: '1px 6px',
            borderRadius: 3,
            fontWeight: 500,
            transition: 'all 0.2s',
          }}
        >
          {label}
        </span>
      )}
      <button
        onClick={toggle}
        title="xPathInfo: pick an element to copy"
        style={{
          width: 24,
          height: 24,
          borderRadius: 6,
          border: isActive ? `1.5px solid ${color}` : '1px solid rgba(255,255,255,0.22)',
          background: isActive ? color : 'rgba(15,23,42,0.78)',
          color: isActive ? '#fff' : hovered ? '#fff' : 'rgba(226,232,240,0.95)',
          boxShadow: isActive
            ? `0 0 0 1px ${color}55, 0 8px 20px rgba(0,0,0,0.35)`
            : '0 0 0 1px rgba(255,255,255,0.15), 0 6px 16px rgba(0,0,0,0.4)',
          backdropFilter: 'blur(4px) saturate(120%)',
          WebkitBackdropFilter: 'blur(4px) saturate(120%)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11,
          transition: 'all 0.2s',
          padding: 0,
        }}
      >
        <AimIcon />
      </button>
    </div>
  );
}

export default PathPickerButton;
