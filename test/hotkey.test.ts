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
