// Application shell: logo, navigation, theme toggle, storage warning and footer.

import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useStore } from '../store/AppStore';

const NAV = [
  { to: '/', label: 'Home', end: true },
  { to: '/test', label: 'Typing Tests' },
  { to: '/lessons', label: 'Lessons' },
  { to: '/code', label: 'Coding' },
  { to: '/progress', label: 'Progress' },
  { to: '/settings', label: 'Settings' },
  { to: '/help', label: 'Help' },
  { to: '/about', label: 'About' },
];

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" role="presentation">
      <rect x="1" y="6" width="30" height="20" rx="5" fill="var(--tf-accent)" />
      <rect x="5" y="10" width="4" height="4" rx="1.2" fill="var(--tf-accent-ink)" opacity="0.95" />
      <rect x="11" y="10" width="4" height="4" rx="1.2" fill="var(--tf-accent-ink)" opacity="0.7" />
      <rect x="17" y="10" width="4" height="4" rx="1.2" fill="var(--tf-accent-ink)" opacity="0.5" />
      <rect x="23" y="10" width="4" height="4" rx="1.2" fill="var(--tf-accent-ink)" opacity="0.35" />
      <rect x="5" y="17" width="16" height="4" rx="1.6" fill="var(--tf-accent-ink)" opacity="0.9" />
      <rect x="23" y="17" width="4" height="4" rx="1.2" fill="var(--tf-accent-ink)" opacity="0.6" />
    </svg>
  );
}

function ThemeToggle() {
  const { settings, updateSettings } = useStore();
  const dark = settings.theme === 'dark';
  return (
    <button
      type="button"
      className="tf-btn tf-btn-ghost"
      style={{ minWidth: 44, padding: '0 0.7rem' }}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={() => updateSettings({ theme: dark ? 'light' : 'dark' })}
    >
      <span aria-hidden="true">{dark ? '☀' : '☾'}</span>
    </button>
  );
}

function StorageBanner() {
  const { storage } = useStore();
  if (storage === 'ok') return null;
  return (
    <div
      role="alert"
      className="px-4 py-2 text-center text-sm font-semibold"
      style={{ background: 'var(--tf-warn-bg)', color: 'var(--tf-warn)' }}
    >
      {storage === 'full'
        ? 'Your browser storage is full, so new results cannot be saved. Export a backup from Settings, then clear some data.'
        : 'Browser storage is unavailable (private mode or blocked site data). You can still practise, but results will not be saved.'}
    </div>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-full flex-col">
      <a href="#main" className="tf-skip-link">
        Skip to main content
      </a>
      <StorageBanner />

      <header
        className="sticky top-0 z-40 border-b backdrop-blur"
        style={{ borderColor: 'var(--tf-border)', background: 'color-mix(in srgb, var(--tf-surface) 88%, transparent)' }}
      >
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          {/* min-h-11 keeps the wordmark link a real 44px tap target on touch devices. */}
          <NavLink
            to="/"
            className="flex min-h-11 items-center gap-2 font-extrabold"
            style={{ color: 'var(--tf-ink)' }}
          >
            <Logo />
            <span className="text-lg tracking-tight">TypeFlow</span>
          </NavLink>

          <nav aria-label="Main" className="ml-auto hidden lg:block">
            <ul className="flex items-center gap-1">
              {NAV.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className="tf-btn tf-btn-ghost"
                    style={({ isActive }) =>
                      isActive
                        ? { background: 'var(--tf-accent-soft)', color: 'var(--tf-accent)' }
                        : undefined
                    }
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="ml-auto flex items-center gap-2 lg:ml-2">
            <ThemeToggle />
            <button
              type="button"
              className="tf-btn tf-btn-ghost lg:hidden"
              style={{ minWidth: 44, padding: '0 0.7rem' }}
              aria-expanded={open}
              aria-controls="mobile-nav"
              onClick={() => setOpen((v) => !v)}
            >
              <span aria-hidden="true">{open ? '✕' : '☰'}</span>
              <span className="sr-only">{open ? 'Close menu' : 'Open menu'}</span>
            </button>
          </div>
        </div>

        {open && (
          <nav id="mobile-nav" aria-label="Mobile" className="border-t lg:hidden" style={{ borderColor: 'var(--tf-border)' }}>
            <ul className="mx-auto grid max-w-6xl grid-cols-2 gap-1 px-4 py-3 sm:grid-cols-3">
              {NAV.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    onClick={() => setOpen(false)}
                    className="tf-btn tf-btn-ghost w-full"
                    style={({ isActive }) =>
                      isActive ? { background: 'var(--tf-accent-soft)', color: 'var(--tf-accent)' } : undefined
                    }
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </header>

      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-8">
        {children}
      </main>

      <footer className="border-t" style={{ borderColor: 'var(--tf-border)' }}>
        <div
          className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 text-sm sm:flex-row sm:items-center sm:justify-between"
          style={{ color: 'var(--tf-ink-faint)' }}
        >
          <p>TypeFlow - Type faster. Type right. Free forever, no account needed.</p>
          <p>Your results are stored only in this browser.</p>
        </div>
      </footer>
    </div>
  );
}

export function PageHeader({ title, lead }: { title: string; lead?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
      {lead && (
        <p className="mt-2 max-w-3xl text-base" style={{ color: 'var(--tf-ink-soft)' }}>
          {lead}
        </p>
      )}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div className="tf-card p-4">
      <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--tf-ink-faint)' }}>
        {label}
      </div>
      <div className="tf-stat-value mt-1 text-2xl sm:text-3xl" style={accent ? { color: 'var(--tf-accent)' } : undefined}>
        {value}
      </div>
      {hint && (
        <div className="mt-1 text-xs" style={{ color: 'var(--tf-ink-faint)' }}>
          {hint}
        </div>
      )}
    </div>
  );
}
