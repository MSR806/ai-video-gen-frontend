import type { CollectionItem, Scene, Collection, Project } from '@core';
import { GetProjectCollectionsUseCase } from '@core/collection';
import { GetCollectionItemsUseCase } from '@core/collection-item';
import { GetProjectByIdUseCase } from '@core/project';
import { GetProjectScenesUseCase } from '@core/scene';
import {
  CollectionItemRepositoryImpl,
  CollectionRepositoryImpl,
  ProjectRepositoryImpl,
  SceneRepositoryImpl,
} from '@infra/repositories';
import { notFound } from 'next/navigation';

const projectRepo = new ProjectRepositoryImpl();
const collectionRepo = new CollectionRepositoryImpl();
const sceneRepo = new SceneRepositoryImpl();
const collectionItemRepo = new CollectionItemRepositoryImpl();

const getProjectByIdUseCase = new GetProjectByIdUseCase(projectRepo);
const getProjectCollectionsUseCase = new GetProjectCollectionsUseCase(collectionRepo);
const getProjectScenesUseCase = new GetProjectScenesUseCase(sceneRepo);
const getCollectionItemsUseCase = new GetCollectionItemsUseCase(collectionItemRepo);

export async function getProjectOrThrow(projectId: string): Promise<Project> {
  const project = await getProjectByIdUseCase.execute(projectId);

  if (!project) {
    notFound();
  }

  return project;
}

interface CollectionsWorkspaceData {
  project: Project;
  collections: Collection[];
  collectionItems: CollectionItem[];
}

export async function getCollectionsWorkspaceData(
  projectId: string,
): Promise<CollectionsWorkspaceData> {
  const project = await getProjectOrThrow(projectId);
  const collections = await getProjectCollectionsUseCase.execute(projectId);

  const itemsByCollection = await Promise.all(
    collections.map((collection) => getCollectionItemsUseCase.execute(collection.id)),
  );

  return {
    project,
    collections,
    collectionItems: itemsByCollection.flat(),
  };
}

interface ScenesWorkspaceData {
  project: Project;
  scenes: Scene[];
}

export async function getScenesWorkspaceData(projectId: string): Promise<ScenesWorkspaceData> {
  const project = await getProjectOrThrow(projectId);
  const scenes = await getProjectScenesUseCase.execute(projectId);

  return {
    project,
    scenes,
  };
}
