import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="centered-page">
      <h1>404</h1>
      <p>That page doesn’t exist.</p>
      <Link className="btn btn-primary" to="/">
        Back to tests
      </Link>
    </div>
  );
}
