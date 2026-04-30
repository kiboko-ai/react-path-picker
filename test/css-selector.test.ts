import { afterEach, describe, expect, it } from 'vitest';
import { getCssSelector } from '../src/core/css-selector';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('getCssSelector', () => {
  it('returns #id when element has an id', () => {
    document.body.innerHTML = '<div><button id="go">Go</button></div>';
    const btn = document.getElementById('go')!;
    expect(getCssSelector(btn)).toBe('#go');
  });

  it('uses nth-child to disambiguate among identical siblings', () => {
    document.body.innerHTML = `
      <ul>
        <li>a</li>
        <li>b</li>
        <li>c</li>
      </ul>
    `;
    const second = document.querySelectorAll('li')[1]!;
    const selector = getCssSelector(second);
    expect(selector).toContain('nth-child(2)');
    expect(document.querySelectorAll(selector).length).toBe(1);
  });

  it('produces a uniquely-matching selector', () => {
    document.body.innerHTML = `
      <main>
        <section><p class="x">first</p></section>
        <section><p class="x">second</p></section>
      </main>
    `;
    const target = document.querySelectorAll('p.x')[1]!;
    const selector = getCssSelector(target);
    expect(document.querySelectorAll(selector).length).toBe(1);
    expect(document.querySelector(selector)).toBe(target);
  });

  it('filters out css-in-js hash classes like css-abc123', () => {
    document.body.innerHTML = `
      <div>
        <span class="btn css-abc123 css-9f8e7d primary">click</span>
      </div>
    `;
    const span = document.querySelector('span')!;
    const selector = getCssSelector(span);
    expect(selector).toContain('.btn');
    expect(selector).toContain('.primary');
    expect(selector).not.toContain('css-abc123');
    expect(selector).not.toContain('css-9f8e7d');
  });

  it('keeps regular classes that merely start with css- but are not hashes', () => {
    document.body.innerHTML = '<div><span class="css-reset-thing">x</span></div>';
    const span = document.querySelector('span')!;
    const selector = getCssSelector(span);
    // hash regex requires only [a-z0-9] after "css-", so a class with a hyphen survives
    expect(selector).toContain('.css-reset-thing');
  });
});
