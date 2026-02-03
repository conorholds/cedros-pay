import * as React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';

export interface PaginationProps {
  page: number;
  pageSize: number;
  total?: number;
  hasNextPage?: boolean;
  onPageChange: (page: number) => void;
  style?: ViewStyle;
}

export function Pagination({
  page,
  pageSize,
  total,
  hasNextPage,
  onPageChange,
  style,
}: PaginationProps) {
  const canGoPrev = page > 1;
  const canGoNext = hasNextPage ?? (total ? page * pageSize < total : false);

  const startItem = total && total > 0 ? (page - 1) * pageSize + 1 : 0;
  const endItem = total ? Math.min(page * pageSize, total) : page * pageSize;

  return (
    <View style={[styles.container, style]}>
      <View style={styles.info}>
        {total !== undefined && total > 0 ? (
          <Text style={styles.infoText}>
            Showing {startItem}-{endItem} of {total}
          </Text>
        ) : null}
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.button, !canGoPrev && styles.buttonDisabled]}
          onPress={() => onPageChange(page - 1)}
          disabled={!canGoPrev}
        >
          <Text style={[styles.buttonText, !canGoPrev && styles.buttonTextDisabled]}>
            Previous
          </Text>
        </TouchableOpacity>

        <View style={styles.pageIndicator}>
          <Text style={styles.pageText}>Page {page}</Text>
        </View>

        <TouchableOpacity
          style={[styles.button, !canGoNext && styles.buttonDisabled]}
          onPress={() => onPageChange(page + 1)}
          disabled={!canGoNext}
        >
          <Text style={[styles.buttonText, !canGoNext && styles.buttonTextDisabled]}>
            Next
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12,
  },
  info: {
    alignItems: 'center',
  },
  infoText: {
    fontSize: 14,
    color: '#737373',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#171717',
  },
  buttonDisabled: {
    backgroundColor: '#e5e5e5',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ffffff',
  },
  buttonTextDisabled: {
    color: '#a3a3a3',
  },
  pageIndicator: {
    paddingHorizontal: 12,
  },
  pageText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#171717',
  },
});
