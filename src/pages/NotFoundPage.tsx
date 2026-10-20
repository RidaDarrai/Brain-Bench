import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function NotFoundPage() {
  return (
    <div className="py-24 text-center">
      <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground uppercase">Signal lost</p>
      <h1 className="mt-2 mb-0 text-5xl font-bold tracking-tight">404</h1>
      <p className="mt-2 text-sm text-muted-foreground">That page doesn’t exist.</p>
      <Button asChild className="mt-6">
        <Link to="/">Back to tests</Link>
      </Button>
    </div>
  );
}
