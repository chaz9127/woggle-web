import { usePageTitle } from '../hooks/usePageTitle';

export default function NotFound() {
  usePageTitle('Not Found');
  return (
    <div className="notfound">
      <h1 className="notfound__code">404</h1>
      <p className="notfound__msg">Page not found</p>
      <a href="/" className="notfound__home">
        Back to game
      </a>
    </div>
  );
}
