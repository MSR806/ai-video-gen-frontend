import { ProjectDetailPage } from '@presentation/features/projects/ProjectDetailPage/ProjectDetailPage';
import { getScenesWorkspaceData } from '../_lib/project-route-data';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectScenesPage({ params }: PageProps) {
  const { id } = await params;
  const { scenes } = await getScenesWorkspaceData(id);

  return (
    <div>
      <ProjectDetailPage
        projectId={id}
        activeTab="scenes"
        selectedCollectionId={null}
        collections={[]}
        scenes={scenes}
        collectionItems={[]}
        selectedCollectionChildCollections={[]}
        viewportOffsetPx={0}
      />
    </div>
  );
}
