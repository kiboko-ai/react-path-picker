import React from 'react';
import { ACCENT, ICON_DROP_SHADOW } from '../theme';

interface PickerButtonProps {
  /** Top-right anchor in the page */
  x: number;
  y: number;
  /** 0 = idle, 1 = active */
  active: number;
  /** Click pulse 0..1 */
  click?: number;
  /** Label text right of button — empty hides it */
  label?: string;
  /** Label opacity 0..1 */
  labelOpacity?: number;
  /** justCopied state for label color */
  copied?: boolean;
}

export const PickerButton: React.FC<PickerButtonProps> = ({
  x,
  y,
  active,
  click = 0,
  label,
  labelOpacity = 1,
  copied = false,
}) => {
  const labelColor = copied ? '#56C596' : ACCENT;
  const labelBg = copied
    ? 'rgba(86,197,150,0.12)'
    : `${ACCENT}1f`;

  // Interpolate background between transparent and accent based on active
  const bg =
    active > 0.05
      ? `rgba(50,157,156,${active})`
      : 'transparent';

  const iconColor =
    active > 0.5
      ? '#fff'
      : ACCENT;

  const filter = active > 0.5 ? 'none' : ICON_DROP_SHADOW;
  const shadow =
    active > 0.5
      ? `0 4px 12px ${ACCENT}66`
      : 'none';
  const scale = 1 - click * 0.12;

  return (
    <div
      style={{
        position: 'absolute',
        right: x,
        top: y,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        zIndex: 90,
      }}
    >
      {label && (
        <span
          style={{
            fontSize: 13,
            color: labelColor,
            background: labelBg,
            padding: '3px 9px',
            borderRadius: 4,
            fontWeight: 500,
            fontFamily:
              '"Inter", system-ui, -apple-system, sans-serif',
            opacity: labelOpacity,
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </span>
      )}
      <button
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          border: 'none',
          background: bg,
          color: iconColor,
          boxShadow: shadow,
          filter,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
          transform: `scale(${scale})`,
          transformOrigin: 'center',
        }}
      >
        <svg
          width="18"
          height="18"
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
      </button>
    </div>
  );
};
