import { GetAllProjectsUseCase } from '@core/project';
import { ProjectRepositoryImpl } from '@infra/repositories';
import { ProjectsList } from '@presentation/features/projects/ProjectsList';
import { Button } from '@presentation/components/ui/Button';
import styles from './page.module.css';

// Composition Root - Dependency Injection
const projectRepository = new ProjectRepositoryImpl();
const getAllProjectsUseCase = new GetAllProjectsUseCase(projectRepository);

export default async function Home() {
  // Fetch projects using use case
  const projects = await getAllProjectsUseCase.execute();

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div>
            <h1 className={styles.title}>AI Video Content Projects</h1>
            <p className={styles.subtitle}>Manage and create stunning video content with AI</p>
          </div>
          <Button variant="primary">+ New Project</Button>
        </div>
      </header>

      <main className={styles.main}>
        <ProjectsList projects={projects} />
      </main>
    </div>
  );
}
