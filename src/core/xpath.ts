/**
 * Generate XPath for a DOM element.
 * Shortcuts to //*[@id="..."] when an id is found.
 * Stops at <svg> boundaries for SVG internals.
 */
export function getXPath(el: Element): string {
  if (el.id) return `//*[@id="${el.id}"]`;

  const parts: string[] = [];
  let current: Element | null = el;

  while (current && current !== document.documentElement) {
    if (current.tagName.toLowerCase() === 'svg') {
      parts.unshift('svg');
      break;
    }

    if (current !== el && current.id) {
      parts.unshift(`*[@id="${current.id}"]`);
      return '//' + parts.join('/');
    }

    const tag = current.tagName.toLowerCase();
    const parent: Element | null = current.parentElement;

    if (parent) {
      const siblings = Array.from(parent.children).filter(
        (c: Element) => c.tagName.toLowerCase() === tag,
      );
      if (siblings.length > 1) {
        const idx = siblings.indexOf(current) + 1;
        parts.unshift(`${tag}[${idx}]`);
      } else {
        parts.unshift(tag);
      }
    } else {
      parts.unshift(tag);
    }

    current = parent;
  }

  return '/html/' + parts.join('/');
}
