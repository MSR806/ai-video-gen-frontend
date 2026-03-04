'use client';

import { useState } from 'react';
import type { CollectionCreationPayload } from '@core/collection';
import { Button, Modal } from '@presentation/components/ui';
import styles from './CollectionCreateModal.module.css';

interface CollectionCreateModalProps {
  projectId: string;
  parentCollectionId: string | null;
  isOpen: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (payload: CollectionCreationPayload) => Promise<void>;
}

export function CollectionCreateModal({
  projectId,
  parentCollectionId,
  isOpen,
  isSubmitting,
  onClose,
  onSubmit,
}: CollectionCreateModalProps) {
  const [name, setName] = useState('');
  const [tag, setTag] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    if (isSubmitting) return;
    setName('');
    setTag('');
    setDescription('');
    setError(null);
    onClose();
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Collection name is required.');
      return;
    }

    if (!tag.trim()) {
      setError('Collection tag is required.');
      return;
    }

    setError(null);

    try {
      await onSubmit({
        projectId,
        parentCollectionId,
        name: name.trim(),
        tag: tag.trim(),
        description: description.trim(),
      });

      handleClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to create collection.');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create Collection">
      <div className={styles.form}>
        <div className={styles.field}>
          <label htmlFor="collection-name" className={styles.label}>
            Name
          </label>
          <input
            id="collection-name"
            className={styles.input}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Characters"
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="collection-tag" className={styles.label}>
            Tag
          </label>
          <input
            id="collection-tag"
            className={styles.input}
            value={tag}
            onChange={(event) => setTag(event.target.value)}
            placeholder="reference"
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="collection-description" className={styles.label}>
            Description
          </label>
          <textarea
            id="collection-description"
            className={styles.textarea}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="What this collection is used for"
            rows={3}
          />
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.actions}>
          <Button variant="secondary" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !name.trim() || !tag.trim()}>
            {isSubmitting ? 'Creating...' : 'Create Collection'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
