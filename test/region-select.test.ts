import { afterEach, describe, expect, it } from 'vitest';
import {
  bandArea,
  normalizeBand,
  selectInBand,
  snapshotElements,
  type Band,
  type RectSnapshot,
} from '../src/core/region-select';

afterEach(() => {
  document.body.innerHTML = '';
});

/** jsdom 에는 레이아웃이 없다. 이 테스트가 재는 건 기하 판정이지 브라우저 레이아웃이 아니다. */
function setRect(el: Element, left: number, top: number, width: number, height: number): Element {
  const rect = {
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    x: left,
    y: top,
    toJSON: () => ({}),
  };
  (el as unknown as { getBoundingClientRect: () => DOMRect }).getBoundingClientRect = () =>
    rect as DOMRect;
  return el;
}

function snap(el: Element): RectSnapshot {
  return { el, rect: el.getBoundingClientRect() };
}

const band = (left: number, top: number, right: number, bottom: number): Band => ({
  left,
  top,
  right,
  bottom,
});

describe('normalizeBand', () => {
  it('orders the corners whichever way the drag went', () => {
    expect(normalizeBand(100, 80, 20, 10)).toEqual({ left: 20, top: 10, right: 100, bottom: 80 });
    expect(normalizeBand(20, 10, 100, 80)).toEqual({ left: 20, top: 10, right: 100, bottom: 80 });
  });

  it('reports the area so a jittery click can be told from a drag', () => {
    expect(bandArea(normalizeBand(10, 10, 12, 12))).toBe(4);
    expect(bandArea(band(0, 0, 10, 20))).toBe(200);
  });
});

describe('snapshotElements', () => {
  it('skips zero-area elements', () => {
    document.body.innerHTML = '<div id="real"></div><div id="empty"></div>';
    setRect(document.getElementById('real')!, 0, 0, 10, 10);
    setRect(document.getElementById('empty')!, 0, 0, 0, 0);

    const out = snapshotElements(document.body, { viewport: null });
    expect(out.map((s) => (s.el as HTMLElement).id)).toEqual(['real']);
  });

  it('skips the picker own UI, subtree included', () => {
    document.body.innerHTML =
      '<div id="page"></div><div data-pathpicker-ignore><div id="marker"></div></div>';
    for (const el of Array.from(document.body.querySelectorAll('*'))) setRect(el, 0, 0, 10, 10);

    const out = snapshotElements(document.body, { viewport: null });
    expect(out.map((s) => (s.el as HTMLElement).id)).toEqual(['page']);
  });

  it('culls what is entirely outside the viewport', () => {
    document.body.innerHTML = '<div id="onscreen"></div><div id="offscreen"></div>';
    setRect(document.getElementById('onscreen')!, 10, 10, 50, 50);
    setRect(document.getElementById('offscreen')!, 10, 5000, 50, 50);

    const out = snapshotElements(document.body, { viewport: band(0, 0, 800, 600) });
    expect(out.map((s) => (s.el as HTMLElement).id)).toEqual(['onscreen']);
  });

  it('stops at the cap', () => {
    document.body.innerHTML = '<i></i><i></i><i></i><i></i>';
    for (const el of Array.from(document.body.querySelectorAll('i'))) setRect(el, 0, 0, 5, 5);

    expect(snapshotElements(document.body, { max: 2, viewport: null })).toHaveLength(2);
  });
});

describe('selectInBand', () => {
  /**
   *  main (0,0 800x600)
   *   └ grid (10,10 400x200)
   *      ├ cardA (20,20 180x180)  ├ h3 ├ p
   *      └ cardB (220,20 180x180) ├ h3 ├ p
   *  footer (10,400 400x50)
   */
  function buildPage() {
    document.body.innerHTML = `
      <main id="main">
        <div id="grid">
          <div id="cardA"><h3 id="a-h3"></h3><p id="a-p"></p></div>
          <div id="cardB"><h3 id="b-h3"></h3><p id="b-p"></p></div>
        </div>
      </main>
      <footer id="footer"></footer>`;
    const at = (id: string, l: number, t: number, w: number, h: number) =>
      setRect(document.getElementById(id)!, l, t, w, h);

    at('main', 0, 0, 800, 600);
    at('grid', 10, 10, 400, 200);
    at('cardA', 20, 20, 180, 180);
    at('a-h3', 30, 30, 100, 20);
    at('a-p', 30, 60, 100, 40);
    at('cardB', 220, 20, 180, 180);
    at('b-h3', 230, 30, 100, 20);
    at('b-p', 230, 60, 100, 40);
    at('footer', 10, 400, 400, 50);

    return Array.from(document.body.querySelectorAll('*')).map(snap);
  }

  const ids = (els: Element[]) => els.map((el) => (el as HTMLElement).id);

  it('takes the outermost box that fits, not its children', () => {
    const shot = buildPage();
    // 두 카드를 딱 감싸되 grid 는 넘지 않는 영역.
    const { elements, dropped } = selectInBand(shot, band(15, 15, 405, 205));

    expect(ids(elements)).toEqual(['cardA', 'cardB']);
    expect(dropped).toBe(0);
  });

  it('drops ancestors that stick out of the band', () => {
    const shot = buildPage();
    const { elements } = selectInBand(shot, band(15, 15, 405, 205));

    expect(ids(elements)).not.toContain('main');
    expect(ids(elements)).not.toContain('grid');
  });

  it('takes the wrapper once the band clears it', () => {
    const shot = buildPage();
    const { elements } = selectInBand(shot, band(5, 5, 500, 300));

    expect(ids(elements)).toEqual(['grid']);
  });

  it('falls back to the leaves when only they fit', () => {
    const shot = buildPage();
    const { elements } = selectInBand(shot, band(25, 25, 140, 105));

    expect(ids(elements)).toEqual(['a-h3', 'a-p']);
  });

  it('keeps document order across unrelated subtrees', () => {
    const shot = buildPage();
    const { elements } = selectInBand(shot, band(5, 5, 500, 480));

    expect(ids(elements)).toEqual(['grid', 'footer']);
  });

  it('selects nothing when the band is empty space', () => {
    const shot = buildPage();
    expect(selectInBand(shot, band(600, 500, 700, 550)).elements).toEqual([]);
  });

  it('caps the result and says how many it left out', () => {
    document.body.innerHTML = Array.from({ length: 8 }, (_, i) => `<i id="i${i}"></i>`).join('');
    const shot = Array.from(document.body.querySelectorAll('i')).map((el, i) =>
      snap(setRect(el, i * 10, 0, 8, 8)),
    );

    const { elements, dropped } = selectInBand(shot, band(0, 0, 500, 500), 3);
    expect(ids(elements)).toEqual(['i0', 'i1', 'i2']);
    expect(dropped).toBe(5);
  });

  it('tolerates sub-pixel rects on the boundary', () => {
    document.body.innerHTML = '<div id="hair"></div>';
    const shot = [snap(setRect(document.getElementById('hair')!, 9.7, 9.7, 100, 100))];

    expect(ids(selectInBand(shot, band(10, 10, 110, 110)).elements)).toEqual(['hair']);
  });
});
