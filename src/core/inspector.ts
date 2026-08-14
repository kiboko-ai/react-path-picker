import type { InspectorCallbacks, PathPickerResult } from './types';
import { getXPath } from './xpath';
import { getCssSelector } from './css-selector';
import { getReactComponent } from './react-fiber';

const OVERLAY_Z = 99999;
const HIGHLIGHT_BG = 'rgba(50,157,156,0.15)';
const HIGHLIGHT_BORDER = '#329D9C';

/**
 * picking 중에만 주입. 브라우저는 disabled 폼 컨트롤 위에서 마우스 이벤트를 아예 발생시키지
 * 않는다 — 조상으로 버블도 안 되므로 그대로 두면 커서가 그 위에 있다는 사실조차 알 수 없다.
 * pointer-events 를 꺼 히트테스트에서 빼면 이벤트가 조상으로 흘러 좌표를 얻을 수 있고,
 * 진짜 대상은 _resolveTarget 이 rect 로 다시 찾아낸다.
 */
const PICKING_CSS = ':disabled,[disabled],[aria-disabled="true"]{pointer-events:none!important}';

/**
 * 페이지가 보기 전에 삼켜야 하는 press 계열. popover·dropdown 의 outside-click 닫기는
 * click 이 아니라 mousedown(antd/rc-trigger) 이나 pointerdown(Radix) 에서 도는 경우가
 * 대부분이라, click 만 막으면 누르는 순간 대상이 사라진 뒤에 픽이 일어난다.
 */
const PRESS_EVENTS = [
  'pointerdown',
  'mousedown',
  'pointerup',
  'mouseup',
  'click',
  'auxclick',
  'dblclick',
  'contextmenu',
] as const;

/** DOM 이 병적으로 깊을 때를 대비한 하강 상한. */
const MAX_DESCEND = 32;

function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length > max ? clean.slice(0, max) + '…' : clean;
}

export class PathPickerInspector {
  private callbacks: InspectorCallbacks;
  private overlay: HTMLDivElement | null = null;
  private tooltip: HTMLDivElement | null = null;
  private style: HTMLStyleElement | null = null;
  private active = false;

  private handleMouseMove: (e: MouseEvent) => void;
  private handlePress: (e: Event) => void;
  private handleKeyDown: (e: KeyboardEvent) => void;
  private handleScroll: () => void;
  private handleWindowResize: () => void;
  private handleTransitionEnd: () => void;
  private lastTarget: Element | null = null;
  private resizeObserver: ResizeObserver | null = null;

  constructor(callbacks: InspectorCallbacks) {
    this.callbacks = callbacks;

    this.handleMouseMove = this._onMouseMove.bind(this);
    this.handlePress = this._onPress.bind(this);
    this.handleKeyDown = this._onKeyDown.bind(this);
    this.handleScroll = this._onScroll.bind(this);
    this.handleWindowResize = this._refreshOverlay.bind(this);
    this.handleTransitionEnd = this._refreshOverlay.bind(this);
  }

  activate(): void {
    if (this.active) return;
    this.active = true;

    this.style = document.createElement('style');
    this.style.setAttribute('data-pathpicker-ignore', '');
    this.style.textContent = PICKING_CSS;
    document.head.appendChild(this.style);

    this.overlay = document.createElement('div');
    Object.assign(this.overlay.style, {
      position: 'fixed',
      pointerEvents: 'none',
      zIndex: String(OVERLAY_Z),
      background: HIGHLIGHT_BG,
      border: `2px solid ${HIGHLIGHT_BORDER}`,
      borderRadius: '4px',
      // top/left/width/height 는 즉시 반영 — 추적 중인 element 의 layout 변화(Collapse,
      // animation, resize) 를 따라가야 하므로 보간 금지. opacity 만 부드럽게.
      transition: 'opacity 0.08s ease-out',
      display: 'none',
    });
    this.overlay.setAttribute('data-pathpicker-ignore', '');
    document.body.appendChild(this.overlay);

    this.tooltip = document.createElement('div');
    Object.assign(this.tooltip.style, {
      position: 'fixed',
      pointerEvents: 'none',
      zIndex: String(OVERLAY_Z + 1),
      background: 'rgba(0,0,0,0.82)',
      color: '#fff',
      fontSize: '12px',
      fontFamily: 'monospace',
      padding: '6px 10px',
      borderRadius: '6px',
      maxWidth: '420px',
      whiteSpace: 'pre-line',
      lineHeight: '1.5',
      display: 'none',
    });
    this.tooltip.setAttribute('data-pathpicker-ignore', '');
    document.body.appendChild(this.tooltip);

    document.body.style.cursor = 'crosshair';

    // 캡처 경로가 window → document → ... 이므로, window 에 걸면 페이지가 document 에 건
    // 리스너보다 항상 먼저 잡는다. popover 가 닫히기 전에 가로챌 수 있는 유일한 지점.
    window.addEventListener('mousemove', this.handleMouseMove, true);
    for (const type of PRESS_EVENTS) {
      window.addEventListener(type, this.handlePress, true);
    }
    window.addEventListener('keydown', this.handleKeyDown, true);
    window.addEventListener('scroll', this.handleScroll, true);
    window.addEventListener('resize', this.handleWindowResize);
    // transitionend / animationend 는 transform 만 바뀌고 size 변화 없는 케이스 보조 (예: slide).
    // capture phase 로 모든 element 의 transition 종료를 잡는다.
    window.addEventListener('transitionend', this.handleTransitionEnd, true);
    window.addEventListener('animationend', this.handleTransitionEnd, true);

    // 추적 중인 element 의 크기·위치 변화를 능동 감지 — Antd Collapse 의 height transition,
    // 부모 layout 변화로 인한 viewport 좌표 변화 등이 mousemove/scroll 없이 발생하는 케이스 대응.
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this._refreshOverlay());
    }
  }

  deactivate(): void {
    if (!this.active) return;
    this.active = false;
    this.lastTarget = null;

    document.body.style.cursor = '';
    window.removeEventListener('mousemove', this.handleMouseMove, true);
    for (const type of PRESS_EVENTS) {
      window.removeEventListener(type, this.handlePress, true);
    }
    window.removeEventListener('keydown', this.handleKeyDown, true);
    window.removeEventListener('scroll', this.handleScroll, true);
    window.removeEventListener('resize', this.handleWindowResize);
    window.removeEventListener('transitionend', this.handleTransitionEnd, true);
    window.removeEventListener('animationend', this.handleTransitionEnd, true);

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    this.style?.remove();
    this.overlay?.remove();
    this.tooltip?.remove();
    this.style = null;
    this.overlay = null;
    this.tooltip = null;
  }

  isActive(): boolean {
    return this.active;
  }

  private _shouldIgnore(el: Element | null): boolean {
    if (!el) return true;
    let cur: Element | null = el;
    while (cur) {
      if (cur.hasAttribute('data-pathpicker-ignore')) return true;
      cur = cur.parentElement;
    }
    return false;
  }

  /**
   * 커서 밑의 진짜 대상. elementFromPoint 는 pointer-events:none 인 element 를 건너뛰므로
   * (disabled 버튼이 대표적 — 라이브러리가 직접 꺼두거나 PICKING_CSS 가 꺼둔다) 그 결과에서
   * 다시 rect 를 따라 한 단계씩 내려간다.
   */
  private _resolveTarget(x: number, y: number): Element | null {
    const hit = document.elementFromPoint(x, y);
    if (!hit) return null;

    let cur: Element = hit;
    for (let i = 0; i < MAX_DESCEND; i++) {
      const next = this._skippedChildAt(cur, x, y);
      if (!next) break;
      cur = next;
    }
    return cur;
  }

  /**
   * el 의 자식 중 좌표를 품으면서 히트테스트에서 빠진 것. 히트테스트가 잡을 수 있는 자식이었다면
   * elementFromPoint 가 이미 그것(또는 그 자손)을 돌려줬을 테니, 여기서는 건너뛴 것만 본다 —
   * 멀쩡한 자식까지 파고들어 엉뚱한 element 를 고르지 않도록.
   */
  private _skippedChildAt(el: Element, x: number, y: number): Element | null {
    const children = el.children;
    // 나중에 그려진 형제가 위에 오므로 뒤에서부터.
    for (let i = children.length - 1; i >= 0; i--) {
      const child = children[i];
      if (child.hasAttribute('data-pathpicker-ignore')) continue;
      if (!this._containsPoint(child, x, y)) continue;
      const cs = getComputedStyle(child);
      if (cs.pointerEvents !== 'none') continue;
      if (cs.visibility === 'hidden' || cs.opacity === '0') continue;
      return child;
    }
    return null;
  }

  /** 여러 줄로 흐르는 inline element 까지 감안해 조각 rect 단위로 판정. */
  private _containsPoint(el: Element, x: number, y: number): boolean {
    const rects = el.getClientRects();
    const list: DOMRectReadOnly[] =
      rects.length > 0 ? Array.from(rects) : [el.getBoundingClientRect()];
    return list.some(
      (r) =>
        (r.width > 0 || r.height > 0) &&
        x >= r.left &&
        x <= r.right &&
        y >= r.top &&
        y <= r.bottom,
    );
  }

  private _onMouseMove(e: MouseEvent): void {
    const target = this._resolveTarget(e.clientX, e.clientY);
    if (!target || this._shouldIgnore(target)) {
      this.overlay!.style.display = 'none';
      this.tooltip!.style.display = 'none';
      this._setObserverTarget(null);
      this.lastTarget = null;
      return;
    }

    if (target === this.lastTarget) return;
    this.lastTarget = target;
    // 새 element 추적 시작 — 기존 observe 해제하고 새 element 등록.
    this._setObserverTarget(target);

    const rect = target.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      this.overlay!.style.display = 'none';
      this.tooltip!.style.display = 'none';
      return;
    }

    this._positionOverlay(rect);
    this._updateTooltip(target, rect);
  }

  /** ResizeObserver 추적 대상 변경. null 이면 모두 해제. */
  private _setObserverTarget(target: Element | null): void {
    if (!this.resizeObserver) return;
    this.resizeObserver.disconnect();
    if (target) this.resizeObserver.observe(target);
  }

  /**
   * lastTarget 의 현재 rect 를 다시 측정해 overlay/tooltip 갱신.
   * scroll·resize·transitionend·ResizeObserver 등 mousemove 가 없는 변화에서 공용 호출.
   */
  private _refreshOverlay(): void {
    if (!this.lastTarget || !this.active) return;
    const rect = this.lastTarget.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      if (this.overlay) this.overlay.style.display = 'none';
      if (this.tooltip) this.tooltip.style.display = 'none';
      return;
    }
    this._positionOverlay(rect);
    this._updateTooltip(this.lastTarget, rect);
  }

  private _positionOverlay(rect: DOMRect): void {
    if (!this.overlay) return;
    Object.assign(this.overlay.style, {
      display: 'block',
      top: `${rect.top}px`,
      left: `${rect.left}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
    });
  }

  private _updateTooltip(el: Element, rect: DOMRect): void {
    if (!this.tooltip) return;

    const tag = el.tagName.toLowerCase();
    const classes = Array.from(el.classList)
      .filter((c) => !/^css-[a-z0-9]+$/i.test(c))
      .slice(0, 3);
    const classStr = classes.length > 0 ? '.' + classes.join('.') : '';

    const rc = getReactComponent(el);
    let text = `<${tag}${classStr}>`;
    if (this._isDisabled(el)) text += ' · disabled';
    if (rc) text += `\n${rc.name}`;

    this.tooltip.textContent = text;
    this.tooltip.style.display = 'block';

    const tooltipH = this.tooltip.offsetHeight;
    const gap = 8;
    let top = rect.bottom + gap;
    if (top + tooltipH > window.innerHeight) {
      top = rect.top - tooltipH - gap;
    }
    let left = rect.left;
    if (left + 420 > window.innerWidth) {
      left = window.innerWidth - 430;
    }
    if (left < 4) left = 4;

    Object.assign(this.tooltip.style, {
      top: `${top}px`,
      left: `${left}px`,
    });
  }

  private _isDisabled(el: Element): boolean {
    return (
      el.hasAttribute('disabled') ||
      el.getAttribute('aria-disabled') === 'true' ||
      (typeof el.matches === 'function' && el.matches(':disabled'))
    );
  }

  /**
   * 누르는 순간에 확정한다. click 까지 기다리면 그 사이 popover 가 닫혀 커서 밑에는 이미
   * 다른 element 가 와 있다. 대상도 그 자리에서 다시 재지 않고 하이라이트 중인 lastTarget 을
   * 그대로 쓴다 — 보이는 것이 곧 찍히는 것.
   */
  private _onPress(e: Event): void {
    const me = e as MouseEvent;
    const target = this._pickTargetAt(me.clientX, me.clientY);

    // 픽커 자신의 UI 는 통과 — 버튼으로 picking 을 끌 수 있어야 한다.
    if (this._shouldIgnore(target)) return;

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    // 픽은 왼쪽 버튼 누름에서만. 나머지(우클릭·mouseup·click)는 삼키기만 한다.
    const isPrimaryDown =
      (e.type === 'pointerdown' || e.type === 'mousedown') && me.button === 0;
    if (!isPrimaryDown || !target) return;

    const result = this._buildResult(target);
    this.deactivate();
    // deactivate 로 리스너가 빠진 뒤 따라오는 mouseup·click 이 페이지에 닿으면 방금 찍은
    // 버튼이 실제로 눌린다. 짧게 한 번 더 막는다.
    this._swallowTrailingPress();
    this.callbacks.onPick(result);
  }

  /** 하이라이트가 아직 그 좌표에 유효하면 그것을, 아니면 새로 히트테스트한 결과를 쓴다. */
  private _pickTargetAt(x: number, y: number): Element | null {
    const last = this.lastTarget;
    if (last && last.isConnected && this._containsPoint(last, x, y)) return last;
    return this._resolveTarget(x, y);
  }

  private _swallowTrailingPress(): void {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const cleanup = () => {
      clearTimeout(timer);
      for (const type of PRESS_EVENTS) {
        window.removeEventListener(type, stop, true);
      }
    };

    const stop = (ev: Event) => {
      ev.preventDefault();
      ev.stopPropagation();
      ev.stopImmediatePropagation();
      if (ev.type === 'click') cleanup();
    };

    for (const type of PRESS_EVENTS) {
      window.addEventListener(type, stop, true);
    }
    // 드래그로 벗어나 click 이 끝내 오지 않는 경우 대비.
    timer = setTimeout(cleanup, 700);
  }

  private _onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      this.deactivate();
      this.callbacks.onCancel();
    }
  }

  private _onScroll(): void {
    this._refreshOverlay();
  }

  private _buildResult(el: Element): PathPickerResult {
    const rc = getReactComponent(el);
    const textContent = truncate(el.textContent || '', 50);

    return {
      origin: typeof window !== 'undefined' ? window.location.origin : '',
      project: this.callbacks.getProject?.() ?? rc?.projectRoot ?? null,
      route: this.callbacks.getRoute(),
      xpath: getXPath(el),
      cssSelector: getCssSelector(el),
      tagName: el.tagName.toLowerCase(),
      id: el.id || null,
      textContent,
      reactComponent: rc?.name || null,
      reactSource: rc?.source || null,
    };
  }
}
