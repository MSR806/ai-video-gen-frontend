import type { Project } from '@core/project';
import { Badge } from '@presentation/components/ui/Badge';
import { Card } from '@presentation/components/ui/Card';
import Link from 'next/link';
import { getProjectCollectionsPath, getProjectScenesPath, getProjectShotsPath } from './routes';
import styles from './ProjectOverviewPage.module.css';

interface ProjectOverviewPageProps {
  project: Project;
}

const STATUS_LABELS: Record<Project['status'], string> = {
  draft: 'Draft',
  'in-progress': 'In Progress',
  completed: 'Completed',
};

export function ProjectOverviewPage({ project }: ProjectOverviewPageProps) {
  return (
    <main className={styles.container}>
      <section className={styles.summaryCard}>
        <div className={styles.summaryHeader}>
          <h2 className={styles.projectTitle}>{project.name}</h2>
          <Badge variant={project.status}>{STATUS_LABELS[project.status]}</Badge>
        </div>
        <p className={styles.projectDescription}>{project.description}</p>
      </section>

      <section className={styles.routeSection}>
        <h3 className={styles.sectionTitle}>Workspace Sections</h3>
        <div className={styles.routeGrid}>
          <Link href={getProjectCollectionsPath(project.id)} className={styles.routeLink}>
            <Card className={styles.routeCard}>
              <p className={styles.routeLabel}>Collections</p>
              <p className={styles.routeDescription}>Manage collection groups and media items.</p>
            </Card>
          </Link>

          <Link href={getProjectScenesPath(project.id)} className={styles.routeLink}>
            <Card className={styles.routeCard}>
              <p className={styles.routeLabel}>Scenes</p>
              <p className={styles.routeDescription}>Write and organize project scenes.</p>
            </Card>
          </Link>

          <Link href={getProjectShotsPath(project.id)} className={styles.routeLink}>
            <Card className={styles.routeCard}>
              <p className={styles.routeLabel}>Shots</p>
              <p className={styles.routeDescription}>Open storyboard shot planning.</p>
            </Card>
          </Link>
        </div>
      </section>
    </main>
  );
}
