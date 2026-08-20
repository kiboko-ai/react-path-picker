import { describe, expect, it } from 'vitest';
import { formatResult, formatResults } from '../src/react/usePathPicker';
import type { PathPickerResult } from '../src/core/types';

function result(over: Partial<PathPickerResult> = {}): PathPickerResult {
  return {
    origin: 'http://localhost:3000',
    project: '/Users/me/dev/acme/webapp',
    route: '/dashboard',
    xpath: '/html/body/div[2]/main',
    cssSelector: 'main.layout-content',
    tagName: 'main',
    id: null,
    textContent: 'Dashboard',
    reactComponent: 'DashboardPage',
    reactSource: 'app/dashboard/page.tsx',
    ...over,
  };
}

describe('formatResults', () => {
  it('hands a single pick to formatResult untouched', () => {
    const r = result();
    expect(formatResults([r])).toBe(formatResult(r));
  });

  it('says nothing for an empty selection', () => {
    expect(formatResults([])).toBe('');
  });

  it('hoists the shared header and numbers the rest', () => {
    const text = formatResults([
      result({ xpath: '/html/body/ul/li[1]', cssSelector: 'li.row:nth-child(1)' }),
      result({ xpath: '/html/body/ul/li[2]', cssSelector: 'li.row:nth-child(2)' }),
    ]);

    expect(text).toBe(
      '[xPathInfo] 2 elements, Origin: http://localhost:3000, ' +
        'Project: /Users/me/dev/acme/webapp, Route: /dashboard\n' +
        '1. XPath: /html/body/ul/li[1], CSS: li.row:nth-child(1), ' +
        'React: DashboardPage (app/dashboard/page.tsx)\n' +
        '2. XPath: /html/body/ul/li[2], CSS: li.row:nth-child(2), ' +
        'React: DashboardPage (app/dashboard/page.tsx)',
    );
  });

  it('writes Origin, Project and Route exactly once', () => {
    const text = formatResults([result(), result(), result()]);
    const count = (needle: string) => text.split(needle).length - 1;

    expect(count('Origin:')).toBe(1);
    expect(count('Project:')).toBe(1);
    expect(count('Route:')).toBe(1);
    expect(count('XPath:')).toBe(3);
  });

  it('leaves out header fields the page could not supply', () => {
    const text = formatResults([
      result({ origin: undefined, project: null }),
      result({ origin: undefined, project: null }),
    ]);

    expect(text.startsWith('[xPathInfo] 2 elements, Route: /dashboard\n')).toBe(true);
  });

  it('drops the React part for elements with no component', () => {
    const text = formatResults([
      result({ reactComponent: null, reactSource: null }),
      result({ reactComponent: 'Sidebar', reactSource: null }),
    ]);

    expect(text).toContain('1. XPath: /html/body/div[2]/main, CSS: main.layout-content\n');
    expect(text).toContain('2. XPath: /html/body/div[2]/main, CSS: main.layout-content, React: Sidebar');
  });
});
