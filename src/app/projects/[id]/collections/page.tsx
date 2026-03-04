import { ProjectDetailPage } from '@presentation/features/projects/ProjectDetailPage/ProjectDetailPage';
import { getCollectionsWorkspaceData } from '../_lib/project-route-data';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectCollectionsPage({ params }: PageProps) {
  const { id } = await params;
  const { collections, collectionItems, selectedCollectionChildCollections } =
    await getCollectionsWorkspaceData(id, null);

  return (
    <div>
      <ProjectDetailPage
        projectId={id}
        activeTab="collections"
        selectedCollectionId={null}
        collections={collections}
        scenes={[]}
        collectionItems={collectionItems}
        selectedCollectionChildCollections={selectedCollectionChildCollections}
        viewportOffsetPx={0}
      />
    </div>
  );
}
