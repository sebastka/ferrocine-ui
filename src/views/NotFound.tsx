import { Link } from '../components/ui.tsx';
import { paths } from '../logic/route.ts';

export function NotFound() {
  return (
    <div className="page">
      <h1>Not found</h1>
      <p>
        This page does not exist. <Link to={paths.home()}>Back home</Link>
      </p>
    </div>
  );
}
