'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import { Button, Modal } from '@presentation/components/ui';
import styles from './PastedImageConfirmModal.module.css';

interface PastedImageConfirmModalProps {
  isOpen: boolean;
  imageUrl: string;
  fileName: string;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function PastedImageConfirmModal({
  isOpen,
  imageUrl,
  fileName,
  isSubmitting,
  onClose,
  onConfirm,
}: PastedImageConfirmModalProps) {
  const handleClose = () => {
    if (isSubmitting) {
      return;
    }

    onClose();
  };

  const handleConfirm = () => {
    if (isSubmitting) {
      return;
    }

    onConfirm();
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleEnter = (event: KeyboardEvent) => {
      const isEnterKey =
        event.key === 'Enter' ||
        event.code === 'Enter' ||
        event.code === 'NumpadEnter' ||
        event.keyCode === 13 ||
        event.which === 13;

      if (!isEnterKey || event.isComposing || isSubmitting) {
        return;
      }

      event.preventDefault();
      onConfirm();
    };

    document.addEventListener('keydown', handleEnter);
    return () => {
      document.removeEventListener('keydown', handleEnter);
    };
  }, [isOpen, isSubmitting, onConfirm]);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Paste Image to Collection">
      <div className={styles.body}>
        <p className={styles.text}>Save pasted image as a new collection item?</p>
        <div className={styles.previewWrap}>
          <Image
            src={imageUrl}
            alt={`Pasted image preview: ${fileName}`}
            className={styles.previewImage}
            width={1200}
            height={800}
            unoptimized
          />
        </div>
        <p className={styles.fileName}>{fileName}</p>
        <p className={styles.hint}>Press Enter to confirm.</p>
        <div className={styles.actions}>
          <Button variant="secondary" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save image'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
