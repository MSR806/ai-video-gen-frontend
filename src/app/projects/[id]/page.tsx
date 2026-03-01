import { ProjectHeader } from '@presentation/components/layout/ProjectHeader';
import { ProjectOverviewPage } from '@presentation/features/projects/ProjectOverviewPage';
import { getProjectOrThrow } from './_lib/project-route-data';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectOverviewRoute({ params }: PageProps) {
  const { id } = await params;
  const project = await getProjectOrThrow(id);

  return (
    <div>
      <ProjectHeader projectName={project.name} />
      <ProjectOverviewPage project={project} />
    </div>
  );
}
