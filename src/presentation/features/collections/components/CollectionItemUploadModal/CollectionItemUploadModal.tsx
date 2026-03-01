import { useState } from 'react';
import { Modal } from '@presentation/components/ui';
import {
  type ImageMetadata,
  type VideoMetadata,
  UploadCollectionItemUseCase,
} from '@core/collection-item';
import { CollectionItemRepositoryImpl } from '@infra/repositories';
import { DropZone } from './components/DropZone';
import { FilePreview } from './components/FilePreview';
import { Button } from '@presentation/components/ui';
import styles from './CollectionItemUploadModal.module.css';

interface CollectionItemUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  collectionId: string;
  projectId: string;
  onSuccess: () => void;
}

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

/**
 * CollectionItemUploadModal Component
 * Modal for uploading collection item files with metadata
 */
export function CollectionItemUploadModal({
  isOpen,
  onClose,
  collectionId,
  projectId,
  onSuccess,
}: CollectionItemUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    // Auto-fill name from filename (without extension)
    const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
    setName(nameWithoutExt);
    setError(null);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setName('');
    setDescription('');
  };

  const handleSubmit = async () => {
    if (!selectedFile) return;

    setUploadState('uploading');
    setError(null);

    try {
      const metadata = await getFileMetadata(selectedFile);

      const repository = new CollectionItemRepositoryImpl();
      const uploadCollectionItemUseCase = new UploadCollectionItemUseCase(repository);
      await uploadCollectionItemUseCase.execute({
        projectId,
        collectionId,
        name: name || selectedFile.name.replace(/\.[^/.]+$/, ''),
        description,
        file: selectedFile,
        metadata,
      });

      setUploadState('success');
      // Call success callback and close modal
      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 500);
    } catch (err) {
      setUploadState('error');
      setError(err instanceof Error ? err.message : 'Failed to upload collection item');
    }
  };

  const getFileMetadata = async (file: File): Promise<ImageMetadata | VideoMetadata> => {
    const isImage = file.type.startsWith('image/');
    const format = file.type.split('/')[1] || 'unknown';

    if (isImage) {
      // Get image dimensions
      const dimensions = await getImageDimensions(file);
      return {
        width: dimensions.width,
        height: dimensions.height,
        format,
        thumbnailUrl: '',
      };
    } else {
      // Video metadata (simplified - in reality you'd use a video element to get dimensions and duration)
      return {
        width: 1920,
        height: 1080,
        duration: 10, // Placeholder
        format,
        thumbnailUrl: '',
      };
    }
  };

  const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };
      img.src = URL.createObjectURL(file);
    });
  };

  const handleClose = () => {
    setSelectedFile(null);
    setName('');
    setDescription('');
    setUploadState('idle');
    setError(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Upload Collection Item">
      <div className={styles.content}>
        {!selectedFile ? (
          <DropZone onFileSelect={handleFileSelect} />
        ) : (
          <>
            <FilePreview file={selectedFile} onRemove={handleRemoveFile} />

            <div className={styles.form}>
              <div className={styles.field}>
                <label htmlFor="item-name" className={styles.label}>
                  Name *
                </label>
                <input
                  id="item-name"
                  type="text"
                  className={styles.input}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter item name"
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="item-description" className={styles.label}>
                  Description
                </label>
                <textarea
                  id="item-description"
                  className={styles.textarea}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter item description"
                  rows={3}
                />
              </div>
            </div>
          </>
        )}

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.actions}>
          <Button variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} variant="primary" type="button">
            {uploadState === 'uploading' ? 'Uploading...' : 'Upload Item'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
