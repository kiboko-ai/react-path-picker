import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PathPickerInspector } from '../src/core/inspector';
import type { PathPickerResult } from '../src/core/types';

/**
 * jsdom 에는 레이아웃도 히트테스트도 없다. rect 를 손으로 박고 elementFromPoint 를 그 rect 로
 * 흉내내면, 이벤트 흐름(무엇을 삼키고 언제 확정하는지)은 실제와 같은 경로로 검증할 수 있다.
 * 이 파일이 지키는 것은 기하가 아니라 "픽커가 켜져 있는 동안 페이지는 아무것도 못 본다"는 계약이다.
 */

const rects = new Map<Element, DOMRect>();

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
  } as DOMRect;
  rects.set(el, rect);
  (el as unknown as { getBoundingClientRect: () => DOMRect }).getBoundingClientRect = () => rect;
  return el;
}

function depth(el: Element): number {
  let d = 0;
  let cur: Element | null = el;
  while ((cur = cur.parentElement)) d++;
  return d;
}

/**
 * 좌표를 품는 것 중 가장 깊은 element. rect 를 박아둔 것만 후보라서, 픽커가 그리는 오버레이는
 * 실제 브라우저에서 pointer-events:none 으로 빠지듯 여기서도 자연히 빠진다.
 */
function elementFromPointStub(x: number, y: number): Element | null {
  let best: Element | null = null;
  for (const [el, rect] of rects) {
    if (!el.isConnected) continue;
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) continue;
    if (!best || depth(el) >= depth(best)) best = el;
  }
  return best;
}

const mouse = (type: string, x: number, y: number, init: MouseEventInit = {}) =>
  new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0, ...init });

function send(type: string, x: number, y: number, init: MouseEventInit = {}) {
  const target = elementFromPointStub(x, y) ?? document.body;
  target.dispatchEvent(mouse(type, x, y, init));
}

const down = (x: number, y: number, init: MouseEventInit = {}) => send('mousedown', x, y, init);
const up = (x: number, y: number, init: MouseEventInit = {}) => send('mouseup', x, y, init);
const click = (x: number, y: number, init: MouseEventInit = {}) => send('click', x, y, init);

function move(x: number, y: number) {
  document.dispatchEvent(mouse('mousemove', x, y));
}

function keyDown(key: string) {
  window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
}

/**
 * 하이라이트를 세운 뒤 누르고 뗀다 — 실제 사용자가 하는 순서 그대로.
 * 브라우저는 뗌 뒤에 click 을 반드시 보내므로 그것까지 흉내낸다. 이 click 이
 * _swallowTrailingPress 를 걷어내는 신호이기도 하다.
 */
function pick(x: number, y: number, init: MouseEventInit = {}) {
  move(x, y);
  down(x, y, init);
  up(x, y, init);
  click(x, y, init);
}

interface Harness {
  inspector: PathPickerInspector;
  picked: PathPickerResult[];
  pickedMany: PathPickerResult[][];
  cancels: number;
  pageSaw: string[];
}

let mounted: PathPickerInspector | null = null;

function mount(options: { multi?: boolean; withMany?: boolean } = {}): Harness {
  const picked: PathPickerResult[] = [];
  const pickedMany: PathPickerResult[][] = [];
  const pageSaw: string[] = [];
  let cancels = 0;

  for (const type of ['mousedown', 'mouseup', 'click']) {
    document.addEventListener(type, (e) => {
      pageSaw.push(`${type}:${(e.target as HTMLElement).id || (e.target as Element).tagName}`);
    });
  }

  const inspector = new PathPickerInspector({
    onPick: (r) => picked.push(r),
    onPickMany: options.withMany === false ? undefined : (rs) => pickedMany.push(rs),
    onCancel: () => {
      cancels += 1;
    },
    getRoute: () => '/dash',
    getProject: () => 'acme',
    multi: options.multi,
  });
  inspector.activate();
  mounted = inspector;

  return {
    inspector,
    picked,
    pickedMany,
    get cancels() {
      return cancels;
    },
    pageSaw,
  };
}

/**
 *  page (0,0 600x400)
 *   └ list (10,10 300x120)
 *      ├ a (20,20 120x40)
 *      └ b (160,20 120x40)
 *   └ far (10,300 100x40)
 */
function buildPage() {
  document.body.innerHTML = `
    <div id="page">
      <div id="list"><button id="a">A</button><button id="b">B</button></div>
      <button id="far">Far</button>
    </div>`;
  setRect(document.body, 0, 0, 600, 400);
  setRect(document.getElementById('page')!, 0, 0, 600, 400);
  setRect(document.getElementById('list')!, 10, 10, 300, 120);
  setRect(document.getElementById('a')!, 20, 20, 120, 40);
  setRect(document.getElementById('b')!, 160, 20, 120, 40);
  setRect(document.getElementById('far')!, 10, 300, 100, 40);
}

const IN_A: [number, number] = [80, 40];
const IN_B: [number, number] = [220, 40];
const IN_FAR: [number, number] = [60, 320];

const ids = (els: Element[]) => els.map((el) => el.id);

beforeEach(() => {
  rects.clear();
  document.body.innerHTML = '';
  document.elementFromPoint = elementFromPointStub as typeof document.elementFromPoint;
  buildPage();
});

afterEach(() => {
  // 켜진 채 남으면 그 리스너가 다음 테스트의 눌림을 stopImmediatePropagation 으로 먹는다.
  mounted?.deactivate();
  mounted = null;
  // 픽 뒤 삼킴은 click 또는 700ms 로 걷힌다. 이것도 남겨두면 다음 테스트를 먹는다.
  window.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  document.body.innerHTML = '';
  document.body.style.cursor = '';
});

describe('single pick', () => {
  it('confirms on the press and closes', () => {
    const h = mount();
    pick(...IN_A);

    expect(h.picked).toHaveLength(1);
    expect(h.picked[0].id).toBe('a');
    expect(h.picked[0].route).toBe('/dash');
    expect(h.picked[0].project).toBe('acme');
    expect(h.inspector.isActive()).toBe(false);
  });

  it('never lets the press reach the page', () => {
    const h = mount();
    // 확정 뒤 따라오는 mouseup·click 까지 삼켜야 방금 찍은 버튼이 진짜로 눌리지 않는다.
    pick(...IN_A);

    expect(h.pageSaw).toEqual([]);
  });

  it('picks what was highlighted — the release cannot move it', () => {
    const h = mount();
    move(...IN_A);
    down(...IN_A);
    up(...IN_B);
    click(...IN_B);

    expect(h.picked.map((r) => r.id)).toEqual(['a']);
  });

  it('stays put when the press starts on the picker own UI', () => {
    const h = mount();
    document.body.insertAdjacentHTML('beforeend', '<div id="own" data-pathpicker-ignore></div>');
    setRect(document.getElementById('own')!, 500, 0, 40, 40);

    pick(520, 20);

    expect(h.picked).toHaveLength(0);
    expect(h.inspector.isActive()).toBe(true);
  });

  it('swallows a right-click instead of picking with it', () => {
    const h = mount();
    move(...IN_A);
    send('contextmenu', ...IN_A, { button: 2 });

    expect(h.picked).toHaveLength(0);
    expect(h.pageSaw).toEqual([]);
    expect(h.inspector.isActive()).toBe(true);
  });
});

describe('shift+click accumulation', () => {
  it('stacks without closing and confirms on Enter', () => {
    const h = mount();
    pick(...IN_A, { shiftKey: true });
    pick(...IN_B, { shiftKey: true });

    expect(h.picked).toHaveLength(0);
    expect(h.inspector.isActive()).toBe(true);
    expect(ids(h.inspector.getSelection())).toEqual(['a', 'b']);

    keyDown('Enter');

    expect(h.pickedMany).toHaveLength(1);
    expect(h.pickedMany[0].map((r) => r.id)).toEqual(['a', 'b']);
    expect(h.inspector.isActive()).toBe(false);
  });

  it('drops one that is shift-clicked again', () => {
    const h = mount();
    pick(...IN_A, { shiftKey: true });
    pick(...IN_B, { shiftKey: true });
    pick(...IN_A, { shiftKey: true });

    expect(ids(h.inspector.getSelection())).toEqual(['b']);
  });

  it('toggles once even when pointerdown and mousedown both arrive', () => {
    const h = mount();
    move(...IN_A);
    send('pointerdown', ...IN_A, { shiftKey: true });
    send('mousedown', ...IN_A, { shiftKey: true });

    expect(ids(h.inspector.getSelection())).toEqual(['a']);
  });

  it('replaces the selection on a plain click instead of throwing it away', () => {
    const h = mount();
    pick(...IN_A, { shiftKey: true });
    pick(...IN_B, { shiftKey: true });
    pick(...IN_FAR);

    expect(h.picked).toHaveLength(0);
    expect(h.inspector.isActive()).toBe(true);
    expect(ids(h.inspector.getSelection())).toEqual(['far']);
  });

  it('keeps the page blind while stacking', () => {
    const h = mount();
    pick(...IN_A, { shiftKey: true });
    pick(...IN_B, { shiftKey: true });

    expect(h.pageSaw).toEqual([]);
  });

  it('ignores Enter with nothing selected', () => {
    const h = mount();
    keyDown('Enter');

    expect(h.pickedMany).toHaveLength(0);
    expect(h.inspector.isActive()).toBe(true);
  });

  it('throws the whole selection away on Escape', () => {
    const h = mount();
    pick(...IN_A, { shiftKey: true });
    keyDown('Escape');

    expect(h.pickedMany).toHaveLength(0);
    expect(h.cancels).toBe(1);
    expect(h.inspector.isActive()).toBe(false);
  });

  it('forgets an element that the page removed before Enter', () => {
    const h = mount();
    pick(...IN_A, { shiftKey: true });
    pick(...IN_B, { shiftKey: true });
    document.getElementById('a')!.remove();

    keyDown('Enter');

    expect(h.pickedMany[0].map((r) => r.id)).toEqual(['b']);
  });
});

describe('kill switch', () => {
  it('multi:false picks one and closes even with shift held', () => {
    const h = mount({ multi: false });
    pick(...IN_A, { shiftKey: true });

    expect(h.picked).toHaveLength(1);
    expect(h.picked[0].id).toBe('a');
    expect(h.inspector.isActive()).toBe(false);
  });

  it('stays single when the caller cannot handle an array', () => {
    const h = mount({ withMany: false });
    pick(...IN_A, { shiftKey: true });

    expect(h.picked).toHaveLength(1);
    expect(h.inspector.isActive()).toBe(false);
  });
});
