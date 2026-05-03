import { describe, expect, it } from 'bun:test';
import { CreateProjectUseCase } from './create-project.use-case';
import { GetAllProjectsUseCase } from './get-all-projects.use-case';
import { GetProjectByIdUseCase } from './get-project-by-id.use-case';
import { UpdateProjectUseCase } from './update-project.use-case';
import type { Project, ProjectCreationPayload, ProjectRepository } from '../index';

const sampleProject: Project = {
  id: 'project-1',
  name: 'Project One',
  description: 'Description',
  status: 'draft',
  style: null,
  aspectRatio: '16:9',
  createdAt: new Date('2025-01-01T00:00:00.000Z'),
  updatedAt: new Date('2025-01-02T00:00:00.000Z'),
};

const samplePayload: ProjectCreationPayload = {
  name: 'Project One',
  description: 'Description',
  status: 'draft',
};

describe('project use cases', () => {
  it('CreateProjectUseCase delegates payload to repository and returns project', async () => {
    const calls: ProjectCreationPayload[] = [];
    const repository: ProjectRepository = {
      getAllProjects: async () => [],
      getById: async () => null,
      create: async (payload) => {
        calls.push(payload);
        return sampleProject;
      },
      update: async () => sampleProject,
    };

    const useCase = new CreateProjectUseCase(repository);
    const result = await useCase.execute(samplePayload);

    expect(calls).toEqual([samplePayload]);
    expect(result).toEqual(sampleProject);
  });

  it('CreateProjectUseCase propagates repository errors', async () => {
    const failure = new Error('create failed');
    const repository: ProjectRepository = {
      getAllProjects: async () => [],
      getById: async () => null,
      create: async () => {
        throw failure;
      },
      update: async () => sampleProject,
    };

    const useCase = new CreateProjectUseCase(repository);
    await expect(useCase.execute(samplePayload)).rejects.toBe(failure);
  });

  it('GetAllProjectsUseCase delegates and returns projects', async () => {
    let callCount = 0;
    const repository: ProjectRepository = {
      getAllProjects: async () => {
        callCount += 1;
        return [sampleProject];
      },
      getById: async () => null,
      create: async () => sampleProject,
      update: async () => sampleProject,
    };

    const useCase = new GetAllProjectsUseCase(repository);
    const result = await useCase.execute();

    expect(callCount).toBe(1);
    expect(result).toEqual([sampleProject]);
  });

  it('GetAllProjectsUseCase propagates repository errors', async () => {
    const failure = new Error('list failed');
    const repository: ProjectRepository = {
      getAllProjects: async () => {
        throw failure;
      },
      getById: async () => null,
      create: async () => sampleProject,
      update: async () => sampleProject,
    };

    const useCase = new GetAllProjectsUseCase(repository);
    await expect(useCase.execute()).rejects.toBe(failure);
  });

  it('GetProjectByIdUseCase delegates id and returns project', async () => {
    const calls: string[] = [];
    const repository: ProjectRepository = {
      getAllProjects: async () => [],
      getById: async (id) => {
        calls.push(id);
        return sampleProject;
      },
      create: async () => sampleProject,
      update: async () => sampleProject,
    };

    const useCase = new GetProjectByIdUseCase(repository);
    const result = await useCase.execute('project-1');

    expect(calls).toEqual(['project-1']);
    expect(result).toEqual(sampleProject);
  });

  it('GetProjectByIdUseCase propagates repository errors', async () => {
    const failure = new Error('get by id failed');
    const repository: ProjectRepository = {
      getAllProjects: async () => [],
      getById: async () => {
        throw failure;
      },
      create: async () => sampleProject,
      update: async () => sampleProject,
    };

    const useCase = new GetProjectByIdUseCase(repository);
    await expect(useCase.execute('project-1')).rejects.toBe(failure);
  });

  it('UpdateProjectUseCase delegates id/payload to repository and returns project', async () => {
    const calls: Array<{ id: string; payload: Record<string, unknown> }> = [];
    const repository: ProjectRepository = {
      getAllProjects: async () => [],
      getById: async () => null,
      create: async () => sampleProject,
      update: async (id, payload) => {
        calls.push({ id, payload });
        return sampleProject;
      },
    };

    const useCase = new UpdateProjectUseCase(repository);
    const payload = { style: 'anime storyboard', aspectRatio: '9:16' };
    const result = await useCase.execute('project-1', payload);

    expect(calls).toEqual([{ id: 'project-1', payload }]);
    expect(result).toEqual(sampleProject);
  });
});
