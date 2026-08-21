import { beforeEach, describe, expect, it } from 'vitest';
import { createHotkeyMatcher, describeHotkey, matchesHotkey } from '../src/react/hotkey';

let clock = 0;
const now = () => clock;

beforeEach(() => {
  clock = 0;
});

function key(k: string, opts: Partial<KeyboardEvent> = {}): KeyboardEvent {
  return {
    key: k,
    code: '',
    repeat: false,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    ...opts,
  } as KeyboardEvent;
}

const shiftDown = () => key('Shift', { shiftKey: true });
const shiftUp = () => key('Shift');

describe('matchesHotkey', () => {
  it('matches a plain combo', () => {
    expect(matchesHotkey(key('p', { altKey: true, code: 'KeyP' }), 'alt+p')).toBe(true);
    expect(matchesHotkey(key('k', { ctrlKey: true, shiftKey: true, code: 'KeyK' }), 'ctrl+shift+k')).toBe(
      true,
    );
  });

  it('reads the physical key so macOS Alt+P still matches when it types a pi', () => {
    expect(matchesHotkey(key('π', { altKey: true, code: 'KeyP' }), 'alt+p')).toBe(true);
  });

  it('rejects when a modifier is off', () => {
    expect(matchesHotkey(key('p', { code: 'KeyP' }), 'alt+p')).toBe(false);
    expect(matchesHotkey(key('p', { altKey: true, shiftKey: true, code: 'KeyP' }), 'alt+p')).toBe(
      false,
    );
  });

  it('rejects an unknown modifier name instead of matching loosely', () => {
    expect(matchesHotkey(key('p', { altKey: true, code: 'KeyP' }), 'hyper+p')).toBe(false);
  });
});

describe('double-tap', () => {
  it('arms on the second tap inside the window', () => {
    const m = createHotkeyMatcher('shift shift', now);

    expect(m.onKeyDown(shiftDown())).toBe(null);
    m.onKeyUp(shiftUp());
    clock = 150;
    expect(m.onKeyDown(shiftDown())).toBe('arm');
  });

  it('never toggles off — the second double-tap arms again', () => {
    const m = createHotkeyMatcher('shift shift', now);

    m.onKeyDown(shiftDown());
    m.onKeyUp(shiftUp());
    clock = 100;
    expect(m.onKeyDown(shiftDown())).toBe('arm');
    m.onKeyUp(shiftUp());
    clock = 200;
    m.onKeyDown(shiftDown());
    m.onKeyUp(shiftUp());
    clock = 300;
    expect(m.onKeyDown(shiftDown())).toBe('arm');
  });

  it('ignores taps that are too far apart', () => {
    const m = createHotkeyMatcher('shift shift', now);

    m.onKeyDown(shiftDown());
    m.onKeyUp(shiftUp());
    clock = 401;
    expect(m.onKeyDown(shiftDown())).toBe(null);
  });

  it('ignores a shift that only shifted a letter — typing "Hi" never arms', () => {
    const m = createHotkeyMatcher('shift shift', now);

    m.onKeyDown(shiftDown());
    m.onKeyDown(key('H', { shiftKey: true, code: 'KeyH' }));
    m.onKeyUp(key('H'));
    m.onKeyUp(shiftUp());
    clock = 120;
    expect(m.onKeyDown(shiftDown())).toBe(null);
  });

  it('forgets the first tap once the pointer is pressed', () => {
    const m = createHotkeyMatcher('shift shift', now);

    m.onKeyDown(shiftDown());
    m.onKeyUp(shiftUp());
    // Shift+click 으로 선택을 누적하는 중. 두 번째 Shift 가 더블탭으로 읽히면 픽커가 꺼진다.
    m.reset();
    clock = 100;
    expect(m.onKeyDown(shiftDown())).toBe(null);
  });

  it('ignores taps carrying another modifier', () => {
    const m = createHotkeyMatcher('shift shift', now);

    m.onKeyDown(shiftDown());
    m.onKeyUp(shiftUp());
    clock = 100;
    expect(m.onKeyDown(key('Shift', { shiftKey: true, ctrlKey: true }))).toBe(null);
  });

  it('ignores auto-repeat from a held key', () => {
    const m = createHotkeyMatcher('shift shift', now);

    m.onKeyDown(shiftDown());
    m.onKeyUp(shiftUp());
    clock = 100;
    expect(m.onKeyDown(key('Shift', { shiftKey: true, repeat: true }))).toBe(null);
  });

  it('needs a release between the taps', () => {
    const m = createHotkeyMatcher('shift shift', now);

    m.onKeyDown(shiftDown());
    clock = 100;
    expect(m.onKeyDown(shiftDown())).toBe(null);
  });

  it('works for other modifiers too', () => {
    const m = createHotkeyMatcher('ctrl ctrl', now);

    m.onKeyDown(key('Control', { ctrlKey: true }));
    m.onKeyUp(key('Control'));
    clock = 100;
    expect(m.onKeyDown(key('Control', { ctrlKey: true }))).toBe('arm');
  });
});

describe('spec forms', () => {
  it('accepts an array and keeps both live', () => {
    const m = createHotkeyMatcher(['alt+p', 'shift shift'], now);

    expect(m.onKeyDown(key('p', { altKey: true, code: 'KeyP' }))).toBe('toggle');
    m.onKeyDown(shiftDown());
    m.onKeyUp(shiftUp());
    clock = 100;
    expect(m.onKeyDown(shiftDown())).toBe('arm');
  });

  it('a combo toggles while a double-tap only arms', () => {
    expect(createHotkeyMatcher('alt+p', now).onKeyDown(key('p', { altKey: true, code: 'KeyP' }))).toBe(
      'toggle',
    );
  });

  it('matches nothing when disabled', () => {
    const m = createHotkeyMatcher(false, now);

    expect(m.onKeyDown(key('p', { altKey: true, code: 'KeyP' }))).toBe(null);
    m.onKeyDown(shiftDown());
    m.onKeyUp(shiftUp());
    clock = 100;
    expect(m.onKeyDown(shiftDown())).toBe(null);
  });

  it('treats a mismatched pair as a combo, not a double-tap', () => {
    const m = createHotkeyMatcher('shift alt', now);

    m.onKeyDown(shiftDown());
    m.onKeyUp(shiftUp());
    clock = 100;
    expect(m.onKeyDown(shiftDown())).toBe(null);
  });
});

describe('describeHotkey', () => {
  it('spells out what the user has to press', () => {
    expect(describeHotkey('shift shift')).toBe('double-tap Shift');
    expect(describeHotkey('alt+p')).toBe('Alt+P');
    expect(describeHotkey('ctrl+shift+k')).toBe('Ctrl+Shift+K');
    expect(describeHotkey(['alt+p', 'shift shift'])).toBe('Alt+P or double-tap Shift');
    expect(describeHotkey(false)).toBe(null);
  });
});

describe('key 가 없는 이벤트 (자동완성·IME·합성 이벤트)', () => {
  // 라이브러리가 호스트 앱을 죽인 실제 사고. 기본 핫키 «shift shift» 의 매처가 window 의
  // 모든 keydown 에서 돌기 때문에, key 없는 이벤트 하나면 로그인 폼 타이핑만으로 페이지가 죽었다.
  const keyless = (opts: Partial<KeyboardEvent> = {}) =>
    ({ code: '', repeat: false, altKey: false, ctrlKey: false, metaKey: false, shiftKey: false, ...opts }) as KeyboardEvent;

  it('matchesHotkey 가 던지지 않는다', () => {
    expect(() => matchesHotkey(keyless(), 'shift+z')).not.toThrow();
    expect(matchesHotkey(keyless({ shiftKey: true }), 'shift+z')).toBe(false);
  });

  it('더블탭 매처가 던지지 않는다', () => {
    const m = createHotkeyMatcher(['shift shift'], now);
    expect(() => m.onKeyDown(keyless({ shiftKey: true }))).not.toThrow();
    expect(m.onKeyDown(keyless({ shiftKey: true }))).toBe(null);
    expect(() => m.onKeyUp(keyless())).not.toThrow();
  });

  it('key 가 없어도 code 로 맞출 수 있으면 맞춘다', () => {
    expect(matchesHotkey(keyless({ altKey: true, code: 'KeyP' }), 'alt+p')).toBe(true);
  });

  it('key 없는 이벤트는 «다른 키» 와 같게 취급해 더블탭을 초기화한다', () => {
    // 특별대우하지 않는다 — 정체를 모르는 이벤트는 «다른 키를 눌렀다» 로 보는 편이
    // 예측 가능하고, 의도치 않은 arm 보다 낫다. 던지지만 않으면 된다.
    const m = createHotkeyMatcher(['shift shift'], now);
    expect(m.onKeyDown(shiftDown())).toBe(null);
    m.onKeyUp(shiftUp());
    m.onKeyDown(keyless()); // 중간에 끼어든 자동완성 이벤트
    clock += 100;
    expect(m.onKeyDown(shiftDown())).toBe(null);
  });
});
