/**
 * Extract React component name and source from a DOM element.
 *
 * Strategy:
 *   1. Read `_debugSource` from the clicked fiber up — JSX call site (file:line:col)
 *      that React's dev JSX transform attaches in development. Highest fidelity for
 *      agentic coding: points to the exact source line that produced the picked DOM.
 *   2. Walk the fiber tree up to find the nearest user component for the name.
 *   3. Read __componentSource off the component function (injected by an optional
 *      build-time loader; useful when `_debugSource` is stripped, e.g., in production).
 *   4. Fallback: find the nearest [data-devbadge-name] / [data-devbadge-path] in the DOM.
 */

interface DebugSource {
  fileName: string;
  lineNumber: number;
  columnNumber?: number;
}

interface FiberNode {
  tag: number;
  type: { name?: string; displayName?: string; __componentSource?: string } | string | null;
  _debugOwner?: FiberNode | null;
  _debugSource?: DebugSource | null;
  return: FiberNode | null;
}

const SOURCE_MARKERS = ['/src/', '/app/', '/pages/', '/components/'];

function relativizePath(abs: string): string {
  for (const m of SOURCE_MARKERS) {
    const idx = abs.indexOf(m);
    if (idx >= 0) return abs.slice(idx + 1);
  }
  const parts = abs.split('/').filter(Boolean);
  return parts.length > 3 ? parts.slice(-3).join('/') : abs;
}

function formatDebugSource(src: DebugSource): string {
  const path = relativizePath(src.fileName);
  const col = typeof src.columnNumber === 'number' ? `:${src.columnNumber}` : '';
  return `${path}:${src.lineNumber}${col}`;
}

function getFiberKey(el: Element): string | null {
  for (const key of Object.keys(el)) {
    if (key.startsWith('__reactFiber$')) return key;
  }
  return null;
}

const SKIP_NAMES = new Set([
  'Suspense',
  'Fragment',
  'Provider',
  'Consumer',
  'InnerLayoutRouter',
  'RenderFromTemplateContext',
]);

function isUserComponent(fiber: FiberNode): boolean {
  // tag 0 = FunctionComponent, tag 1 = ClassComponent
  if (fiber.tag !== 0 && fiber.tag !== 1) return false;
  const t = fiber.type;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tAny = t as any;
  const name =
    typeof t === 'function'
      ? tAny.displayName || tAny.name || null
      : typeof t === 'object' && t !== null
        ? tAny.name || tAny.displayName
        : typeof t === 'string'
          ? t
          : null;
  if (!name) return false;
  if (name[0] === name[0].toLowerCase()) return false;
  if (SKIP_NAMES.has(name)) return false;
  return true;
}

function findNearestDevBadge(el: Element): { name: string; source: string } | null {
  let current: Element | null = el;
  while (current) {
    const badge = current.querySelector('[data-devbadge-name]');
    if (badge) {
      const name = badge.getAttribute('data-devbadge-name');
      const path = badge.getAttribute('data-devbadge-path');
      if (name && path) return { name, source: path };
    }
    current = current.parentElement;
  }
  return null;
}

export function getReactComponent(
  el: Element,
): { name: string; source: string | null } | null {
  const key = getFiberKey(el);

  if (key) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let fiber: FiberNode | null = (el as any)[key] as FiberNode;

    let elementSource: string | null = null;
    let component: { name: string; fiberSource: string | null; buildTimeSource: string | null } | null = null;

    while (fiber) {
      if (!elementSource && fiber._debugSource) {
        elementSource = formatDebugSource(fiber._debugSource);
      }

      if (!component && isUserComponent(fiber)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const t = fiber.type as any;
        const name = t.displayName || t.name || null;
        if (name) {
          component = {
            name,
            fiberSource: fiber._debugSource ? formatDebugSource(fiber._debugSource) : null,
            buildTimeSource: t.__componentSource || null,
          };
        }
      }

      if (elementSource && component) break;
      fiber = fiber.return;
    }

    if (component) {
      const source = elementSource || component.buildTimeSource || component.fiberSource;
      return { name: component.name, source };
    }
  }

  const badge = findNearestDevBadge(el);
  if (badge) return { name: badge.name, source: badge.source };

  return null;
}
