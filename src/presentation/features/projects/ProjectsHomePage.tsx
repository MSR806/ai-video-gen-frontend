'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CreateProjectUseCase,
  GetAllProjectsUseCase,
  type Project,
  type ProjectCreationPayload,
} from '@core/project';
import { ProjectRepositoryImpl } from '@infra/repositories';
import { Button } from '@presentation/components/ui/Button';
import { ProjectsList } from './ProjectsList';
import { ProjectCreateModal } from './ProjectCreateModal';
import styles from '@/app/page.module.css';

const projectRepository = new ProjectRepositoryImpl();

export function ProjectsHomePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const getAllProjectsUseCase = useMemo(() => new GetAllProjectsUseCase(projectRepository), []);
  const createProjectUseCase = useMemo(() => new CreateProjectUseCase(projectRepository), []);

  const loadProjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const fetchedProjects = await getAllProjectsUseCase.execute();
      setProjects(fetchedProjects);
    } catch (loadError) {
      console.error('Failed to load projects:', loadError);
      setError('Failed to load projects. Please check backend connectivity.');
    } finally {
      setIsLoading(false);
    }
  }, [getAllProjectsUseCase]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  const handleCreateProject = async (payload: ProjectCreationPayload) => {
    setIsCreating(true);

    try {
      const createdProject = await createProjectUseCase.execute(payload);
      setProjects((prev) => [createdProject, ...prev]);
      setCreateModalOpen(false);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>Projects Workspace</p>
            <h1 className={styles.title}>AI Video Content Projects</h1>
            <p className={styles.subtitle}>
              Build concepts into production-ready stories with one project hub for collections,
              scenes, and shots.
            </p>
            <p className={styles.metric}>
              <span className={styles.metricValue}>{isLoading ? '...' : projects.length}</span>{' '}
              active project{projects.length === 1 ? '' : 's'}
            </p>
          </div>
          <div className={styles.headerActions}>
            <p className={styles.helperText}>
              Create a new workspace and start planning instantly.
            </p>
            <Button variant="primary" onClick={() => setCreateModalOpen(true)}>
              + New Project
            </Button>
          </div>
        </div>
      </header>

      <main className={styles.main} aria-live="polite">
        {error ? (
          <section className={styles.stateCard} role="alert">
            <h2 className={styles.stateTitle}>Unable to load projects</h2>
            <p className={styles.stateText}>{error}</p>
            <Button variant="secondary" onClick={() => void loadProjects()}>
              Try Again
            </Button>
          </section>
        ) : isLoading ? (
          <section className={styles.stateCard} role="status" aria-label="Loading projects">
            <h2 className={styles.stateTitle}>Loading your projects</h2>
            <p className={styles.stateText}>Preparing your latest workspace data...</p>
          </section>
        ) : (
          <ProjectsList projects={projects} />
        )}
      </main>

      <ProjectCreateModal
        isOpen={createModalOpen}
        isSubmitting={isCreating}
        onClose={() => {
          if (!isCreating) {
            setCreateModalOpen(false);
          }
        }}
        onSubmit={handleCreateProject}
      />
    </div>
  );
}
