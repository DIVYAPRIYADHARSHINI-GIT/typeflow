// On-screen QWERTY keyboard with next-key highlighting and finger guidance.

import { KEYBOARD_ROWS, displayLabel, keyHintFor } from '../lib/keyboard';
import type { KeyHint } from '../lib/keyboard';

interface Props {
  /** The next character the user must type. */
  nextChar: string | undefined;
  /** Outcome of the last keystroke, for hit colouring. */
  lastKey: { char: string; correct: boolean } | null;
  showFingerGuide: boolean;
}

export function OnScreenKeyboard({ nextChar, lastKey, showFingerGuide }: Props) {
  const hint: KeyHint | null = keyHintFor(nextChar);
  const lastHint = lastKey ? keyHintFor(lastKey.char) : null;

  return (
    <div className="tf-card p-2 sm:p-3" aria-hidden={false}>
      <div className="flex flex-col gap-1.5">
        {KEYBOARD_ROWS.map((row, rowIndex) => (
          <div key={rowIndex} className="flex gap-1.5">
            {row.map((key) => {
              const isNext = hint !== null && (key.id === hint.keyId || key.id === hint.shiftKeyId);
              const wasHit = lastHint !== null && key.id === lastHint.keyId;
              return (
                <div
                  key={key.id}
                  className="tf-key relative"
                  style={{ flex: `${key.width ?? 1} 1 0%` }}
                  data-next={isNext || undefined}
                  data-hit={wasHit && !isNext ? (lastKey?.correct ? 'correct' : 'incorrect') : undefined}
                  data-homing={key.homing || undefined}
                >
                  {displayLabel(key)}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {showFingerGuide && (
        <p
          className="mt-3 text-center text-sm font-semibold"
          role="status"
          aria-live="polite"
          style={{ color: hint ? 'var(--tf-accent)' : 'var(--tf-ink-faint)' }}
        >
          {hint ? hint.label : 'Ready - the next finger hint appears here.'}
        </p>
      )}
    </div>
  );
}

/** Compact hand/finger indicator for narrow screens where the full keyboard is hidden. */
export function FingerHint({ nextChar }: { nextChar: string | undefined }) {
  const hint = keyHintFor(nextChar);
  if (!hint) return null;
  return (
    <div
      className="tf-card flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold"
      style={{ color: 'var(--tf-accent)' }}
      role="status"
      aria-live="polite"
    >
      <span aria-hidden="true">{hint.hand === 'left' ? '◀' : hint.hand === 'right' ? '▶' : '●'}</span>
      {hint.label}
    </div>
  );
}
