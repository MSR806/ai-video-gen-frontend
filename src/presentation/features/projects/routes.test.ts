import {
  getProjectCollectionPath,
  getProjectCollectionsPath,
  getProjectOverviewPath,
  getProjectScenesPath,
  getProjectShotsPath,
} from './routes';

describe('project routes', () => {
  const projectId = 'proj-123';
  const collectionId = 'col-456';

  it('builds the project overview path', () => {
    expect(getProjectOverviewPath(projectId)).toBe('/projects/proj-123');
  });

  it('builds the project collections path', () => {
    expect(getProjectCollectionsPath(projectId)).toBe('/projects/proj-123/collections');
  });

  it('builds the single collection path', () => {
    expect(getProjectCollectionPath(projectId, collectionId)).toBe(
      '/projects/proj-123/collections/col-456',
    );
  });

  it('builds the project scenes path', () => {
    expect(getProjectScenesPath(projectId)).toBe('/projects/proj-123/scenes');
  });

  it('builds the project shots path', () => {
    expect(getProjectShotsPath(projectId)).toBe('/projects/proj-123/shots');
  });
});
