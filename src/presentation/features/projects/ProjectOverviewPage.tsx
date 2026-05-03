'use client';

import type { Project } from '@core/project';
import type { ProjectUpdatePayload } from '@core/project';
import { Badge } from '@presentation/components/ui/Badge';
import { Card } from '@presentation/components/ui/Card';
import Link from 'next/link';
import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ArrowLeft, ArrowRight, Clapperboard, FolderKanban, NotebookPen } from 'lucide-react';
import { getProjectCollectionsPath, getProjectScreenplayPath, getProjectShotsPath } from './routes';
import styles from './ProjectOverviewPage.module.css';

interface ProjectOverviewPageProps {
  project: Project;
  onUpdateProject?: (projectId: string, payload: ProjectUpdatePayload) => Promise<void>;
}

const STATUS_LABELS: Record<Project['status'], string> = {
  draft: 'Draft',
  'in-progress': 'In Progress',
  completed: 'Completed',
};

interface RouteItem {
  label: string;
  description: string;
  cta: string;
  href: (projectId: string) => string;
  icon: LucideIcon;
}

const ROUTE_ITEMS: RouteItem[] = [
  {
    label: 'Collections',
    description: 'Group references and assets into organized media collections.',
    cta: 'Open collections',
    href: getProjectCollectionsPath,
    icon: FolderKanban,
  },
  {
    label: 'Screenplay',
    description: 'Write your screenplay scene-by-scene with screenplay block formatting.',
    cta: 'Open screenplay',
    href: getProjectScreenplayPath,
    icon: NotebookPen,
  },
  {
    label: 'Shots',
    description: 'Plan storyboard shots and sequence details for production clarity.',
    cta: 'Open shots',
    href: getProjectShotsPath,
    icon: Clapperboard,
  },
];

export function ProjectOverviewPage({ project, onUpdateProject }: ProjectOverviewPageProps) {
  const [styleValue, setStyleValue] = useState(project.style ?? '');
  const [aspectRatioValue, setAspectRatioValue] = useState(project.aspectRatio ?? '16:9');
  const [isSaving, setIsSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const handleSaveSettings = async () => {
    if (!onUpdateProject || isSaving) {
      return;
    }

    setIsSaving(true);
    setSaveFeedback(null);

    try {
      await onUpdateProject(project.id, {
        style: styleValue.trim().length > 0 ? styleValue.trim() : null,
        aspectRatio: aspectRatioValue,
      });

      setSaveFeedback({ type: 'success', message: 'Settings saved.' });
    } catch {
      setSaveFeedback({ type: 'error', message: 'Failed to save settings.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className={styles.container}>
      <div className={styles.pageHeader}>
        <Link href="/" className={styles.backLink}>
          <ArrowLeft size={14} aria-hidden="true" />
          Back to projects
        </Link>
      </div>

      <section className={styles.summaryCard} aria-labelledby="project-overview-title">
        <p className={styles.overline}>Project Overview</p>
        <div className={styles.summaryHeader}>
          <h1 id="project-overview-title" className={styles.projectTitle}>
            {project.name}
          </h1>
          <Badge variant={project.status}>{STATUS_LABELS[project.status]}</Badge>
        </div>
        <p className={styles.projectDescription}>{project.description}</p>
      </section>

      <section className={styles.settingsSection} aria-labelledby="project-settings-title">
        <div className={styles.routeSectionHeader}>
          <h2 id="project-settings-title" className={styles.sectionTitle}>
            Project Settings
          </h2>
          <p className={styles.sectionSubtitle}>
            Set visual direction and frame format for outputs.
          </p>
        </div>

        <Card className={styles.settingsCard}>
          <label className={styles.fieldLabel} htmlFor="project-style">
            Style
          </label>
          <textarea
            id="project-style"
            className={styles.textarea}
            value={styleValue}
            onChange={(event) => setStyleValue(event.target.value)}
            placeholder="Optional: e.g., cinematic realism, natural light, soft contrast, documentary pacing"
            rows={4}
          />

          <label className={styles.fieldLabel} htmlFor="project-aspect-ratio">
            Aspect ratio
          </label>
          <select
            id="project-aspect-ratio"
            className={styles.select}
            value={aspectRatioValue}
            onChange={(event) => setAspectRatioValue(event.target.value)}
          >
            <option value="16:9">16:9</option>
            <option value="4:3">4:3</option>
            <option value="1:1">1:1</option>
            <option value="9:16">9:16</option>
          </select>

          <button
            type="button"
            className={styles.saveButton}
            onClick={handleSaveSettings}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save settings'}
          </button>

          {saveFeedback ? (
            <p
              role="status"
              className={
                saveFeedback.type === 'error'
                  ? styles.saveFeedbackError
                  : styles.saveFeedbackSuccess
              }
            >
              {saveFeedback.message}
            </p>
          ) : null}
        </Card>
      </section>

      <section className={styles.routeSection}>
        <div className={styles.routeSectionHeader}>
          <h2 className={styles.sectionTitle}>Workspace Sections</h2>
          <p className={styles.sectionSubtitle}>
            Pick a section to continue planning this project.
          </p>
        </div>
        <div className={styles.routeGrid}>
          {ROUTE_ITEMS.map((item) => {
            const Icon = item.icon;

            return (
              <Link key={item.label} href={item.href(project.id)} className={styles.routeLink}>
                <Card className={styles.routeCard}>
                  <span className={styles.routeIcon} aria-hidden="true">
                    <Icon size={18} />
                  </span>
                  <p className={styles.routeLabel}>{item.label}</p>
                  <p className={styles.routeDescription}>{item.description}</p>
                  <span className={styles.routeCta}>
                    {item.cta}
                    <ArrowRight size={14} aria-hidden="true" />
                  </span>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
