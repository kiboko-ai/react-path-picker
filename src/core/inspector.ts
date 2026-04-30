import type { InspectorCallbacks, PathPickerResult } from './types';
import { getXPath } from './xpath';
import { getCssSelector } from './css-selector';
import { getReactComponent } from './react-fiber';

const OVERLAY_Z = 99999;
const HIGHLIGHT_BG = 'rgba(50,157,156,0.15)';
const HIGHLIGHT_BORDER = '#329D9C';

function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length > max ? clean.slice(0, max) + '…' : clean;
}

export class PathPickerInspector {
  private callbacks: InspectorCallbacks;
  private overlay: HTMLDivElement | null = null;
  private tooltip: HTMLDivElement | null = null;
  private active = false;

  private handleMouseMove: (e: MouseEvent) => void;
  private handleClick: (e: MouseEvent) => void;
  private handleKeyDown: (e: KeyboardEvent) => void;
  private handleScroll: () => void;
  private lastTarget: Element | null = null;

  constructor(callbacks: InspectorCallbacks) {
    this.callbacks = callbacks;

    this.handleMouseMove = this._onMouseMove.bind(this);
    this.handleClick = this._onClick.bind(this);
    this.handleKeyDown = this._onKeyDown.bind(this);
    this.handleScroll = this._onScroll.bind(this);
  }

  activate(): void {
    if (this.active) return;
    this.active = true;

    this.overlay = document.createElement('div');
    Object.assign(this.overlay.style, {
      position: 'fixed',
      pointerEvents: 'none',
      zIndex: String(OVERLAY_Z),
      background: HIGHLIGHT_BG,
      border: `2px solid ${HIGHLIGHT_BORDER}`,
      borderRadius: '4px',
      transition: 'all 0.08s ease-out',
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

    document.addEventListener('mousemove', this.handleMouseMove, true);
    document.addEventListener('click', this.handleClick, true);
    document.addEventListener('keydown', this.handleKeyDown, true);
    window.addEventListener('scroll', this.handleScroll, true);
  }

  deactivate(): void {
    if (!this.active) return;
    this.active = false;
    this.lastTarget = null;

    document.body.style.cursor = '';
    document.removeEventListener('mousemove', this.handleMouseMove, true);
    document.removeEventListener('click', this.handleClick, true);
    document.removeEventListener('keydown', this.handleKeyDown, true);
    window.removeEventListener('scroll', this.handleScroll, true);

    this.overlay?.remove();
    this.tooltip?.remove();
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

  private _onMouseMove(e: MouseEvent): void {
    const target = document.elementFromPoint(e.clientX, e.clientY);
    if (!target || this._shouldIgnore(target)) {
      this.overlay!.style.display = 'none';
      this.tooltip!.style.display = 'none';
      this.lastTarget = null;
      return;
    }

    if (target === this.lastTarget) return;
    this.lastTarget = target;

    const rect = target.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      this.overlay!.style.display = 'none';
      this.tooltip!.style.display = 'none';
      return;
    }

    this._positionOverlay(rect);
    this._updateTooltip(target, rect);
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

  private _onClick(e: MouseEvent): void {
    const target = document.elementFromPoint(e.clientX, e.clientY);
    if (!target || this._shouldIgnore(target)) return;

    e.preventDefault();
    e.stopPropagation();

    const result = this._buildResult(target);
    this.deactivate();
    this.callbacks.onPick(result);
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
    if (this.lastTarget) {
      const rect = this.lastTarget.getBoundingClientRect();
      this._positionOverlay(rect);
      this._updateTooltip(this.lastTarget, rect);
    }
  }

  private _buildResult(el: Element): PathPickerResult {
    const rc = getReactComponent(el);
    const textContent = truncate(el.textContent || '', 50);

    return {
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
