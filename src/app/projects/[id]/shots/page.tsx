import { ProjectHeader } from '@presentation/components/layout/ProjectHeader';
import { ProjectDetailPage } from '@presentation/features/projects/ProjectDetailPage/ProjectDetailPage';
import { getProjectOrThrow } from '../_lib/project-route-data';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectShotsPage({ params }: PageProps) {
  const { id } = await params;
  const project = await getProjectOrThrow(id);

  return (
    <div>
      <ProjectHeader projectName={project.name} />
      <ProjectDetailPage
        projectId={id}
        activeTab="shots"
        selectedCollectionId={null}
        collections={[]}
        scenes={[]}
        collectionItems={[]}
        selectedCollectionChildCollections={[]}
      />
    </div>
  );
}
