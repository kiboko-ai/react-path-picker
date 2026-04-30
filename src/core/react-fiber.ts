/**
 * Extract React component name and source from a DOM element.
 *
 * Strategy:
 *   1. Walk the fiber tree up to find the nearest user component.
 *   2. Read __componentSource off the component function (injected by an optional
 *      build-time loader; absent in production).
 *   3. Fallback: find the nearest [data-devbadge-name] / [data-devbadge-path] in the DOM.
 */

interface FiberNode {
  tag: number;
  type: { name?: string; displayName?: string; __componentSource?: string } | string | null;
  _debugOwner?: FiberNode | null;
  return: FiberNode | null;
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

    while (fiber) {
      if (isUserComponent(fiber)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const t = fiber.type as any;
        const name = t.displayName || t.name || null;
        if (name) {
          const source = t.__componentSource || null;
          return { name, source };
        }
      }
      fiber = fiber.return;
    }
  }

  const badge = findNearestDevBadge(el);
  if (badge) return { name: badge.name, source: badge.source };

  return null;
}
