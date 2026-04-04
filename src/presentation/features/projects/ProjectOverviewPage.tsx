import type { Project } from '@core/project';
import { Badge } from '@presentation/components/ui/Badge';
import { Card } from '@presentation/components/ui/Card';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { ArrowLeft, ArrowRight, Clapperboard, FolderKanban, NotebookPen } from 'lucide-react';
import { getProjectCollectionsPath, getProjectScreenplayPath, getProjectShotsPath } from './routes';
import styles from './ProjectOverviewPage.module.css';

interface ProjectOverviewPageProps {
  project: Project;
}

const STATUS_LABELS: Record<Project['status'], string> = {
  draft: 'Draft',
  'in-progress': 'In Progress',
  completed: 'Completed',
};

interface RouteItem {
  label: string;
  description: string;
  cta: string;
  href: (projectId: string) => string;
  icon: LucideIcon;
}

const ROUTE_ITEMS: RouteItem[] = [
  {
    label: 'Collections',
    description: 'Group references and assets into organized media collections.',
    cta: 'Open collections',
    href: getProjectCollectionsPath,
    icon: FolderKanban,
  },
  {
    label: 'Screenplay',
    description: 'Write your screenplay scene-by-scene with screenplay block formatting.',
    cta: 'Open screenplay',
    href: getProjectScreenplayPath,
    icon: NotebookPen,
  },
  {
    label: 'Shots',
    description: 'Plan storyboard shots and sequence details for production clarity.',
    cta: 'Open shots',
    href: getProjectShotsPath,
    icon: Clapperboard,
  },
];

export function ProjectOverviewPage({ project }: ProjectOverviewPageProps) {
  return (
    <main className={styles.container}>
      <div className={styles.pageHeader}>
        <Link href="/" className={styles.backLink}>
          <ArrowLeft size={14} aria-hidden="true" />
          Back to projects
        </Link>
      </div>

      <section className={styles.summaryCard} aria-labelledby="project-overview-title">
        <p className={styles.overline}>Project Overview</p>
        <div className={styles.summaryHeader}>
          <h1 id="project-overview-title" className={styles.projectTitle}>
            {project.name}
          </h1>
          <Badge variant={project.status}>{STATUS_LABELS[project.status]}</Badge>
        </div>
        <p className={styles.projectDescription}>{project.description}</p>
      </section>

      <section className={styles.routeSection}>
        <div className={styles.routeSectionHeader}>
          <h2 className={styles.sectionTitle}>Workspace Sections</h2>
          <p className={styles.sectionSubtitle}>
            Pick a section to continue planning this project.
          </p>
        </div>
        <div className={styles.routeGrid}>
          {ROUTE_ITEMS.map((item) => {
            const Icon = item.icon;

            return (
              <Link key={item.label} href={item.href(project.id)} className={styles.routeLink}>
                <Card className={styles.routeCard}>
                  <span className={styles.routeIcon} aria-hidden="true">
                    <Icon size={18} />
                  </span>
                  <p className={styles.routeLabel}>{item.label}</p>
                  <p className={styles.routeDescription}>{item.description}</p>
                  <span className={styles.routeCta}>
                    {item.cta}
                    <ArrowRight size={14} aria-hidden="true" />
                  </span>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
