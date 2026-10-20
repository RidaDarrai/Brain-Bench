import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, Play, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatScore, TESTS, TEST_ORDER } from '../core/tests';
import { testAccentStyle } from '../lib/test-theme';
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
  const [resetOpen, setResetOpen] = useState(false);
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
    setProgress(clearProgress());
    setMessage({ kind: 'ok', text: 'All progress cleared.' });
    setResetOpen(false);
  };

  const hasAnyProgress = Object.values(progress.tests).length > 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Your progress</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Everything is stored in this browser only. Export a JSON file to back it up or move it to
          another device.
        </p>
      </div>

      {message && (
        <Alert
          role="status"
          variant={message.kind === 'error' ? 'destructive' : 'default'}
          className={
            message.kind === 'ok'
              ? 'border-[var(--success)]/40 bg-[var(--success)]/[0.07] text-[var(--success)]'
              : undefined
          }
        >
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap gap-2">
        <Button onClick={exportProgress} disabled={!hasAnyProgress}>
          <Download className="size-4" /> Export JSON
        </Button>
        <Button variant="outline" onClick={() => fileRef.current?.click()}>
          <Upload className="size-4" /> Import JSON
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => handleImport(e.target.files?.[0])}
        />
        <Button
          variant="outline"
          className="border-[var(--danger)]/30 text-[var(--danger)] hover:bg-[var(--danger)]/10 hover:text-[var(--danger)]"
          onClick={() => setResetOpen(true)}
          disabled={!hasAnyProgress}
        >
          <Trash2 className="size-4" /> Reset all progress
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Test</TableHead>
              <TableHead>Best score</TableHead>
              <TableHead>Levels</TableHead>
              <TableHead className="text-right">Play</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {TEST_ORDER.map((id) => {
              const meta = TESTS[id];
              const saved = progress.tests[id];
              const unlocked = saved?.highestUnlockedLevel ?? meta.defaultStartLevel;
              const passedCount = saved
                ? Object.values(saved.levels).filter((l) => l.passed).length
                : 0;
              return (
                <TableRow key={id}>
                  <TableCell>
                    <span
                      style={testAccentStyle(id)}
                      className="inline-flex items-center gap-2 font-medium"
                    >
                      <TestIcon id={id} className="size-4 text-[var(--test-accent)]" />
                      {meta.name}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono tabular-nums">
                    {formatScore(meta, saved?.bestScore ?? null)}
                  </TableCell>
                  <TableCell>
                    {meta.hasLevels ? (
                      <span style={testAccentStyle(id)} className="flex items-center gap-2.5">
                        <span
                          aria-hidden="true"
                          className="block h-1.5 w-20 overflow-hidden rounded-full bg-muted"
                        >
                          <span
                            className="block h-full rounded-full bg-[var(--test-accent)]"
                            style={{
                              width: `${Math.min(100, (unlocked / meta.maxLevel) * 100)}%`,
                            }}
                          />
                        </span>
                        <span className="font-mono text-xs text-muted-foreground">
                          {unlocked}/{meta.maxLevel}{' '}
                          <span className="opacity-70">({passedCount} passed)</span>
                        </span>
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">— continuous test</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="outline" size="sm">
                      <Link to={`/test/${id}`}>
                        <Play className="size-3.5" /> Play
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete ALL saved progress?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes every best score and unlocked level stored in this browser. This cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleReset}>
              Delete everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
