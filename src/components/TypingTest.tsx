// The typing surface.
//
// Keyboard input is captured on a hidden input element so that mobile browsers raise the
// software keyboard, while the visible passage is rendered character-by-character from
// engine state. Paste, drop and autofill are refused outright: the engine only ever
// receives single characters, so a pasted passage cannot inflate a score.

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { ClipboardEvent, DragEvent, KeyboardEvent } from 'react';
import {
  createEngineState,
  elapsedSeconds,
  engineReducer,
  metricsOf,
  progressOf,
  remainingCharacters,
  remainingSeconds,
} from '../lib/engine';
import type { EngineState } from '../lib/engine';
import { FingerHint, OnScreenKeyboard } from './Keyboard';
import { playSound } from '../lib/sound';
import type { Metrics, Settings, TestConfig } from '../lib/types';

interface Props {
  config: TestConfig;
  text: string;
  caption?: string;
  settings: Settings;
  onComplete: (metrics: Metrics, state: EngineState) => void;
  onRestart: () => void;
  onExit: () => void;
  exitLabel?: string;
}

function formatClock(seconds: number): string {
  const s = Math.ceil(seconds);
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}:${String(s % 60).padStart(2, '0')}` : `${s}`;
}

export function TypingTest({ config, text, caption, settings, onComplete, onRestart, onExit, exitLabel }: Props) {
  const [state, dispatch] = useReducer(engineReducer, undefined, () => createEngineState(config, text));
  const [now, setNow] = useState(() => performance.now());
  const [lastKey, setLastKey] = useState<{ char: string; correct: boolean } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const completedRef = useRef(false);
  const caretRef = useRef<HTMLSpanElement>(null);

  // Reset whenever the test identity changes (new text or new config).
  useEffect(() => {
    completedRef.current = false;
    setLastKey(null);
    dispatch({ type: 'reset', text });
  }, [text, config]);

  // One shared 200 ms clock drives the timer, live stats and auto-finish.
  useEffect(() => {
    if (state.status !== 'running') return;
    const id = window.setInterval(() => {
      const t = performance.now();
      setNow(t);
      dispatch({ type: 'tick', now: t });
    }, 200);
    return () => window.clearInterval(id);
  }, [state.status]);

  // Report completion exactly once.
  useEffect(() => {
    if (state.status === 'finished' && !completedRef.current) {
      completedRef.current = true;
      const metrics = metricsOf(state, performance.now());
      if (settings.sound) playSound('finish');
      onComplete(metrics, state);
    }
  }, [state, onComplete, settings.sound]);

  // Keep the active character scrolled into view during long passages.
  useEffect(() => {
    caretRef.current?.scrollIntoView({ block: 'center', behavior: 'auto' });
  }, [state.cursor]);

  const focusInput = useCallback(() => inputRef.current?.focus(), []);
  useEffect(() => {
    focusInput();
  }, [focusInput, text]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (state.status === 'finished') return;

      // Shortcuts that must not be swallowed.
      if (event.key === 'Escape') {
        event.preventDefault();
        onRestart();
        return;
      }
      if (event.key === 'Tab') return; // leave focus management to the browser

      if (event.key === 'Backspace') {
        event.preventDefault();
        if (state.status === 'paused') return;
        dispatch({ type: 'backspace', now: performance.now(), word: event.ctrlKey || event.altKey || event.metaKey });
        return;
      }

      // Ignore modified keystrokes (copy/paste/shortcuts) - but allow plain Shift+letter.
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      if (event.key === 'Enter') {
        event.preventDefault();
        pressChar('\n');
        return;
      }

      if (event.key.length !== 1) return;
      event.preventDefault();
      pressChar(event.key);

      function pressChar(char: string) {
        if (state.status === 'paused') return;
        const expected = state.cells[state.cursor]?.expected;
        const correct = char === expected;
        setLastKey({ char, correct });
        if (settings.sound) playSound(correct ? 'key' : 'error');
        dispatch({ type: 'type', char, now: performance.now() });
      }
    },
    [state, onRestart, settings.sound],
  );

  const blockPaste = useCallback((event: ClipboardEvent<HTMLInputElement> | DragEvent<HTMLInputElement>) => {
    event.preventDefault();
    dispatch({ type: 'paste-blocked' });
  }, []);

  const metrics = useMemo(() => metricsOf(state, now), [state, now]);
  const remaining = remainingSeconds(state, now);
  const progress = progressOf(state, now);
  const elapsed = elapsedSeconds(state, now);
  const nextChar = state.cells[state.cursor]?.expected;
  const typedWords = state.cells.slice(0, state.cursor).filter((c) => c.expected === ' ').length;
  const totalWords = state.cells.filter((c) => c.expected === ' ').length + 1;

  const running = state.status === 'running';
  const paused = state.status === 'paused';

  return (
    <div className="flex flex-col gap-4">
      {/* Status bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--tf-ink-faint)' }}>
              {remaining !== null ? 'Time left' : 'Elapsed'}
            </div>
            <div className="tf-stat-value text-3xl" style={{ color: 'var(--tf-accent)' }} aria-live="off">
              {remaining !== null ? formatClock(remaining) : formatClock(elapsed)}
            </div>
          </div>
          {remaining === null && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--tf-ink-faint)' }}>
                Words
              </div>
              <div className="tf-stat-value text-3xl">
                {Math.min(typedWords, totalWords)}/{totalWords}
              </div>
            </div>
          )}
          {settings.liveStats && (
            <>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--tf-ink-faint)' }}>
                  WPM
                </div>
                <div className="tf-stat-value text-3xl">{Math.round(metrics.grossWpm)}</div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--tf-ink-faint)' }}>
                  Accuracy
                </div>
                <div className="tf-stat-value text-3xl">{Math.round(metrics.accuracy)}%</div>
              </div>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {running && (
            <button type="button" className="tf-btn" onClick={() => dispatch({ type: 'pause', now: performance.now() })}>
              Pause
            </button>
          )}
          {paused && (
            <button
              type="button"
              className="tf-btn tf-btn-primary"
              onClick={() => {
                dispatch({ type: 'resume', now: performance.now() });
                focusInput();
              }}
            >
              Resume
            </button>
          )}
          <button type="button" className="tf-btn" onClick={onRestart}>
            Restart
          </button>
          <button type="button" className="tf-btn tf-btn-ghost" onClick={onExit}>
            {exitLabel ?? 'Change test'}
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div
        className="h-1.5 w-full overflow-hidden rounded-full"
        style={{ background: 'var(--tf-surface-2)' }}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
        aria-label="Test progress"
      >
        <div
          className="h-full rounded-full transition-[width] duration-200"
          style={{ width: `${progress * 100}%`, background: 'var(--tf-accent)' }}
        />
      </div>

      {caption && (
        <p className="text-sm italic" style={{ color: 'var(--tf-ink-faint)' }}>
          {caption}
        </p>
      )}

      {/* Typing surface */}
      <div
        className="tf-card relative p-4 sm:p-6"
        onClick={focusInput}
        role="group"
        aria-label="Typing passage"
      >
        {paused && (
          <div
            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-[14px]"
            style={{ background: 'color-mix(in srgb, var(--tf-surface) 92%, transparent)' }}
          >
            <p className="text-lg font-bold">Test paused</p>
            <p className="text-sm" style={{ color: 'var(--tf-ink-soft)' }}>
              The timer is stopped. Your progress is kept.
            </p>
            <button
              type="button"
              className="tf-btn tf-btn-primary"
              onClick={() => {
                dispatch({ type: 'resume', now: performance.now() });
                focusInput();
              }}
            >
              Resume typing
            </button>
          </div>
        )}

        <div
          className="tf-passage max-h-[46vh] overflow-y-auto"
          data-size={settings.textSize}
          data-cursor={settings.cursor}
          data-blind={settings.blindMode || undefined}
        >
          {state.cells.map((cell, i) => {
            const isCurrent = i === state.cursor;
            const isSpace = cell.expected === ' ';
            const isNewline = cell.expected === '\n';
            return (
              <span
                key={i}
                ref={isCurrent ? caretRef : undefined}
                className="tf-ch"
                data-state={cell.state}
                data-current={isCurrent || undefined}
                data-space={isSpace || undefined}
              >
                {isNewline ? '\n' : cell.expected}
              </span>
            );
          })}
        </div>

        {/* Hidden capture input: keeps mobile keyboards available without showing text. */}
        <input
          ref={inputRef}
          type="text"
          className="absolute h-px w-px opacity-0"
          style={{ left: '-9999px' }}
          value=""
          onChange={() => {
            /* all input is handled in onKeyDown; this keeps React happy */
          }}
          onKeyDown={handleKeyDown}
          onPaste={blockPaste}
          onDrop={blockPaste}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          aria-label="Typing input. Start typing to begin the test."
        />

        {state.status === 'idle' && (
          <p className="mt-4 text-center text-sm font-semibold" style={{ color: 'var(--tf-accent)' }}>
            Start typing to begin - the timer starts with your first keystroke.
          </p>
        )}

        {state.pasteBlocked && (
          <p
            className="mt-3 rounded-lg px-3 py-2 text-sm font-semibold"
            role="alert"
            style={{ background: 'var(--tf-warn-bg)', color: 'var(--tf-warn)' }}
          >
            Pasting is disabled so that results stay honest. Please type the passage.
          </p>
        )}
      </div>

      {/* Live region for screen readers - polite so it does not interrupt typing. */}
      <p className="sr-only" aria-live="polite">
        {remaining !== null
          ? `${Math.ceil(remaining)} seconds remaining`
          : `${remainingCharacters(state)} characters remaining`}
      </p>

      {settings.showKeyboard && (
        <>
          <div className="hidden md:block">
            <OnScreenKeyboard nextChar={nextChar} lastKey={lastKey} showFingerGuide={settings.showFingerGuide} />
          </div>
          {settings.showFingerGuide && (
            <div className="md:hidden">
              <FingerHint nextChar={nextChar} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
