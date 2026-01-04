import type { Asset } from '@core/asset';
import { Dropdown, DropdownItem, Button } from '@presentation/components/ui';
import { AssetCard } from './AssetCard';
import styles from './AssetGrid.module.css';

interface AssetGridProps {
  assets: Asset[];
  onAssetClick: (asset: Asset) => void;
  emptyMessage: string;
  onUploadClick?: () => void;
  onGenerateClick?: () => void;
  showAddButton?: boolean;
}

export function AssetGrid({
  assets,
  onAssetClick,
  emptyMessage,
  onUploadClick,
  onGenerateClick,
  showAddButton = true,
}: AssetGridProps) {
  return (
    <div className={styles.container}>
      {assets.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyMessage}>{emptyMessage}</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {assets.map((asset) => (
            <AssetCard key={asset.id} asset={asset} onClick={onAssetClick} />
          ))}
        </div>
      )}

      {showAddButton && (onUploadClick || onGenerateClick) && (
        <div
          style={{
            position: 'absolute',
            bottom: 'var(--space-6)',
            right: 'var(--space-6)',
            zIndex: 100,
          }}
        >
          <Dropdown
            direction="up"
            trigger={
              <button className={styles.fab} aria-label="Add Asset">
                +
              </button>
            }
          >
            {onUploadClick && (
              <DropdownItem icon="📤" label="Upload File" onClick={onUploadClick} />
            )}
            {onGenerateClick && (
              <DropdownItem icon="✨" label="Generate with AI" onClick={onGenerateClick} />
            )}
          </Dropdown>
        </div>
      )}
    </div>
  );
}
