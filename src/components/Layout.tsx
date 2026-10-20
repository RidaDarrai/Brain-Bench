import { NavLink, Outlet } from 'react-router-dom';
import { Terminal } from 'lucide-react';
import { cn } from 'cn';
import ThemeToggle from './ThemeToggle';

function navLinkClass({ isActive }: { isActive: boolean }) {
  return cn(
    'rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors',
    'hover:bg-muted hover:text-foreground',
    'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
    isActive && 'bg-muted text-foreground',
  );
}

export default function Layout() {
  return (
    <div className="scanlines flex min-h-dvh flex-col overflow-x-clip bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-3">
          <NavLink
            to="/"
            className="group flex items-center gap-2.5 rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <span className="flex size-8 items-center justify-center rounded-md border border-[var(--brand)]/40 bg-[var(--brand)]/10 text-[var(--brand)] transition-shadow group-hover:shadow-[0_0_16px_var(--glow)]">
              <Terminal className="size-4" />
            </span>
            <span className="text-[15px] font-semibold tracking-tight">
              Brain Bench
              <span className="ml-2 font-mono text-[10px] font-medium tracking-[0.18em] text-muted-foreground uppercase">
                v1
              </span>
            </span>
          </NavLink>
          <nav aria-label="Primary" className="flex items-center gap-1">
            <NavLink to="/" end className={navLinkClass}>
              Tests
            </NavLink>
            <NavLink to="/progress" className={navLinkClass}>
              Progress
            </NavLink>
            <ThemeToggle />
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-8">
        <Outlet />
      </main>

      <footer className="border-t border-border px-5 py-5">
        <p className="mx-auto max-w-6xl text-center text-xs text-muted-foreground">
          Brain Bench — local-only cognitive tests. No accounts, no leaderboards — your progress
          stays in this browser.
        </p>
      </footer>
    </div>
  );
}
