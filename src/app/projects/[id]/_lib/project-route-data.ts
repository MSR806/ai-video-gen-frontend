import type { CollectionItem, Collection, Project } from '@core';
import { GetProjectCollectionsUseCase } from '@core/collection';
import { GetCollectionContentsUseCase } from '@core/collection-item';
import { GetProjectByIdUseCase } from '@core/project';
import {
  CollectionItemRepositoryImpl,
  CollectionRepositoryImpl,
  ProjectRepositoryImpl,
} from '@infra/repositories';
import { notFound } from 'next/navigation';

const projectRepo = new ProjectRepositoryImpl();
const collectionRepo = new CollectionRepositoryImpl();
const collectionItemRepo = new CollectionItemRepositoryImpl();

const getProjectByIdUseCase = new GetProjectByIdUseCase(projectRepo);
const getProjectCollectionsUseCase = new GetProjectCollectionsUseCase(collectionRepo);
const getCollectionContentsUseCase = new GetCollectionContentsUseCase(collectionItemRepo);

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
  selectedCollectionChildCollections: Collection[];
}

export async function getCollectionsWorkspaceData(
  projectId: string,
  selectedCollectionId: string | null = null,
): Promise<CollectionsWorkspaceData> {
  const project = await getProjectOrThrow(projectId);
  const collections = await getProjectCollectionsUseCase.execute(projectId);

  let collectionItems: CollectionItem[] = [];
  let selectedCollectionChildCollections: Collection[] = [];

  if (selectedCollectionId !== null) {
    const selectedCollectionExists = collections.some(
      (collection) => collection.id === selectedCollectionId,
    );
    if (selectedCollectionExists) {
      const selectedContents = await getCollectionContentsUseCase.execute(selectedCollectionId);
      collectionItems = selectedContents.items;
      selectedCollectionChildCollections = selectedContents.childCollections;
    }
  }

  return {
    project,
    collections,
    collectionItems,
    selectedCollectionChildCollections,
  };
}
