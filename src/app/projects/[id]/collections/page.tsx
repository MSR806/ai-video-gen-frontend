import { ProjectHeader } from '@presentation/components/layout/ProjectHeader';
import { ProjectDetailPage } from '@presentation/features/projects/ProjectDetailPage/ProjectDetailPage';
import { getCollectionsWorkspaceData } from '../_lib/project-route-data';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectCollectionsPage({ params }: PageProps) {
  const { id } = await params;
  const { project, collections, collectionItems } = await getCollectionsWorkspaceData(id);

  return (
    <div>
      <ProjectHeader projectName={project.name} />
      <ProjectDetailPage
        projectId={id}
        activeTab="collections"
        selectedCollectionId={null}
        collections={collections}
        scenes={[]}
        collectionItems={collectionItems}
      />
    </div>
  );
}
