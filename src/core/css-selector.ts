/**
 * Generate a unique CSS selector for a DOM element.
 * - Prefers #id
 * - Filters out CSS-in-JS hash classes (css-[a-z0-9]+)
 * - Max 5 levels, validates uniqueness via querySelectorAll
 */

const HASH_CLASS_RE = /^css-[a-z0-9]+$/i;

function getElementSelector(el: Element): string {
  if (el.id) return `#${el.id}`;

  const tag = el.tagName.toLowerCase();
  const classes = Array.from(el.classList).filter((c) => !HASH_CLASS_RE.test(c));

  let selector = tag;
  if (classes.length > 0) {
    selector += '.' + classes.join('.');
  }

  const parent = el.parentElement;
  if (parent) {
    const siblings = Array.from(parent.children).filter((s) => {
      if (s.tagName.toLowerCase() !== tag) return false;
      if (classes.length === 0) return true;
      return classes.every((c) => s.classList.contains(c));
    });
    if (siblings.length > 1) {
      const idx = Array.from(parent.children).indexOf(el) + 1;
      selector += `:nth-child(${idx})`;
    }
  }

  return selector;
}

export function getCssSelector(el: Element): string {
  if (el.id) return `#${el.id}`;

  const parts: string[] = [];
  let current: Element | null = el;
  let depth = 0;

  while (current && current !== document.body && depth < 5) {
    const seg = getElementSelector(current);
    parts.unshift(seg);

    const selector = parts.join(' > ');
    try {
      if (document.querySelectorAll(selector).length === 1) {
        return selector;
      }
    } catch {
      // invalid selector, keep going
    }

    if (seg.startsWith('#')) break;
    current = current.parentElement;
    depth++;
  }

  return parts.join(' > ');
}
