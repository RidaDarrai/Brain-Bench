import { Link } from 'react-router-dom';
import { formatScore, TESTS, TEST_ORDER } from '../core/tests';
import { loadProgress } from '../storage/progress';

export default function HomePage() {
  const progress = loadProgress();

  return (
    <div className="home">
      <section className="hero">
        <h1>Measure your abilities with cognitive tests.</h1>
        <p>
          Six quick tests for reaction speed, memory, and aim. Progress is saved in your browser —
          no account needed.
        </p>
      </section>

      <section className="test-grid">
        {TEST_ORDER.map((id) => {
          const meta = TESTS[id];
          const saved = progress.tests[id];
          return (
            <Link key={id} to={`/test/${id}`} className="test-card">
              <div className="test-card-icon" aria-hidden="true">
                {meta.icon}
              </div>
              <div className="test-card-body">
                <h2>{meta.name}</h2>
                <p>{meta.tagline}</p>
                <div className="test-card-meta">
                  <span className="pill">
                    Best: <strong>{formatScore(meta, saved?.bestScore ?? null)}</strong>
                  </span>
                  {meta.hasLevels && (
                    <span className="pill pill-levels">
                      Level{' '}
                      <strong>
                        {saved?.highestUnlockedLevel ?? meta.defaultStartLevel}/{meta.maxLevel}
                      </strong>{' '}
                      unlocked
                    </span>
                  )}
                  {!meta.hasLevels && <span className="pill">No levels — one continuous run</span>}
                </div>
              </div>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
