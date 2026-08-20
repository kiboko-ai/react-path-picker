'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathPicker, type UsePathPickerOptions } from './usePathPicker';
import { describeHotkey } from './hotkey';

/** 버튼 위에서 페이지로 새어 나가면 안 되는 이벤트. */
const PRESS_EVENTS = ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'] as const;

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
  /**
   * Which codebase this app is, e.g. `"acme-web"` or `"/Users/me/dev/acme/webapp"`.
   * Copied output includes it so an agent working across repos knows where to look.
   * Omit to auto-derive the repo root from React's dev source info.
   */
  project?: string;
  /** Active accent color (default: #329D9C). */
  color?: string;
  /** Custom handler invoked after a single-element pick (default: clipboard copy). */
  onPick?: UsePathPickerOptions['onPick'];
  /**
   * Custom handler invoked when a multi-element selection is confirmed with Enter
   * (default: clipboard copy). Passing only `onPick` does not cover this path.
   */
  onPickMany?: UsePathPickerOptions['onPickMany'];
  /**
   * Keyboard shortcut that arms picking — double-tap `Shift` by default. Reach for it when
   * clicking the button would close what you want to pick, like an open dropdown.
   * Accepts `"alt+p"`-style combos, `"shift shift"`-style double-taps, or an array.
   * `false` disables it.
   */
  hotkey?: UsePathPickerOptions['hotkey'];
  /**
   * Shift+click accumulation (default: `true`).
   * `false` restores the original one-pick-then-close behavior.
   */
  multi?: UsePathPickerOptions['multi'];
}

export function PathPickerButton({
  pathname,
  project,
  color = '#329D9C',
  onPick,
  onPickMany,
  hotkey,
  multi,
}: PathPickerButtonProps) {
  const [hovered, setHovered] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const { isActive, justCopied, toggle } = usePathPicker({
    pathname,
    project,
    onPick,
    onPickMany,
    hotkey,
    multi,
  });

  const toggleRef = useRef(toggle);
  toggleRef.current = toggle;

  // 버튼을 누르는 것 자체가 페이지 입장에선 outside-click 이라, 열어둔 popover 가 픽을 시작하기도
  // 전에 닫혀 버린다. window capture 에서 눌림을 통째로 삼키고 토글은 여기서 직접 건다.
  useEffect(() => {
    // pointerdown 에서 preventDefault 하면 뒤따르는 mousedown·mouseup·click 이 통째로 사라진다.
    // 그래서 토글은 실제로 도착하는 첫 눌림에서 건다.
    const downType = typeof PointerEvent === 'undefined' ? 'mousedown' : 'pointerdown';

    const shield = (e: Event) => {
      const root = rootRef.current;
      if (!root || !(e.target instanceof Node) || !root.contains(e.target)) return;
      // 키보드로 누른 click(detail 0)은 아래 onClick 이 받아야 하므로 통과.
      if (e.type === 'click' && (e as MouseEvent).detail === 0) return;

      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      const el = e.target instanceof Element ? e.target : e.target.parentElement;
      if (
        e.type === downType &&
        (e as MouseEvent).button === 0 &&
        el?.closest('[data-pathpicker-toggle]')
      ) {
        toggleRef.current();
      }
    };

    for (const type of PRESS_EVENTS) window.addEventListener(type, shield, true);
    return () => {
      for (const type of PRESS_EVENTS) window.removeEventListener(type, shield, true);
    };
  }, []);

  const label = justCopied ? 'Copied!' : isActive ? 'Pick…' : null;
  const hotkeyLabel = describeHotkey(hotkey ?? 'shift shift');

  return (
    <div
      ref={rootRef}
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
        data-pathpicker-toggle=""
        onClick={toggle}
        title={`xPathInfo: pick an element to copy${hotkeyLabel ? ` (${hotkeyLabel})` : ''}`}
        style={{
          width: 24,
          height: 24,
          borderRadius: 6,
          border: 'none',
          background: isActive ? color : hovered ? `${color}26` : 'transparent',
          color: isActive ? '#fff' : color,
          boxShadow: isActive ? `0 4px 12px ${color}55` : 'none',
          filter: isActive
            ? 'none'
            : 'drop-shadow(0 1px 2px rgba(0,0,0,0.55)) drop-shadow(0 0 1px rgba(255,255,255,0.7))',
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
