// Settings, data export/import and reset.
//
// Import never replaces data silently: the file is validated first, a summary is shown,
// and the user must choose explicitly between merging and replacing.

import { useRef, useState } from 'react';
import { PageHeader } from '../components/Layout';
import { buildBackup, mergeAppData, parseBackup } from '../lib/storage';
import type { ImportResult } from '../lib/storage';
import { useStore } from '../store/AppStore';
import type { AppData, CursorStyle, Difficulty, TextSize } from '../lib/types';

function Row({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b py-4 last:border-b-0" style={{ borderColor: 'var(--tf-border)' }}>
      <div className="min-w-[220px] flex-1">
        <p className="font-semibold">{title}</p>
        {description && (
          <p className="mt-0.5 text-sm" style={{ color: 'var(--tf-ink-faint)' }}>
            {description}
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} className="tf-chip" onClick={() => onChange(!on)}>
      {on ? 'On' : 'Off'}
    </button>
  );
}

export function SettingsPage() {
  const { settings, updateSettings, data, replaceData, resetAll } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<ImportResult | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const exportBackup = () => {
    const backup = buildBackup(data);
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `typeflow-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setNotice(`Exported ${data.results.length} results and ${Object.keys(data.lessons).length} lesson records.`);
  };

  const onFile = async (file: File) => {
    setNotice(null);
    const text = await file.text();
    setPending(parseBackup(text));
  };

  const applyImport = (mode: 'merge' | 'replace') => {
    if (!pending?.ok) return;
    const next: AppData = mode === 'merge' ? mergeAppData(data, pending.data) : pending.data;
    replaceData(next);
    setPending(null);
    setNotice(
      mode === 'merge'
        ? `Merged backup: your history now has ${next.results.length} results.`
        : `Replaced all data with the backup: ${next.results.length} results restored.`,
    );
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div>
      <PageHeader
        title="Settings"
        lead="Preferences are saved in this browser and applied the next time you visit. Nothing is sent anywhere."
      />

      {notice && (
        <p
          className="tf-card mb-5 p-4 text-sm font-semibold"
          role="status"
          style={{ background: 'var(--tf-correct-bg)', color: 'var(--tf-correct)', borderColor: 'var(--tf-correct)' }}
        >
          {notice}
        </p>
      )}

      <section className="tf-card mb-6 px-5" aria-labelledby="appearance">
        <h2 id="appearance" className="pt-5 text-lg font-bold">
          Appearance
        </h2>
        <Row title="Theme" description="Light and dark both meet AA contrast for body text.">
          {(['light', 'dark'] as const).map((t) => (
            <button key={t} type="button" className="tf-chip capitalize" aria-pressed={settings.theme === t} onClick={() => updateSettings({ theme: t })}>
              {t}
            </button>
          ))}
        </Row>
        <Row title="Text size" description="Size of the typing passage.">
          {(['small', 'medium', 'large'] as TextSize[]).map((s) => (
            <button key={s} type="button" className="tf-chip capitalize" aria-pressed={settings.textSize === s} onClick={() => updateSettings({ textSize: s })}>
              {s}
            </button>
          ))}
        </Row>
        <Row title="Cursor style" description="How the current typing position is marked.">
          {(['bar', 'block', 'underline'] as CursorStyle[]).map((c) => (
            <button key={c} type="button" className="tf-chip capitalize" aria-pressed={settings.cursor === c} onClick={() => updateSettings({ cursor: c })}>
              {c}
            </button>
          ))}
        </Row>
      </section>

      <section className="tf-card mb-6 px-5" aria-labelledby="typing">
        <h2 id="typing" className="pt-5 text-lg font-bold">
          Typing experience
        </h2>
        <Row title="On-screen keyboard" description="Show the QWERTY keyboard with the next key highlighted.">
          <Toggle label="On-screen keyboard" on={settings.showKeyboard} onChange={(v) => updateSettings({ showKeyboard: v })} />
        </Row>
        <Row title="Finger guidance" description="Name the finger and hand for the next key.">
          <Toggle label="Finger guidance" on={settings.showFingerGuide} onChange={(v) => updateSettings({ showFingerGuide: v })} />
        </Row>
        <Row title="Live statistics" description="Show WPM and accuracy while you type. Turn off to reduce distraction.">
          <Toggle label="Live statistics" on={settings.liveStats} onChange={(v) => updateSettings({ liveStats: v })} />
        </Row>
        <Row title="Blind mode" description="Hide correct/incorrect colouring while typing. Results are still scored normally.">
          <Toggle label="Blind mode" on={settings.blindMode} onChange={(v) => updateSettings({ blindMode: v })} />
        </Row>
        <Row title="Sound effects" description="Short synthesised key, error and completion tones. No audio files are downloaded.">
          <Toggle label="Sound effects" on={settings.sound} onChange={(v) => updateSettings({ sound: v })} />
        </Row>
      </section>

      <section className="tf-card mb-6 px-5" aria-labelledby="defaults">
        <h2 id="defaults" className="pt-5 text-lg font-bold">
          Test defaults
        </h2>
        <Row title="Default difficulty">
          {(['beginner', 'intermediate', 'advanced'] as Difficulty[]).map((d) => (
            <button
              key={d}
              type="button"
              className="tf-chip capitalize"
              aria-pressed={settings.defaultDifficulty === d}
              onClick={() => updateSettings({ defaultDifficulty: d })}
            >
              {d}
            </button>
          ))}
        </Row>
        <Row title="Default duration">
          {[15, 30, 60, 120, 180, 300].map((s) => (
            <button
              key={s}
              type="button"
              className="tf-chip"
              aria-pressed={settings.defaultDurationSec === s}
              onClick={() => updateSettings({ defaultDurationSec: s })}
            >
              {s < 60 ? `${s}s` : `${s / 60}m`}
            </button>
          ))}
        </Row>
        <Row title="Default word count">
          {[10, 25, 50, 100, 200].map((w) => (
            <button
              key={w}
              type="button"
              className="tf-chip"
              aria-pressed={settings.defaultWordCount === w}
              onClick={() => updateSettings({ defaultWordCount: w })}
            >
              {w}
            </button>
          ))}
        </Row>
      </section>

      <section className="tf-card mb-6 p-5" aria-labelledby="data">
        <h2 id="data" className="text-lg font-bold">
          Your data
        </h2>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--tf-ink-soft)' }}>
          TypeFlow stores everything in this browser's localStorage: {data.results.length} test results,{' '}
          {Object.keys(data.lessons).length} lesson records, {Object.keys(data.achievements).length} achievements and your
          settings. Nothing is uploaded. <strong>This data is lost if you clear your browser storage, use private
          browsing, or switch to another device or browser.</strong> Export a backup regularly if your history matters to
          you.
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" className="tf-btn tf-btn-primary" onClick={exportBackup}>
            Export backup (JSON)
          </button>
          <button type="button" className="tf-btn" onClick={() => fileRef.current?.click()}>
            Import backup
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void onFile(file);
            }}
          />
        </div>

        {pending && (
          <div
            className="mt-4 rounded-xl border p-4"
            role="alert"
            style={{
              borderColor: pending.ok ? 'var(--tf-accent)' : 'var(--tf-wrong)',
              background: pending.ok ? 'var(--tf-accent-soft)' : 'var(--tf-wrong-bg)',
            }}
          >
            {pending.ok ? (
              <>
                <p className="font-bold">Backup file validated</p>
                <p className="mt-1 text-sm">
                  It contains {pending.summary.results} test results, {pending.summary.lessons} lesson records and{' '}
                  {pending.summary.achievements} achievements. Choose how to apply it - your current data is untouched
                  until you confirm.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" className="tf-btn tf-btn-primary" onClick={() => applyImport('merge')}>
                    Merge with my data
                  </button>
                  <button type="button" className="tf-btn tf-btn-danger" onClick={() => applyImport('replace')}>
                    Replace all my data
                  </button>
                  <button
                    type="button"
                    className="tf-btn tf-btn-ghost"
                    onClick={() => {
                      setPending(null);
                      if (fileRef.current) fileRef.current.value = '';
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="font-bold" style={{ color: 'var(--tf-wrong)' }}>
                  That file could not be imported
                </p>
                <p className="mt-1 text-sm" style={{ color: 'var(--tf-wrong)' }}>
                  {pending.error} Nothing was changed.
                </p>
                <button
                  type="button"
                  className="tf-btn tf-btn-ghost mt-3"
                  onClick={() => {
                    setPending(null);
                    if (fileRef.current) fileRef.current.value = '';
                  }}
                >
                  Dismiss
                </button>
              </>
            )}
          </div>
        )}
      </section>

      <section className="tf-card p-5" aria-labelledby="reset" style={{ borderColor: 'var(--tf-wrong)' }}>
        <h2 id="reset" className="text-lg font-bold" style={{ color: 'var(--tf-wrong)' }}>
          Reset
        </h2>
        <p className="mt-2 text-sm" style={{ color: 'var(--tf-ink-soft)' }}>
          Permanently delete all locally stored TypeFlow data: test history, personal records, lesson progress,
          achievements and settings. This cannot be undone.
        </p>
        {!confirmReset ? (
          <button type="button" className="tf-btn tf-btn-danger mt-4" onClick={() => setConfirmReset(true)}>
            Clear all my data
          </button>
        ) : (
          <div className="mt-4 rounded-xl border p-4" role="alert" style={{ borderColor: 'var(--tf-wrong)', background: 'var(--tf-wrong-bg)' }}>
            <p className="font-bold" style={{ color: 'var(--tf-wrong)' }}>
              Delete {data.results.length} results and all progress?
            </p>
            <p className="mt-1 text-sm" style={{ color: 'var(--tf-wrong)' }}>
              Export a backup first if you want to keep your history.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="tf-btn tf-btn-danger"
                onClick={() => {
                  resetAll();
                  setConfirmReset(false);
                  setNotice('All local TypeFlow data has been cleared.');
                }}
              >
                Yes, delete everything
              </button>
              <button type="button" className="tf-btn tf-btn-ghost" onClick={() => setConfirmReset(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
