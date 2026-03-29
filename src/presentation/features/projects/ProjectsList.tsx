import type { Project } from '@core/project';
import { ProjectCard } from './ProjectCard';
import styles from './ProjectsList.module.css';

interface ProjectsListProps {
  projects: Project[];
}

/**
 * ProjectsList Component
 * Responsive grid layout for displaying multiple projects
 */
export function ProjectsList({ projects }: ProjectsListProps) {
  if (projects.length === 0) {
    return (
      <section className={styles.empty} aria-live="polite">
        <p className={styles.emptyEyebrow}>No projects yet</p>
        <h2 className={styles.emptyTitle}>Create your first AI video workspace</h2>
        <p className={styles.emptyText}>
          Start with a project to organize your collections, draft scene beats, and plan shots in
          one place.
        </p>
      </section>
    );
  }

  return (
    <div className={styles.grid} role="list" aria-label="Projects">
      {projects.map((project) => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </div>
  );
}
