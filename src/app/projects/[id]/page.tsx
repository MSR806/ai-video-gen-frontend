import { ProjectHeader } from '@presentation/components/layout/ProjectHeader';
import { GetProjectByIdUseCase } from '@core/project';
import { GetProjectCharactersUseCase } from '@core/character';
import { GetProjectLocationsUseCase } from '@core/location';
import { GetProjectScenesUseCase } from '@core/scene';
import {
  ProjectRepositoryImpl,
  CharacterRepositoryImpl,
  LocationRepositoryImpl,
  SceneRepositoryImpl,
} from '@infra/repositories';
import { ProjectDetailPage } from '@presentation/features/projects/ProjectDetailPage/ProjectDetailPage';
import { notFound } from 'next/navigation';

/**
 * Project Detail Page (Server Component)
 * Composition Root for dependency injection and data fetching
 */

// Repositories
const projectRepo = new ProjectRepositoryImpl();
const characterRepo = new CharacterRepositoryImpl();
const locationRepo = new LocationRepositoryImpl();
const sceneRepo = new SceneRepositoryImpl();

// Use Cases
const getProjectByIdUseCase = new GetProjectByIdUseCase(projectRepo);
const getProjectCharactersUseCase = new GetProjectCharactersUseCase(characterRepo);
const getProjectLocationsUseCase = new GetProjectLocationsUseCase(locationRepo);
const getProjectScenesUseCase = new GetProjectScenesUseCase(sceneRepo);

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectPage({ params }: PageProps) {
  const { id } = await params;

  // Fetch all data
  const project = await getProjectByIdUseCase.execute(id);

  if (!project) {
    notFound();
  }

  const [characters, locations, scenes] = await Promise.all([
    getProjectCharactersUseCase.execute(id),
    getProjectLocationsUseCase.execute(id),
    getProjectScenesUseCase.execute(id),
  ]);

  return (
    <div>
      <ProjectHeader projectName={project.name} />
      <ProjectDetailPage characters={characters} locations={locations} scenes={scenes} />
    </div>
  );
}
