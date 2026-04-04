import { ProjectDetailPage } from '@presentation/features/projects/ProjectDetailPage/ProjectDetailPage';
import { getProjectOrThrow } from '../_lib/project-route-data';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectShotsPage({ params }: PageProps) {
  const { id } = await params;
  await getProjectOrThrow(id);

  return (
    <div>
      <ProjectDetailPage
        projectId={id}
        activeTab="shots"
        selectedCollectionId={null}
        collections={[]}
        collectionItems={[]}
        selectedCollectionChildCollections={[]}
        viewportOffsetPx={0}
      />
    </div>
  );
}
