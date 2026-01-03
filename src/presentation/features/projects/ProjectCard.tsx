import type { Project } from '@core/project';
import Link from 'next/link';
import { Card } from '@presentation/components/ui/Card';
import { Badge } from '@presentation/components/ui/Badge';
import styles from './ProjectCard.module.css';

interface ProjectCardProps {
  project: Project;
}

/**
 * ProjectCard Component
 * Displays individual project with status and metadata
 */
export function ProjectCard({ project }: ProjectCardProps) {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  };

  const getStatusLabel = (status: Project['status']) => {
    switch (status) {
      case 'draft':
        return 'Draft';
      case 'in-progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
    }
  };

  return (
    <Link href={`/projects/${project.id}`} className={styles.link}>
      <Card className={styles.projectCard}>
        <div className={styles.content}>
          <h3 className={styles.title}>{project.name}</h3>
          <p className={styles.description}>{project.description}</p>
        </div>
        <div className={styles.footer}>
          <Badge variant={project.status}>{getStatusLabel(project.status)}</Badge>
          <span className={styles.date}>{formatDate(project.updatedAt)}</span>
        </div>
      </Card>
    </Link>
  );
}
