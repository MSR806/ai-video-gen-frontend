import type { Asset } from '@core/asset';
import { AssetCard } from './AssetCard';
import styles from './AssetGrid.module.css';

interface AssetGridProps {
  assets: Asset[];
  onAssetClick: (asset: Asset) => void;
  emptyMessage: string;
}

export function AssetGrid({ assets, onAssetClick, emptyMessage }: AssetGridProps) {
  if (assets.length === 0) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyMessage}>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={styles.grid}>
      {assets.map((asset) => (
        <AssetCard key={asset.id} asset={asset} onClick={onAssetClick} />
      ))}
    </div>
  );
}
