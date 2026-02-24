import * as React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

export interface QuantitySelectorProps {
  qty: number;
  onChange: (qty: number) => void;
  min?: number;
  max?: number;
  style?: ViewStyle;
}

export function QuantitySelector({
  qty,
  onChange,
  min = 1,
  max,
  style,
}: QuantitySelectorProps) {
  const safeQty = Number.isFinite(qty) ? Math.max(min, Math.floor(qty)) : min;
  const canDec = safeQty > min;
  const canInc = typeof max === 'number' ? safeQty < max : true;

  return (
    <View style={[styles.container, style]}>
      <Button
        size="sm"
        variant="outline"
        onPress={() => onChange(Math.max(min, safeQty - 1))}
        disabled={!canDec}
      >
        -
      </Button>
      <Input
        keyboardType="numeric"
        value={String(safeQty)}
        onChangeText={(text: string) => {
          const next = Math.floor(Number(text));
          if (!Number.isFinite(next)) return;
          const clamped = Math.max(min, typeof max === 'number' ? Math.min(max, next) : next);
          onChange(clamped);
        }}
        style={styles.input}

      />
      <Button
        size="sm"
        variant="outline"
        onPress={() => onChange(safeQty + 1)}
        disabled={!canInc}
      >
        +
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    height: 40,
    width: 64,
    textAlign: 'center',
  },
});
