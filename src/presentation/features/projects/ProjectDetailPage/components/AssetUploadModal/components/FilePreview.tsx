import { useState, useEffect } from 'react';
import styles from './FilePreview.module.css';

interface FilePreviewProps {
  file: File;
  onRemove: () => void;
}

/**
 * FilePreview Component
 * Displays selected file with thumbnail preview and metadata
 */
export function FilePreview({ file, onRemove }: FilePreviewProps) {
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    // Generate preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }

    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [file]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileTypeDisplay = (): string => {
    if (file.type.startsWith('image/')) return 'Image';
    if (file.type.startsWith('video/')) return 'Video';
    return 'File';
  };

  return (
    <div className={styles.container}>
      <div className={styles.preview}>
        {preview ? (
          <img src={preview} alt={file.name} className={styles.thumbnail} />
        ) : (
          <div className={styles.videoPlaceholder}>
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="23 7 16 12 23 17 23 7" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
          </div>
        )}
      </div>
      <div className={styles.info}>
        <p className={styles.fileName}>{file.name}</p>
        <p className={styles.fileMeta}>
          {getFileTypeDisplay()} • {formatFileSize(file.size)}
        </p>
      </div>
      <button className={styles.removeButton} onClick={onRemove} aria-label="Remove file">
        ×
      </button>
    </div>
  );
}
