import { ProjectsPage } from '@/components/projects/projects-page';

/**
 * The UI is a client of the public REST API — the same endpoints any other
 * consumer would use — rather than reading the database directly through a
 * server component. That keeps one data path to reason about and means the
 * API is exercised by every interaction in the app.
 */
export default function Home() {
  return <ProjectsPage />;
}
