import { afterEach, describe, expect, it } from 'vitest';
import { getXPath } from '../src/core/xpath';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('getXPath', () => {
  it('returns id shortcut when element has an id', () => {
    document.body.innerHTML = '<div><section id="hero"><p>hi</p></section></div>';
    const el = document.getElementById('hero')!;
    expect(getXPath(el)).toBe('//*[@id="hero"]');
  });

  it('uses indexed xpath among same-tag siblings', () => {
    document.body.innerHTML = `
      <div>
        <ul>
          <li>a</li>
          <li>b</li>
          <li class="target">c</li>
        </ul>
      </div>
    `;
    const target = document.querySelector('li.target')!;
    expect(getXPath(target)).toContain('li[3]');
  });

  it('omits index when there is only one sibling of that tag', () => {
    document.body.innerHTML = '<div><span>only</span></div>';
    const span = document.querySelector('span')!;
    const xpath = getXPath(span);
    expect(xpath).toContain('span');
    expect(xpath).not.toContain('span[');
  });

  it('shortcuts via ancestor id when an ancestor has id', () => {
    document.body.innerHTML = `
      <div>
        <section id="root">
          <ul>
            <li>a</li>
            <li class="target">b</li>
          </ul>
        </section>
      </div>
    `;
    const target = document.querySelector('li.target')!;
    const xpath = getXPath(target);
    expect(xpath).toContain('*[@id="root"]');
    expect(xpath).toContain('li[2]');
    expect(xpath.startsWith('//')).toBe(true);
  });
});
