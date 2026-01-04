import { ProjectHeader } from '@presentation/components/layout/ProjectHeader';
import { GetProjectByIdUseCase } from '@core/project';
import { GetProjectCharactersUseCase } from '@core/character';
import { GetProjectLocationsUseCase } from '@core/location';
import { GetProjectScenesUseCase } from '@core/scene';
import { GetEntityAssetsUseCase } from '@core/asset';
import {
  ProjectRepositoryImpl,
  CharacterRepositoryImpl,
  LocationRepositoryImpl,
  SceneRepositoryImpl,
  AssetRepositoryImpl,
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
const assetRepo = new AssetRepositoryImpl();

// Use Cases
const getProjectByIdUseCase = new GetProjectByIdUseCase(projectRepo);
const getProjectCharactersUseCase = new GetProjectCharactersUseCase(characterRepo);
const getProjectLocationsUseCase = new GetProjectLocationsUseCase(locationRepo);
const getProjectScenesUseCase = new GetProjectScenesUseCase(sceneRepo);
const getEntityAssetsUseCase = new GetEntityAssetsUseCase(assetRepo);

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

  // Fetch all assets for characters and locations in this project
  const characterAssets = await Promise.all(
    characters.map((c) => getEntityAssetsUseCase.execute(c.id, 'character')),
  );
  const locationAssets = await Promise.all(
    locations.map((l) => getEntityAssetsUseCase.execute(l.id, 'location')),
  );
  const assets = [...characterAssets.flat(), ...locationAssets.flat()];

  return (
    <div>
      <ProjectHeader projectName={project.name} />
      <ProjectDetailPage
        characters={characters}
        locations={locations}
        scenes={scenes}
        assets={assets}
      />
    </div>
  );
}
