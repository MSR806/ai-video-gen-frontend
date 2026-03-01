import { useState } from 'react';
import type { CameraSetup, CameraBody, Lens, FocalLength } from '@core/collection-item';
import { CAMERA_BODIES, LENSES, FOCAL_LENGTHS } from '@core/collection-item';
import { Modal } from '@presentation/components/ui';
import styles from './CameraSetupDropdown.module.css';

interface CameraSetupDropdownProps {
  setup: CameraSetup;
  onUpdate: (setup: CameraSetup) => void;
}

/**
 * CameraSetupDropdown Component
 * Modal with 3-column selector for camera, lens, and focal length
 */
export function CameraSetupDropdown({ setup, onUpdate }: CameraSetupDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempSetup, setTempSetup] = useState<CameraSetup>(setup);

  const handleOpen = () => {
    setTempSetup(setup); // Reset to current when opening
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleApply = () => {
    onUpdate(tempSetup);
    setIsOpen(false);
  };

  const handleCameraSelect = (camera: CameraBody) => {
    setTempSetup({ ...tempSetup, camera });
  };

  const handleLensSelect = (lens: Lens) => {
    setTempSetup({ ...tempSetup, lens });
  };

  const handleFocalLengthSelect = (focalLength: FocalLength) => {
    setTempSetup({ ...tempSetup, focalLength });
  };

  return (
    <>
      <button className={styles.trigger} onClick={handleOpen}>
        <div className={styles.triggerContent}>
          <span className={styles.camera}>{setup.camera.name}</span>
          <span className={styles.lens}>{setup.lens.name}</span>
          <span className={styles.focal}>{setup.focalLength.label}</span>
        </div>
      </button>

      <Modal isOpen={isOpen} onClose={handleClose} title="Camera Setup">
        <div className={styles.modalContent}>
          {/* Camera Column */}
          <div className={styles.column}>
            <div className={styles.columnHeader}>CAMERA</div>
            <div className={styles.columnList}>
              {CAMERA_BODIES.map((camera) => (
                <button
                  key={camera.id}
                  className={`${styles.item} ${tempSetup.camera.id === camera.id ? styles.itemActive : ''}`}
                  onClick={() => handleCameraSelect(camera)}
                >
                  <span className={styles.itemName}>{camera.name}</span>
                  <span className={styles.itemType}>{camera.type}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Lens Column */}
          <div className={styles.column}>
            <div className={styles.columnHeader}>LENS</div>
            <div className={styles.columnList}>
              {LENSES.map((lens) => (
                <button
                  key={lens.id}
                  className={`${styles.item} ${tempSetup.lens.id === lens.id ? styles.itemActive : ''}`}
                  onClick={() => handleLensSelect(lens)}
                >
                  <span className={styles.itemName}>{lens.name}</span>
                  <span className={styles.itemType}>{lens.type}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Focal Length Column */}
          <div className={styles.column}>
            <div className={styles.columnHeader}>FOCAL LENGTH</div>
            <div className={styles.columnList}>
              {FOCAL_LENGTHS.map((focal) => (
                <button
                  key={focal.value}
                  className={`${styles.focalItem} ${tempSetup.focalLength.value === focal.value ? styles.focalActive : ''}`}
                  onClick={() => handleFocalLengthSelect(focal)}
                >
                  <span className={styles.focalValue}>{focal.label}</span>
                  <span className={styles.focalCategory}>{focal.category}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className={styles.modalActions}>
          <button className={styles.cancelButton} onClick={handleClose}>
            Cancel
          </button>
          <button className={styles.applyButton} onClick={handleApply}>
            Apply Setup
          </button>
        </div>
      </Modal>
    </>
  );
}
