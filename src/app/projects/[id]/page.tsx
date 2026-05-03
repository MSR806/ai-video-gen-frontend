import type { ProjectUpdatePayload } from '@core/project';
import { UpdateProjectUseCase } from '@core/project';
import { ProjectRepositoryImpl } from '@infra/repositories';
import { ProjectOverviewPage } from '@presentation/features/projects/ProjectOverviewPage';
import { getProjectOrThrow } from './_lib/project-route-data';

const projectRepository = new ProjectRepositoryImpl();
const updateProjectUseCase = new UpdateProjectUseCase(projectRepository);

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectOverviewRoute({ params }: PageProps) {
  const { id } = await params;
  const project = await getProjectOrThrow(id);

  async function handleUpdateProject(
    projectId: string,
    payload: ProjectUpdatePayload,
  ): Promise<void> {
    'use server';
    await updateProjectUseCase.execute(projectId, payload);
  }

  return <ProjectOverviewPage project={project} onUpdateProject={handleUpdateProject} />;
}
