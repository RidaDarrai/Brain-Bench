import { NavLink, Outlet } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';

export default function Layout() {
  return (
    <div className="layout scanlines">
      <header className="site-header">
        <NavLink to="/" className="brand">
          <span className="brand-mark">🧠</span> Brain Bench
        </NavLink>
        <nav className="site-nav">
          <NavLink to="/" end>
            Tests
          </NavLink>
          <NavLink to="/progress">Progress</NavLink>
          <ThemeToggle />
        </nav>
      </header>
      <main className="site-main">
        <Outlet />
      </main>
      <footer className="site-footer">
        <span>
          Brain Bench — local-only cognitive tests. No accounts, no leaderboards — your progress
          stays in this browser.
        </span>
      </footer>
    </div>
  );
}
