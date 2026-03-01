'use client';

import { useState } from 'react';
import type { ProjectCreationPayload, ProjectStatus } from '@core/project';
import { Button, Modal } from '@presentation/components/ui';
import styles from './ProjectCreateModal.module.css';

interface ProjectCreateModalProps {
  isOpen: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (payload: ProjectCreationPayload) => Promise<void>;
}

export function ProjectCreateModal({
  isOpen,
  isSubmitting,
  onClose,
  onSubmit,
}: ProjectCreateModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('draft');
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    if (isSubmitting) return;
    setName('');
    setDescription('');
    setStatus('draft');
    setError(null);
    onClose();
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Project name is required.');
      return;
    }

    setError(null);

    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim(),
        status,
      });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to create project.');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create New Project">
      <div className={styles.form}>
        <div className={styles.field}>
          <label htmlFor="project-name" className={styles.label}>
            Name
          </label>
          <input
            id="project-name"
            className={styles.input}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Product launch video"
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="project-description" className={styles.label}>
            Description
          </label>
          <textarea
            id="project-description"
            className={styles.textarea}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Short description of what this project is about"
            rows={4}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="project-status" className={styles.label}>
            Status
          </label>
          <select
            id="project-status"
            className={styles.select}
            value={status}
            onChange={(event) => setStatus(event.target.value as ProjectStatus)}
          >
            <option value="draft">Draft</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.actions}>
          <Button variant="secondary" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !name.trim()}>
            {isSubmitting ? 'Creating...' : 'Create Project'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
