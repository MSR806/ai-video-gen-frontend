import Link from 'next/link';
import styles from './ProjectHeader.module.css';

interface ProjectHeaderProps {
  projectName: string;
}

/**
 * ProjectHeader Component
 * Header with Home button and project name
 */
export function ProjectHeader({ projectName }: ProjectHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.content}>
        <Link href="/" className={styles.homeLink}>
          🏠 <span>Home</span>
        </Link>
        <h1 className={styles.projectName}>{projectName}</h1>
      </div>
    </header>
  );
}
