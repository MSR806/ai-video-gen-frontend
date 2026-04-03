import { describe, expect, it } from 'bun:test';
import { CreateCollectionUseCase } from './create-collection.use-case';
import { GetProjectCollectionsUseCase } from './get-project-collections.use-case';
import type { Collection, CollectionCreationPayload, CollectionRepository } from '../index';

const sampleCollection: Collection = {
  id: 'collection-1',
  projectId: 'project-1',
  parentCollectionId: null,
  name: 'Characters',
  tag: 'character',
  description: 'Character references',
  thumbnailUrl: null,
};

const samplePayload: CollectionCreationPayload = {
  projectId: 'project-1',
  parentCollectionId: null,
  name: 'Characters',
  tag: 'character',
  description: 'Character references',
};

describe('collection use cases', () => {
  it('CreateCollectionUseCase delegates payload and returns collection', async () => {
    const calls: CollectionCreationPayload[] = [];
    const repository: CollectionRepository = {
      getAllByProjectId: async () => [],
      getById: async () => null,
      create: async (payload) => {
        calls.push(payload);
        return sampleCollection;
      },
    };

    const useCase = new CreateCollectionUseCase(repository);
    const result = await useCase.execute(samplePayload);

    expect(calls).toEqual([samplePayload]);
    expect(result).toEqual(sampleCollection);
  });

  it('CreateCollectionUseCase propagates errors', async () => {
    const failure = new Error('create collection failed');
    const repository: CollectionRepository = {
      getAllByProjectId: async () => [],
      getById: async () => null,
      create: async () => {
        throw failure;
      },
    };

    const useCase = new CreateCollectionUseCase(repository);
    await expect(useCase.execute(samplePayload)).rejects.toBe(failure);
  });

  it('GetProjectCollectionsUseCase delegates project id and returns collections', async () => {
    const calls: string[] = [];
    const repository: CollectionRepository = {
      getAllByProjectId: async (projectId) => {
        calls.push(projectId);
        return [sampleCollection];
      },
      getById: async () => null,
      create: async () => sampleCollection,
    };

    const useCase = new GetProjectCollectionsUseCase(repository);
    const result = await useCase.execute('project-1');

    expect(calls).toEqual(['project-1']);
    expect(result).toEqual([sampleCollection]);
  });

  it('GetProjectCollectionsUseCase propagates errors', async () => {
    const failure = new Error('get collections failed');
    const repository: CollectionRepository = {
      getAllByProjectId: async () => {
        throw failure;
      },
      getById: async () => null,
      create: async () => sampleCollection,
    };

    const useCase = new GetProjectCollectionsUseCase(repository);
    await expect(useCase.execute('project-1')).rejects.toBe(failure);
  });
});
