import { Platform } from 'react-native';
import type { DistributionChannel } from '../types/storePolicy';

/**
 * Safe auto-detection helper.
 *
 * We intentionally avoid mapping iOS -> Apple App Store or Android -> Google
 * Play because that is not a reliable store policy signal.
 */
export function detectDistributionChannel(): DistributionChannel {
  if (Platform.OS === 'web') {
    return 'web';
  }

  return 'unknown';
}
