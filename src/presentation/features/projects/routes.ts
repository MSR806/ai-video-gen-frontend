export function getProjectOverviewPath(projectId: string): string {
  return `/projects/${projectId}`;
}

export function getProjectCollectionsPath(projectId: string): string {
  return `/projects/${projectId}/collections`;
}

export function getProjectCollectionPath(projectId: string, collectionId: string): string {
  return `/projects/${projectId}/collections/${collectionId}`;
}

export function getProjectScenesPath(projectId: string): string {
  return `/projects/${projectId}/scenes`;
}

export function getProjectShotsPath(projectId: string): string {
  return `/projects/${projectId}/shots`;
}
