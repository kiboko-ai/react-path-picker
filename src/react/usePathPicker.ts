'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { PathPickerInspector } from '../core/inspector';
import type { PathPickerResult } from '../core/types';
import { createHotkeyMatcher } from './hotkey';

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

/**
 * 여러 개를 한 번에 넘길 때의 표기. Origin·Project·Route 는 어차피 같은 페이지라
 * 맨 위에 한 번만 쓰고 아래에 번호를 붙인다 — 반복이 곧 토큰이다.
 * 하나뿐이면 formatResult 그대로라 단일 픽 출력은 달라지지 않는다.
 */
export function formatResults(results: PathPickerResult[]): string {
  if (results.length === 0) return '';
  if (results.length === 1) return formatResult(results[0]);

  const first = results[0];
  const head = [`[xPathInfo] ${results.length} elements`];
  if (first.origin) head.push(`Origin: ${first.origin}`);
  if (first.project) head.push(`Project: ${first.project}`);
  head.push(`Route: ${first.route}`);

  const lines = results.map((r, i) => {
    const parts = [`XPath: ${r.xpath}`, `CSS: ${r.cssSelector}`];
    if (r.reactComponent) {
      const src = r.reactSource ? ` (${r.reactSource})` : '';
      parts.push(`React: ${r.reactComponent}${src}`);
    }
    return `${i + 1}. ${parts.join(', ')}`;
  });

  return [head.join(', '), ...lines].join('\n');
}

/**
 * 수식키 더블탭. 브라우저가 아무것도 바인딩하지 않는 사실상 유일한 자리라
 * 어떤 브라우저 단축키와도 겹치지 않는다. 근거는 ./hotkey.ts 주석.
 */
const DEFAULT_HOTKEY = 'shift shift';

/** 스펙 자체에는 절대 안 들어가는 문자. 공백은 더블탭 문법이 이미 쓰고 있다. */
const SPEC_SEPARATOR = ',';

export interface UsePathPickerOptions {
  /** Current route. Defaults to window.location.pathname when omitted. */
  pathname?: string;
  /**
   * Which codebase this app is, e.g. `"acme-web"` or `"/Users/me/dev/acme/webapp"`.
   * Copied output includes it so an agent working across repos knows where to look.
   * Omit to auto-derive the repo root from React's dev source info.
   */
  project?: string;
  /** Custom handler invoked after a single-element pick. Defaults to clipboard copy. */
  onPick?: (result: PathPickerResult, formatted: string) => void;
  /**
   * Custom handler invoked when a multi-element selection is confirmed with Enter.
   * Defaults to clipboard copy — passing only `onPick` does not cover this path.
   */
  onPickMany?: (results: PathPickerResult[], formatted: string) => void;
  /**
   * Keyboard shortcut that arms picking — double-tap `Shift` by default. Reach for it when
   * clicking the button would close what you want to pick: an open dropdown or popover
   * survives a keystroke, but not an outside click.
   *
   * Accepts a combo (`"alt+p"`, toggles), a double-tap (`"shift shift"`, arms only), or an
   * array of either. `false` turns it off.
   */
  hotkey?: string | string[] | false;
  /**
   * Shift+click accumulation and drag-region select. `true` by default.
   * Set `false` for the original one-pick-then-close behavior.
   */
  multi?: boolean;
}

export function usePathPicker(options?: string | UsePathPickerOptions) {
  const opts: UsePathPickerOptions =
    typeof options === 'string' ? { pathname: options } : options ?? {};
  const {
    pathname,
    project,
    onPick: onPickProp,
    onPickMany: onPickManyProp,
    hotkey = DEFAULT_HOTKEY,
    multi = true,
  } = opts;

  const [isActive, setIsActive] = useState(false);
  const [justCopied, setJustCopied] = useState(false);
  const inspectorRef = useRef<PathPickerInspector | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const getRoute = useCallback(
    () => pathname ?? (typeof window !== 'undefined' ? window.location.pathname : '/'),
    [pathname],
  );

  const getProject = useCallback(() => project ?? null, [project]);

  const settle = useCallback(() => {
    setIsActive(false);
    setJustCopied(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setJustCopied(false), 1200);
  }, []);

  const handlePick = useCallback(
    (result: PathPickerResult) => {
      const text = formatResult(result);
      if (onPickProp) {
        onPickProp(result, text);
      } else {
        copyToClipboard(text).catch(() => {});
      }
      settle();
    },
    [onPickProp, settle],
  );

  const handlePickMany = useCallback(
    (results: PathPickerResult[]) => {
      const text = formatResults(results);
      if (onPickManyProp) {
        onPickManyProp(results, text);
      } else {
        copyToClipboard(text).catch(() => {});
      }
      settle();
    },
    [onPickManyProp, settle],
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

  const arm = useCallback(() => setIsActive(true), []);

  // 배열 스펙이 렌더마다 새 identity 로 들어와도 리스너를 다시 걸지 않도록 문자열로 눌러 담는다.
  const hotkeySpec =
    hotkey === false
      ? ''
      : (Array.isArray(hotkey) ? hotkey : [hotkey]).filter(Boolean).join(SPEC_SEPARATOR);

  useEffect(() => {
    if (!hotkeySpec || typeof window === 'undefined') return;

    const matcher = createHotkeyMatcher(hotkeySpec.split(SPEC_SEPARATOR));

    const onKeyDown = (e: KeyboardEvent) => {
      const action = matcher.onKeyDown(e);
      if (!action) return;
      e.preventDefault();
      e.stopPropagation();
      if (action === 'toggle') toggle();
      else arm();
    };
    const onKeyUp = (e: KeyboardEvent) => matcher.onKeyUp(e);
    // 포인터를 누르면 타이핑 흐름이 끊긴 것으로 본다 — Shift+클릭 누적이 더블탭으로 오인되는 걸 막는다.
    const onInterrupt = () => matcher.reset();

    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', onKeyUp, true);
    window.addEventListener('pointerdown', onInterrupt, true);
    window.addEventListener('mousedown', onInterrupt, true);
    window.addEventListener('blur', onInterrupt);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('keyup', onKeyUp, true);
      window.removeEventListener('pointerdown', onInterrupt, true);
      window.removeEventListener('mousedown', onInterrupt, true);
      window.removeEventListener('blur', onInterrupt);
    };
  }, [hotkeySpec, toggle, arm]);

  useEffect(() => {
    if (!isActive) return;
    const inspector = new PathPickerInspector({
      onPick: handlePick,
      onPickMany: handlePickMany,
      onCancel: handleCancel,
      getRoute,
      getProject,
      multi,
    });
    inspectorRef.current = inspector;
    inspector.activate();
    return () => inspector.deactivate();
  }, [isActive, handlePick, handlePickMany, handleCancel, getRoute, getProject, multi]);

  useEffect(() => {
    return () => {
      inspectorRef.current?.deactivate();
      clearTimeout(timerRef.current);
    };
  }, []);

  return { isActive, justCopied, toggle };
}
