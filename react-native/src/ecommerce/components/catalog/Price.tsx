import * as React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { formatMoney } from '../../utils/money';

export interface PriceProps {
  amount: number;
  currency: string;
  compareAt?: number;
  size?: 'sm' | 'default';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Price({
  amount,
  currency,
  compareAt,
  size = 'default',
  style,
  textStyle,
}: PriceProps) {
  const isSale = typeof compareAt === 'number' && compareAt > amount;

  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.price, size === 'sm' ? styles.priceSm : styles.priceDefault, textStyle]}>
        {formatMoney({ amount, currency })}
      </Text>
      {isSale ? (
        <Text style={[styles.compareAt, size === 'sm' ? styles.compareAtSm : styles.compareAtDefault]}>
          {formatMoney({ amount: compareAt!, currency })}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  price: {
    fontWeight: '600',
    color: '#171717',
  },
  priceDefault: {
    fontSize: 16,
  },
  priceSm: {
    fontSize: 14,
  },
  compareAt: {
    color: '#737373',
    textDecorationLine: 'line-through',
  },
  compareAtDefault: {
    fontSize: 14,
  },
  compareAtSm: {
    fontSize: 12,
  },
});
