'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '@presentation/components/ui';
import type { ShotCreatePayload } from '@core/shot';
import styles from './ShotForm.module.css';

export interface ShotFormValues {
  title: string;
  description: string;
  cameraFraming: string;
  cameraMovement: string;
  mood: string;
}

interface ShotFormProps {
  initialValues: ShotFormValues;
  submitLabel: string;
  isSubmitting: boolean;
  onSubmit: (payload: ShotCreatePayload) => Promise<void>;
  onCancel: () => void;
}

export const EMPTY_SHOT_FORM_VALUES: ShotFormValues = {
  title: '',
  description: '',
  cameraFraming: '',
  cameraMovement: '',
  mood: '',
};

export function ShotForm({
  initialValues,
  submitLabel,
  isSubmitting,
  onSubmit,
  onCancel,
}: ShotFormProps) {
  const [values, setValues] = useState<ShotFormValues>(initialValues);

  useEffect(() => {
    setValues(initialValues);
  }, [initialValues]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSubmit({
      title: values.title.trim(),
      description: values.description.trim(),
      cameraFraming: values.cameraFraming.trim(),
      cameraMovement: values.cameraMovement.trim(),
      mood: values.mood.trim(),
    });
  };

  return (
    <form className={styles.form} onSubmit={(event) => void handleSubmit(event)}>
      <div className={styles.fieldGroup}>
        <label className={styles.label} htmlFor="shot-title">
          Title
        </label>
        <input
          id="shot-title"
          className={styles.input}
          value={values.title}
          onChange={(event) =>
            setValues((previous) => ({ ...previous, title: event.target.value }))
          }
          placeholder="Shot title"
          required
        />
      </div>

      <div className={styles.fieldGroup}>
        <label className={styles.label} htmlFor="shot-description">
          Description
        </label>
        <textarea
          id="shot-description"
          className={styles.textarea}
          value={values.description}
          onChange={(event) =>
            setValues((previous) => ({ ...previous, description: event.target.value }))
          }
          placeholder="What happens in this shot"
          rows={4}
          required
        />
      </div>

      <div className={styles.row}>
        <div className={styles.fieldGroup}>
          <label className={styles.label} htmlFor="shot-framing">
            Camera framing
          </label>
          <input
            id="shot-framing"
            className={styles.input}
            value={values.cameraFraming}
            onChange={(event) =>
              setValues((previous) => ({ ...previous, cameraFraming: event.target.value }))
            }
            placeholder="Wide, medium, close-up"
            required
          />
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.label} htmlFor="shot-movement">
            Camera movement
          </label>
          <input
            id="shot-movement"
            className={styles.input}
            value={values.cameraMovement}
            onChange={(event) =>
              setValues((previous) => ({ ...previous, cameraMovement: event.target.value }))
            }
            placeholder="Static, pan, dolly"
            required
          />
        </div>
      </div>

      <div className={styles.fieldGroup}>
        <label className={styles.label} htmlFor="shot-mood">
          Mood
        </label>
        <input
          id="shot-mood"
          className={styles.input}
          value={values.mood}
          onChange={(event) => setValues((previous) => ({ ...previous, mood: event.target.value }))}
          placeholder="Tense, calm, energetic"
          required
        />
      </div>

      <div className={styles.actions}>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
