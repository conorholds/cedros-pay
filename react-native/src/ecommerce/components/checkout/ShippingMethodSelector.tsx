import type { ShippingMethod } from '../../types';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { formatMoney } from '../../utils/money';
import { Button } from '../ui/button';

interface ShippingMethodSelectorProps {
  methods: ShippingMethod[];
  value?: string;
  onChange: (id: string) => void;
  currency: string;
  style?: ViewStyle;
}

export function ShippingMethodSelector({
  methods,
  value,
  onChange,
  currency,
  style,
}: ShippingMethodSelectorProps) {
  if (methods.length === 0) return null;
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.title}>Shipping method</Text>
      <View style={styles.methodsContainer}>
        {methods.map((m) => {
          const active = m.id === value;
          return (
            <Button
              key={m.id}
              variant={active ? 'default' : 'outline'}
              style={[styles.methodButton, active && styles.methodButtonActive]}
              onPress={() => onChange(m.id)}
            >
              <View style={styles.methodContent}>
                <View style={styles.methodLeft}>
                  <Text style={[styles.methodLabel, active && styles.methodLabelActive]}>
                    {m.label}
                  </Text>
                  {m.detail ? (
                    <Text style={[styles.methodDetail, active && styles.methodDetailActive]}>
                      {m.detail}
                    </Text>
                  ) : null}
                </View>
                <Text style={[styles.methodPrice, active && styles.methodPriceActive]}>
                  {formatMoney({ amount: m.price, currency: m.currency || currency })}
                </Text>
              </View>
            </Button>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    padding: 16,
    marginBottom: 16,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#171717',
    marginBottom: 12,
  },
  methodsContainer: {
    gap: 8,
  },
  methodButton: {
    height: 'auto',
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'flex-start',
  },
  methodButtonActive: {
    borderColor: '#171717',
  },
  methodContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  methodLeft: {
    flex: 1,
  },
  methodLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#171717',
  },
  methodLabelActive: {
    color: '#ffffff',
  },
  methodDetail: {
    fontSize: 12,
    color: '#737373',
    marginTop: 2,
  },
  methodDetailActive: {
    color: '#e5e5e5',
  },
  methodPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#171717',
    marginLeft: 8,
  },
  methodPriceActive: {
    color: '#ffffff',
  },
});
