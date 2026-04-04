export function getProjectOverviewPath(projectId: string): string {
  return `/projects/${projectId}`;
}

export function getProjectCollectionsPath(projectId: string): string {
  return `/projects/${projectId}/collections`;
}

export function getProjectCollectionPath(projectId: string, collectionId: string): string {
  return `/projects/${projectId}/collections/${collectionId}`;
}

export function getProjectScreenplayPath(projectId: string): string {
  return `/projects/${projectId}/scenes`;
}

/** @deprecated Use getProjectScreenplayPath instead. */
export const getProjectScenesPath = getProjectScreenplayPath;

export function getProjectShotsPath(projectId: string): string {
  return `/projects/${projectId}/shots`;
}
