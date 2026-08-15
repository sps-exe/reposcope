import { DatasetOption } from 'echarts/types/dist/shared';

export const ORIGINAL_DATASET_ID = 'original';

export function dataset(
  id: string = ORIGINAL_DATASET_ID,
  source: DatasetOption['source'],
  dimensions: DatasetOption['dimensions'] = undefined
): DatasetOption {
  return {
    id,
    source,
    dimensions,
  };
}
