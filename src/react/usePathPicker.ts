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
}

export function usePathPicker(options?: string | UsePathPickerOptions) {
  const opts: UsePathPickerOptions =
    typeof options === 'string' ? { pathname: options } : options ?? {};
  const { pathname, project, onPick: onPickProp } = opts;

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
