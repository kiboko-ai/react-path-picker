import { afterEach, describe, expect, it } from 'vitest';
import { getReactComponent } from '../src/core/react-fiber';
import { formatResult } from '../src/react/usePathPicker';
import type { PathPickerResult } from '../src/core/types';

afterEach(() => {
  document.body.innerHTML = '';
});

/** Attach a minimal fake fiber chain so getReactComponent can walk it. */
function attachFiber(el: Element, fileName: string, componentName: string) {
  const componentFiber = {
    tag: 0,
    type: { name: componentName },
    _debugSource: { fileName, lineNumber: 42, columnNumber: 7 },
    return: null,
  };
  const hostFiber = {
    tag: 5,
    type: el.tagName.toLowerCase(),
    _debugSource: { fileName, lineNumber: 42, columnNumber: 7 },
    return: componentFiber,
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (el as any)['__reactFiber$abc123'] = hostFiber;
}

const baseResult: PathPickerResult = {
  origin: 'http://localhost:3000',
  project: null,
  route: '/dashboard/purchases',
  xpath: '/html/body/div[1]',
  cssSelector: 'div.root',
  tagName: 'div',
  id: null,
  textContent: 'hi',
  reactComponent: null,
  reactSource: null,
};

describe('getReactComponent projectRoot', () => {
  it('splits an absolute JSX call site into repo root and in-project path', () => {
    document.body.innerHTML = '<div id="t"></div>';
    const el = document.getElementById('t')!;
    attachFiber(el, '/Volumes/Data/dev/acme/webapp/src/app/page.tsx', 'PurchasesLiveView');

    const rc = getReactComponent(el)!;
    expect(rc.name).toBe('PurchasesLiveView');
    expect(rc.projectRoot).toBe('/Volumes/Data/dev/acme/webapp');
    expect(rc.source).toBe('src/app/page.tsx:42:7');
  });

  it('reports no root when the source path is already relative', () => {
    document.body.innerHTML = '<div id="t"></div>';
    const el = document.getElementById('t')!;
    attachFiber(el, 'src/components/Card.tsx', 'Card');

    const rc = getReactComponent(el)!;
    expect(rc.projectRoot).toBeNull();
    expect(rc.source).toBe('src/components/Card.tsx:42:7');
  });

  it('strips dev-server URL schemes before splitting', () => {
    document.body.innerHTML = '<div id="t"></div>';
    const el = document.getElementById('t')!;
    attachFiber(el, 'webpack-internal:///./src/app/page.tsx', 'Page');

    const rc = getReactComponent(el)!;
    expect(rc.projectRoot).toBeNull();
    expect(rc.source).toBe('src/app/page.tsx:42:7');
  });

  it('falls back to the last path segments when no source marker is present', () => {
    document.body.innerHTML = '<div id="t"></div>';
    const el = document.getElementById('t')!;
    attachFiber(el, '/Users/me/dev/acme/lib/widgets/Card.tsx', 'Card');

    const rc = getReactComponent(el)!;
    expect(rc.projectRoot).toBe('/Users/me/dev/acme');
    expect(rc.source).toBe('lib/widgets/Card.tsx:42:7');
  });
});

describe('formatResult', () => {
  it('puts Origin and Project ahead of Route', () => {
    const text = formatResult({
      ...baseResult,
      project: '/Volumes/Data/dev/acme/webapp',
    });
    expect(text.startsWith('[xPathInfo], Origin: http://localhost:3000, Project: /Volumes/Data/dev/acme/webapp, Route: /dashboard/purchases')).toBe(true);
  });

  it('omits Project when it could not be determined', () => {
    const text = formatResult(baseResult);
    expect(text).not.toContain('Project:');
    expect(text).toContain('Origin: http://localhost:3000');
  });

  it('omits Origin in non-browser contexts', () => {
    const text = formatResult({ ...baseResult, origin: '' });
    expect(text).not.toContain('Origin:');
    expect(text.startsWith('[xPathInfo], Route:')).toBe(true);
  });
});
