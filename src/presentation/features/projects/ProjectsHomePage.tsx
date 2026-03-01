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
          <div>
            <h1 className={styles.title}>AI Video Content Projects</h1>
            <p className={styles.subtitle}>Manage and create stunning video content with AI</p>
          </div>
          <Button variant="primary" onClick={() => setCreateModalOpen(true)}>
            + New Project
          </Button>
        </div>
      </header>

      <main className={styles.main}>
        {error ? (
          <p className={styles.subtitle}>{error}</p>
        ) : isLoading ? (
          <p className={styles.subtitle}>Loading projects...</p>
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
