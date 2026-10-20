import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatScore, TESTS, TEST_ORDER } from '../core/tests';
import {
  clearProgress,
  exportProgress,
  importProgress,
  loadProgress,
  type Progress,
} from '../storage/progress';
import TestIcon from '../components/TestIcon';

export default function ProgressPage() {
  const [progress, setProgress] = useState<Progress>(() => loadProgress());
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImport = async (file: File | undefined) => {
    if (!file) return;
    try {
      const text = await file.text();
      const next = importProgress(text);
      setProgress(next);
      setMessage({ kind: 'ok', text: `Imported progress from “${file.name}”.` });
    } catch (err) {
      setMessage({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Could not import that file.',
      });
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleReset = () => {
    if (!window.confirm('Delete ALL saved progress? This cannot be undone.')) return;
    setProgress(clearProgress());
    setMessage({ kind: 'ok', text: 'All progress cleared.' });
  };

  const hasAnyProgress = Object.values(progress.tests).length > 0;

  return (
    <div className="progress-page">
      <h1>Your progress</h1>
      <p className="lead">
        Everything is stored in this browser only. Export a JSON file to back it up or move it to
        another device.
      </p>

      {message && (
        <div className={`banner banner-${message.kind}`} role="status">
          {message.text}
        </div>
      )}

      <div className="progress-actions">
        <button className="btn btn-primary" onClick={exportProgress} disabled={!hasAnyProgress}>
          ⬇ Export JSON
        </button>
        <button className="btn" onClick={() => fileRef.current?.click()}>
          ⬆ Import JSON
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => handleImport(e.target.files?.[0])}
        />
        <button className="btn btn-danger" onClick={handleReset} disabled={!hasAnyProgress}>
          Reset all progress
        </button>
      </div>

      <div className="progress-table-wrap">
        <table className="progress-table">
          <thead>
            <tr>
              <th>Test</th>
              <th>Best score</th>
              <th>Levels</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {TEST_ORDER.map((id) => {
              const meta = TESTS[id];
              const saved = progress.tests[id];
              const unlocked = saved?.highestUnlockedLevel ?? meta.defaultStartLevel;
              const passedCount = saved
                ? Object.values(saved.levels).filter((l) => l.passed).length
                : 0;
              return (
                <tr key={id}>
                  <td>
                    <TestIcon id={id} className="inline-block size-4 align-middle" /> {meta.name}
                  </td>
                  <td>{formatScore(meta, saved?.bestScore ?? null)}</td>
                  <td>
                    {meta.hasLevels ? (
                      <>
                        <span className="level-bar" aria-hidden="true">
                          <span
                            className="level-bar-fill"
                            style={{
                              width: `${Math.min(100, (unlocked / meta.maxLevel) * 100)}%`,
                            }}
                          />
                        </span>
                        Level {unlocked} / {meta.maxLevel} ({passedCount} passed)
                      </>
                    ) : (
                      <span className="muted">— continuous test</span>
                    )}
                  </td>
                  <td>
                    <Link className="btn btn-sm" to={`/test/${id}`}>
                      Play
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
