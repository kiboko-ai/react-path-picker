/**
 * 픽커 활성화 키 매칭.
 *
 * 두 가지 문법을 받는다.
 *   - 조합키  `"alt+p"`, `"ctrl+shift+k"` — 누르면 토글.
 *   - 더블탭  `"shift shift"`, `"ctrl ctrl"` — 같은 키를 빠르게 두 번. 켜기만 한다.
 *
 * 더블탭을 넣은 이유는 하나다. Ctrl/Alt/Shift + 글자 조합은 브라우저마다 이미 임자가 있어
 * (Windows·Linux 의 Alt+글자 메뉴 액세스 키, Ctrl+Shift+글자 devtools 계열) "어떤 브라우저
 * 단축키와도 안 겹친다"고 말할 수 있는 조합이 사실상 없다. 반면 수식키 더블탭에 무언가를
 * 바인딩하는 브라우저는 없다 — Windows 고정키도 Shift 다섯 번이다.
 *
 * 더블탭이 끄지는 않는 것도 의도다. Shift 는 멀티 선택의 누적 수식키를 겸하므로,
 * 토글이면 Shift+클릭을 이어가다 픽커가 꺼지는 사고가 난다. 끄기는 Esc·버튼이 맡는다.
 */

export type HotkeyAction = 'toggle' | 'arm';

export interface HotkeyMatcher {
  /** 매칭되면 무엇을 할지, 아니면 null. */
  onKeyDown(e: KeyboardEvent): HotkeyAction | null;
  onKeyUp(e: KeyboardEvent): void;
  /** 포인터 눌림·창 blur 처럼 "타이핑 흐름이 끊겼다"는 신호에서 호출. */
  reset(): void;
}

/** 두 번째 누름이 첫 번째 뗌으로부터 이 안에 와야 한다. */
export const DOUBLE_TAP_WINDOW = 400;

const MODIFIER_ALIASES: Record<string, string> = {
  alt: 'alt',
  option: 'alt',
  opt: 'alt',
  ctrl: 'ctrl',
  control: 'ctrl',
  meta: 'meta',
  cmd: 'meta',
  command: 'meta',
  shift: 'shift',
};

const MODIFIER_EVENT_KEY: Record<string, string> = {
  alt: 'alt',
  ctrl: 'control',
  meta: 'meta',
  shift: 'shift',
};

const ALL_MODIFIERS = ['alt', 'ctrl', 'meta', 'shift'] as const;

/**
 * `"alt+p"`, `"ctrl+shift+k"` 같은 조합을 실제 keydown 과 대조한다.
 * Alt 조합은 브라우저가 e.key 를 다른 문자로 바꿔 주므로(macOS 의 Alt+P → π) 물리 키를 먼저 본다.
 */
export function matchesHotkey(e: KeyboardEvent, spec: string): boolean {
  const parts = spec
    .toLowerCase()
    .split('+')
    .map((p) => p.trim())
    .filter(Boolean);
  const key = parts.pop();
  if (!key) return false;

  const want = { alt: false, ctrl: false, meta: false, shift: false };
  for (const p of parts) {
    const mod = MODIFIER_ALIASES[p];
    if (!mod) return false;
    want[mod as keyof typeof want] = true;
  }

  if (
    e.altKey !== want.alt ||
    e.ctrlKey !== want.ctrl ||
    e.metaKey !== want.meta ||
    e.shiftKey !== want.shift
  ) {
    return false;
  }

  if (/^[a-z]$/.test(key) && e.code === `Key${key.toUpperCase()}`) return true;
  if (/^[0-9]$/.test(key) && e.code === `Digit${key}`) return true;
  return e.key.toLowerCase() === key;
}

function matchesTapKey(e: KeyboardEvent, key: string, mod: string | null): boolean {
  if (mod) return e.key.toLowerCase() === MODIFIER_EVENT_KEY[mod];
  if (/^[a-z]$/.test(key) && e.code === `Key${key.toUpperCase()}`) return true;
  return e.key.toLowerCase() === key;
}

/** 대상 수식키 말고 다른 수식키가 눌려 있으면 더블탭으로 안 친다. */
function noOtherModifier(e: KeyboardEvent, mod: string | null): boolean {
  const held = { alt: e.altKey, ctrl: e.ctrlKey, meta: e.metaKey, shift: e.shiftKey };
  return ALL_MODIFIERS.every((name) => name === mod || !held[name]);
}

interface TapState {
  key: string;
  mod: string | null;
  /** idle → 첫 누름(down) → 첫 뗌(up) → 두 번째 누름에서 발화. */
  phase: 'idle' | 'down' | 'up';
  lastUpAt: number;
}

/** 공백으로 같은 키를 두 번 쓴 것만 더블탭. 그 외는 조합키로 읽는다. */
function parseTap(spec: string): { key: string; mod: string | null } | null {
  const tokens = spec.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length !== 2 || tokens[0] !== tokens[1]) return null;
  const key = tokens[0];
  return { key, mod: MODIFIER_ALIASES[key] ?? null };
}

function toList(spec: string | string[] | false): string[] {
  if (spec === false) return [];
  return (Array.isArray(spec) ? spec : [spec]).map((s) => s.trim()).filter(Boolean);
}

export function createHotkeyMatcher(
  spec: string | string[] | false,
  now: () => number = () => Date.now(),
): HotkeyMatcher {
  const combos: string[] = [];
  const taps: TapState[] = [];

  for (const one of toList(spec)) {
    const tap = parseTap(one);
    if (tap) taps.push({ ...tap, phase: 'idle', lastUpAt: 0 });
    else combos.push(one);
  }

  const reset = () => {
    for (const tap of taps) {
      tap.phase = 'idle';
      tap.lastUpAt = 0;
    }
  };

  return {
    reset,

    onKeyDown(e) {
      if (e.repeat) return null;

      for (const combo of combos) {
        if (matchesHotkey(e, combo)) {
          reset();
          return 'toggle';
        }
      }

      let action: HotkeyAction | null = null;
      for (const tap of taps) {
        if (!matchesTapKey(e, tap.key, tap.mod)) {
          // 두 탭 사이에 다른 키가 끼면 더블탭이 아니다 — `Shift H Shift I` 로 안 켜지는 이유.
          tap.phase = 'idle';
          continue;
        }
        if (!noOtherModifier(e, tap.mod)) {
          tap.phase = 'idle';
          continue;
        }
        if (tap.phase === 'up' && now() - tap.lastUpAt <= DOUBLE_TAP_WINDOW) {
          tap.phase = 'idle';
          action = 'arm';
          continue;
        }
        tap.phase = 'down';
      }
      return action;
    },

    onKeyUp(e) {
      for (const tap of taps) {
        if (tap.phase !== 'down') continue;
        if (!matchesTapKey(e, tap.key, tap.mod)) continue;
        tap.phase = 'up';
        tap.lastUpAt = now();
      }
    },
  };
}

const title = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/** 버튼 title 에 쓰는 사람이 읽을 표기. `false` 면 null. */
export function describeHotkey(spec: string | string[] | false): string | null {
  const parts = toList(spec).map((one) => {
    const tap = parseTap(one);
    if (tap) return `double-tap ${title(tap.key)}`;
    return one
      .split('+')
      .map((p) => title(p.trim()))
      .filter(Boolean)
      .join('+');
  });
  return parts.length > 0 ? parts.join(' or ') : null;
}
