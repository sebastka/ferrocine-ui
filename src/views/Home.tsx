import { api } from '../api.ts';
import { Row } from '../components/cards.tsx';
import { Empty, ErrorBox, Spinner } from '../components/ui.tsx';
import { useAsync } from '../hooks.ts';

export function Home() {
  const home = useAsync('home', (signal) => api.home(signal));
  if (home.error) return <ErrorBox error={home.error} onRetry={home.reload} />;
  if (!home.data) return <Spinner />;
  const { continue_watching, next_up, latest } = home.data;
  const empty = continue_watching.length + next_up.length + latest.reduce((n, l) => n + l.items.length, 0) === 0;
  return (
    <div className="page">
      <Row title="Continue watching" items={continue_watching} shape="landscape" />
      <Row title="Next up" items={next_up} shape="landscape" />
      {latest.map((l) => (
        <Row key={l.library.id} title={`Latest in ${l.library.name}`} items={l.items} shape="poster" />
      ))}
      {empty && <Empty>Nothing here yet. Libraries fill up once their first scan has run.</Empty>}
    </div>
  );
}
