'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { PathPickerInspector } from '../core/inspector';
import type { PathPickerResult } from '../core/types';

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function formatResult(r: PathPickerResult): string {
  const lines = ['[xPathInfo]'];
  if (r.origin) lines.push(`Origin: ${r.origin}`);
  if (r.project) lines.push(`Project: ${r.project}`);
  lines.push(`Route: ${r.route}`, `XPath: ${r.xpath}`, `CSS: ${r.cssSelector}`);
  if (r.reactComponent) {
    const src = r.reactSource ? ` (${r.reactSource})` : '';
    lines.push(`React: ${r.reactComponent}${src}`);
  }
  return lines.join(', ');
}

const DEFAULT_HOTKEY = 'alt+p';

/**
 * `"alt+p"`, `"ctrl+shift+k"` 같은 조합을 실제 keydown 과 대조한다.
 * Alt 조합은 브라우저가 e.key 를 다른 문자로 바꿔 주므로(macOS 의 Alt+P → π) 물리 키를 먼저 본다.
 */
function matchesHotkey(e: KeyboardEvent, spec: string): boolean {
  const parts = spec
    .toLowerCase()
    .split('+')
    .map((p) => p.trim())
    .filter(Boolean);
  const key = parts.pop();
  if (!key) return false;

  const want = { alt: false, ctrl: false, meta: false, shift: false };
  for (const p of parts) {
    if (p === 'alt' || p === 'option' || p === 'opt') want.alt = true;
    else if (p === 'ctrl' || p === 'control') want.ctrl = true;
    else if (p === 'meta' || p === 'cmd' || p === 'command') want.meta = true;
    else if (p === 'shift') want.shift = true;
    else return false;
  }

  if (
    e.altKey !== want.alt ||
    e.ctrlKey !== want.ctrl ||
    e.metaKey !== want.meta ||
    e.shiftKey !== want.shift
  ) {
    return false;
  }

  if (/^[a-z]$/.test(key) && e.code === `Key${key.toUpperCase()}`) return true;
  if (/^[0-9]$/.test(key) && e.code === `Digit${key}`) return true;
  return e.key.toLowerCase() === key;
}

export interface UsePathPickerOptions {
  /** Current route. Defaults to window.location.pathname when omitted. */
  pathname?: string;
  /**
   * Which codebase this app is, e.g. `"acme-web"` or `"/Users/me/dev/acme/webapp"`.
   * Copied output includes it so an agent working across repos knows where to look.
   * Omit to auto-derive the repo root from React's dev source info.
   */
  project?: string;
  /** Custom handler invoked after a successful pick. Defaults to clipboard copy. */
  onPick?: (result: PathPickerResult, formatted: string) => void;
  /**
   * Keyboard shortcut that toggles picking — `"alt+p"` by default.
   * Use it when clicking the button would close what you want to pick: an open dropdown or
   * popover survives a keystroke, but not an outside click. Pass `false` to disable.
   */
  hotkey?: string | false;
}

export function usePathPicker(options?: string | UsePathPickerOptions) {
  const opts: UsePathPickerOptions =
    typeof options === 'string' ? { pathname: options } : options ?? {};
  const { pathname, project, onPick: onPickProp, hotkey = DEFAULT_HOTKEY } = opts;

  const [isActive, setIsActive] = useState(false);
  const [justCopied, setJustCopied] = useState(false);
  const inspectorRef = useRef<PathPickerInspector | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const getRoute = useCallback(
    () => pathname ?? (typeof window !== 'undefined' ? window.location.pathname : '/'),
    [pathname],
  );

  const getProject = useCallback(() => project ?? null, [project]);

  const handlePick = useCallback(
    (result: PathPickerResult) => {
      const text = formatResult(result);
      if (onPickProp) {
        onPickProp(result, text);
      } else {
        copyToClipboard(text).catch(() => {});
      }
      setIsActive(false);
      setJustCopied(true);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setJustCopied(false), 1200);
    },
    [onPickProp],
  );

  const handleCancel = useCallback(() => {
    setIsActive(false);
  }, []);

  const toggle = useCallback(() => {
    setIsActive((prev) => {
      if (prev) {
        inspectorRef.current?.deactivate();
        return false;
      }
      return true;
    });
  }, []);

  useEffect(() => {
    if (hotkey === false || typeof window === 'undefined') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || !matchesHotkey(e, hotkey)) return;
      e.preventDefault();
      e.stopPropagation();
      toggle();
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [hotkey, toggle]);

  useEffect(() => {
    if (!isActive) return;
    const inspector = new PathPickerInspector({
      onPick: handlePick,
      onCancel: handleCancel,
      getRoute,
      getProject,
    });
    inspectorRef.current = inspector;
    inspector.activate();
    return () => inspector.deactivate();
  }, [isActive, handlePick, handleCancel, getRoute, getProject]);

  useEffect(() => {
    return () => {
      inspectorRef.current?.deactivate();
      clearTimeout(timerRef.current);
    };
  }, []);

  return { isActive, justCopied, toggle };
}
