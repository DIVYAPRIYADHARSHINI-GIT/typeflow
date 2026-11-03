// QWERTY layout model and finger mapping for the on-screen keyboard.
//
// The map is used for two things: highlighting the next expected key, and telling the
// learner which finger should press it. Finger assignments follow standard touch-typing
// practice (index fingers cover two columns, little fingers cover the outer keys).

export type Finger =
  | 'left-little'
  | 'left-ring'
  | 'left-middle'
  | 'left-index'
  | 'thumb'
  | 'right-index'
  | 'right-middle'
  | 'right-ring'
  | 'right-little';

export const FINGER_LABELS: Record<Finger, string> = {
  'left-little': 'Left little finger',
  'left-ring': 'Left ring finger',
  'left-middle': 'Left middle finger',
  'left-index': 'Left index finger',
  thumb: 'Thumb',
  'right-index': 'Right index finger',
  'right-middle': 'Right middle finger',
  'right-ring': 'Right ring finger',
  'right-little': 'Right little finger',
};

export function handOf(finger: Finger): 'left' | 'right' | 'both' {
  if (finger === 'thumb') return 'both';
  return finger.startsWith('left') ? 'left' : 'right';
}

export interface KeyDef {
  /** Lower-case primary character, or a control label like "Shift". */
  id: string;
  lower: string;
  upper: string;
  finger: Finger;
  /** Relative width in key units. */
  width?: number;
  /** True for F and J, which carry the physical homing bumps. */
  homing?: boolean;
}

const k = (lower: string, upper: string, finger: Finger, extra: Partial<KeyDef> = {}): KeyDef => ({
  id: lower,
  lower,
  upper,
  finger,
  ...extra,
});

export const KEYBOARD_ROWS: KeyDef[][] = [
  [
    k('`', '~', 'left-little'),
    k('1', '!', 'left-little'),
    k('2', '@', 'left-ring'),
    k('3', '#', 'left-middle'),
    k('4', '$', 'left-index'),
    k('5', '%', 'left-index'),
    k('6', '^', 'right-index'),
    k('7', '&', 'right-index'),
    k('8', '*', 'right-middle'),
    k('9', '(', 'right-ring'),
    k('0', ')', 'right-little'),
    k('-', '_', 'right-little'),
    k('=', '+', 'right-little'),
    k('Backspace', 'Backspace', 'right-little', { width: 2 }),
  ],
  [
    k('Tab', 'Tab', 'left-little', { width: 1.5 }),
    k('q', 'Q', 'left-little'),
    k('w', 'W', 'left-ring'),
    k('e', 'E', 'left-middle'),
    k('r', 'R', 'left-index'),
    k('t', 'T', 'left-index'),
    k('y', 'Y', 'right-index'),
    k('u', 'U', 'right-index'),
    k('i', 'I', 'right-middle'),
    k('o', 'O', 'right-ring'),
    k('p', 'P', 'right-little'),
    k('[', '{', 'right-little'),
    k(']', '}', 'right-little'),
    k('\\', '|', 'right-little', { width: 1.5 }),
  ],
  [
    k('CapsLock', 'Caps', 'left-little', { width: 1.75 }),
    k('a', 'A', 'left-little'),
    k('s', 'S', 'left-ring'),
    k('d', 'D', 'left-middle'),
    k('f', 'F', 'left-index', { homing: true }),
    k('g', 'G', 'left-index'),
    k('h', 'H', 'right-index'),
    k('j', 'J', 'right-index', { homing: true }),
    k('k', 'K', 'right-middle'),
    k('l', 'L', 'right-ring'),
    k(';', ':', 'right-little'),
    k("'", '"', 'right-little'),
    k('Enter', 'Enter', 'right-little', { width: 2.25 }),
  ],
  [
    k('ShiftLeft', 'Shift', 'left-little', { width: 2.25 }),
    k('z', 'Z', 'left-little'),
    k('x', 'X', 'left-ring'),
    k('c', 'C', 'left-middle'),
    k('v', 'V', 'left-index'),
    k('b', 'B', 'left-index'),
    k('n', 'N', 'right-index'),
    k('m', 'M', 'right-index'),
    k(',', '<', 'right-middle'),
    k('.', '>', 'right-ring'),
    k('/', '?', 'right-little'),
    k('ShiftRight', 'Shift', 'right-little', { width: 2.75 }),
  ],
  [k(' ', 'Space', 'thumb', { width: 10 })],
];

/** character -> the key that produces it, and whether Shift is required. */
const CHAR_INDEX = new Map<string, { key: KeyDef; shift: boolean }>();
for (const row of KEYBOARD_ROWS) {
  for (const key of row) {
    if (key.lower.length === 1) CHAR_INDEX.set(key.lower, { key, shift: false });
    if (key.upper.length === 1 && !CHAR_INDEX.has(key.upper)) CHAR_INDEX.set(key.upper, { key, shift: true });
  }
}

export interface KeyHint {
  keyId: string;
  finger: Finger;
  hand: 'left' | 'right' | 'both';
  shift: boolean;
  /** Which Shift key to use: always the hand OPPOSITE to the letter. */
  shiftKeyId: 'ShiftLeft' | 'ShiftRight' | null;
  label: string;
}

/** Resolve the finger guidance for the next expected character. */
export function keyHintFor(char: string | undefined): KeyHint | null {
  if (!char) return null;
  if (char === '\n') {
    return {
      keyId: 'Enter',
      finger: 'right-little',
      hand: 'right',
      shift: false,
      shiftKeyId: null,
      label: 'Right little finger - Enter',
    };
  }
  const found = CHAR_INDEX.get(char);
  if (!found) return null;
  const { key, shift } = found;
  const hand = handOf(key.finger);
  // Opposite-hand Shift rule.
  const shiftKeyId = shift ? (hand === 'left' ? 'ShiftRight' : 'ShiftLeft') : null;
  const name = char === ' ' ? 'Space' : key.upper.length === 1 && shift ? key.upper : key.lower.toUpperCase();
  return {
    keyId: key.id,
    finger: key.finger,
    hand,
    shift,
    shiftKeyId,
    label: shift ? `${FINGER_LABELS[key.finger]} + opposite Shift - ${name}` : `${FINGER_LABELS[key.finger]} - ${name}`,
  };
}

export function displayLabel(key: KeyDef): string {
  if (key.id === ' ') return '';
  if (key.id === 'ShiftLeft' || key.id === 'ShiftRight') return 'Shift';
  if (key.lower.length > 1) return key.lower;
  return key.lower.toUpperCase();
}
