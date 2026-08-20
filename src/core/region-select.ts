/**
 * 드래그 마키(marquee) 영역이 무엇을 고르는지 결정하는 순수 기하 로직.
 *
 * inspector 에서 떼어낸 이유는 두 가지다.
 *   1. jsdom 에는 레이아웃이 없어 rect 를 주입해야 테스트가 된다.
 *   2. 드래그 중에는 프레임마다 계산이 돌므로 DOM 접근과 계산을 분리해야 한다 —
 *      rect 는 드래그 시작에 한 번만 재고(snapshotElements), 이후로는 사각형 산수만 한다.
 */

export interface Band {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** DOMRect 중 여기서 쓰는 필드만. 테스트에서 손으로 만들 수 있게 최소화. */
export interface RectLike {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export interface RectSnapshot {
  el: Element;
  rect: RectLike;
}

export interface RegionSelection {
  /** 문서 순서대로. 영역에 완전히 들어간 element 중 조상이 안 잡힌 것들. */
  elements: Element[];
  /** 상한 때문에 버려진 개수. 0 이 아니면 UI 가 알려야 한다 — 조용한 절단 금지. */
  dropped: number;
}

/** 한 번의 드래그에서 다룰 element 상한. 이보다 큰 페이지는 스냅샷을 자른다. */
export const MAX_SNAPSHOT = 8000;
/** 한 번의 영역 선택으로 담을 element 상한. */
export const MAX_REGION_SELECTION = 30;

/** 서브픽셀 rect 가 경계에서 아깝게 탈락하지 않도록. */
const EPSILON = 0.5;

export function normalizeBand(x1: number, y1: number, x2: number, y2: number): Band {
  return {
    left: Math.min(x1, x2),
    top: Math.min(y1, y2),
    right: Math.max(x1, x2),
    bottom: Math.max(y1, y2),
  };
}

export function bandArea(band: Band): number {
  return Math.max(0, band.right - band.left) * Math.max(0, band.bottom - band.top);
}

function isContained(rect: RectLike, band: Band): boolean {
  return (
    rect.left >= band.left - EPSILON &&
    rect.top >= band.top - EPSILON &&
    rect.right <= band.right + EPSILON &&
    rect.bottom <= band.bottom + EPSILON
  );
}

export interface SnapshotOptions {
  max?: number;
  /**
   * 이 사각형 밖에 완전히 벗어난 element 는 스냅샷에서 뺀다. band 는 언제나 viewport 안이라
   * 화면 밖 노드는 애초에 후보가 될 수 없다. null 이면 컬링하지 않는다.
   */
  viewport?: Band | null;
}

function currentViewport(): Band | null {
  if (typeof window === 'undefined') return null;
  return { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight };
}

/**
 * root 아래 모든 element 의 현재 rect. 드래그 시작과 스크롤 때만 호출한다.
 * 면적이 0 이거나 픽커 자신의 UI(`data-pathpicker-ignore` 서브트리)는 제외.
 */
export function snapshotElements(root: Element, options?: SnapshotOptions): RectSnapshot[] {
  const max = options?.max ?? MAX_SNAPSHOT;
  const viewport = options?.viewport === undefined ? currentViewport() : options.viewport;

  const out: RectSnapshot[] = [];
  const all = root.querySelectorAll('*');

  for (let i = 0; i < all.length && out.length < max; i++) {
    const el = all[i];
    if (el.closest('[data-pathpicker-ignore]')) continue;

    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) continue;
    if (
      viewport &&
      (rect.right < viewport.left ||
        rect.left > viewport.right ||
        rect.bottom < viewport.top ||
        rect.top > viewport.bottom)
    ) {
      continue;
    }

    out.push({ el, rect });
  }

  return out;
}

/**
 * 영역에 **완전히** 들어간 element 중 가장 바깥 것들. 조상이 이미 뽑혔으면 자손은 뺀다 —
 * 카드 하나를 감싸면 카드가 잡히지, 그 안의 h3·p·button 이 따로 잡히지 않는다.
 */
export function selectInBand(
  snapshot: RectSnapshot[],
  band: Band,
  max: number = MAX_REGION_SELECTION,
): RegionSelection {
  const contained: Element[] = [];
  for (const item of snapshot) {
    if (isContained(item.rect, band)) contained.push(item.el);
  }

  const inBand = new Set(contained);
  const outermost: Element[] = [];
  for (const el of contained) {
    let parent = el.parentElement;
    let covered = false;
    while (parent) {
      if (inBand.has(parent)) {
        covered = true;
        break;
      }
      parent = parent.parentElement;
    }
    if (!covered) outermost.push(el);
  }

  return {
    elements: outermost.slice(0, max),
    dropped: Math.max(0, outermost.length - max),
  };
}
