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
      <div className={styles.empty}>
        <p className={styles.emptyText}>No projects yet. Create your first video project!</p>
      </div>
    );
  }

  return (
    <div className={styles.grid}>
      {projects.map((project) => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </div>
  );
}
