import { notFound } from 'next/navigation';
import { ProjectDetailPage } from '@presentation/features/projects/ProjectDetailPage/ProjectDetailPage';
import { getCollectionsWorkspaceData } from '../../_lib/project-route-data';

interface PageProps {
  params: Promise<{ id: string; collectionId: string }>;
}

export default async function ProjectCollectionDetailPage({ params }: PageProps) {
  const { id, collectionId } = await params;
  const { collections, collectionItems, selectedCollectionChildCollections } =
    await getCollectionsWorkspaceData(id, collectionId);

  const selectedCollection = collections.find((collection) => collection.id === collectionId);

  if (!selectedCollection) {
    notFound();
  }

  return (
    <div>
      <ProjectDetailPage
        projectId={id}
        activeTab="collections"
        selectedCollectionId={collectionId}
        collections={collections}
        scenes={[]}
        collectionItems={collectionItems}
        selectedCollectionChildCollections={selectedCollectionChildCollections}
        viewportOffsetPx={0}
      />
    </div>
  );
}
