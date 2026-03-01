import { ProjectHeader } from '@presentation/components/layout/ProjectHeader';
import { GetProjectByIdUseCase } from '@core/project';
import { GetProjectCollectionsUseCase } from '@core/collection';
import { GetProjectScenesUseCase } from '@core/scene';
import { GetCollectionItemsUseCase } from '@core/collection-item';
import {
  ProjectRepositoryImpl,
  CollectionRepositoryImpl,
  SceneRepositoryImpl,
  CollectionItemRepositoryImpl,
} from '@infra/repositories';
import { ProjectDetailPage } from '@presentation/features/projects/ProjectDetailPage/ProjectDetailPage';
import { notFound } from 'next/navigation';

/**
 * Project Detail Page (Server Component)
 * Composition Root for dependency injection and data fetching
 */

// Repositories
const projectRepo = new ProjectRepositoryImpl();
const collectionRepo = new CollectionRepositoryImpl();
const sceneRepo = new SceneRepositoryImpl();
const collectionItemRepo = new CollectionItemRepositoryImpl();

// Use Cases
const getProjectByIdUseCase = new GetProjectByIdUseCase(projectRepo);
const getProjectCollectionsUseCase = new GetProjectCollectionsUseCase(collectionRepo);
const getProjectScenesUseCase = new GetProjectScenesUseCase(sceneRepo);
const getCollectionItemsUseCase = new GetCollectionItemsUseCase(collectionItemRepo);

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

  const [collections, scenes] = await Promise.all([
    getProjectCollectionsUseCase.execute(id),
    getProjectScenesUseCase.execute(id),
  ]);

  // Fetch all items for collections in this project
  const itemsByCollection = await Promise.all(
    collections.map((collection) => getCollectionItemsUseCase.execute(collection.id)),
  );
  const collectionItems = itemsByCollection.flat();

  return (
    <div>
      <ProjectHeader projectName={project.name} />
      <ProjectDetailPage
        collections={collections}
        scenes={scenes}
        collectionItems={collectionItems}
      />
    </div>
  );
}
