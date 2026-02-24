import * as React from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Skeleton } from '../ui/skeleton';

interface CartLoadingProps {
  itemCount?: number;
  style?: ViewStyle;
}

export function CartLoading({
  itemCount = 3,
  style,
}: CartLoadingProps) {
  return (
    <View style={[styles.container, style]}>
      {Array.from({ length: itemCount }).map((_, index) => (
        <View key={index} style={styles.itemRow}>
          {/* Image skeleton */}
          <Skeleton width={48} height={48} style={styles.imageSkeleton} />
          
          {/* Content skeleton */}
          <View style={styles.contentContainer}>
            <Skeleton width="70%" height={16} style={styles.titleSkeleton} />
            <Skeleton width="40%" height={12} style={styles.priceSkeleton} />
          </View>
          
          {/* Quantity controls skeleton */}
          <View style={styles.controlsContainer}>
            <Skeleton width={32} height={32} style={styles.controlSkeleton} />
            <Skeleton width={44} height={32} style={styles.controlSkeleton} />
            <Skeleton width={32} height={32} style={styles.controlSkeleton} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  imageSkeleton: {
    borderRadius: 8,
  },
  contentContainer: {
    flex: 1,
    gap: 8,
  },
  titleSkeleton: {
    borderRadius: 4,
  },
  priceSkeleton: {
    borderRadius: 4,
  },
  controlsContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  controlSkeleton: {
    borderRadius: 6,
  },
});
