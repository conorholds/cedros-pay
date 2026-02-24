import type { Address } from '../../types';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

interface AddressFormProps {
  title: string;
  value: Address;
  onChange: (next: Address) => void;
  errors?: Record<string, string>;
  style?: ViewStyle;
}

export function AddressForm({
  title,
  value,
  onChange,
  errors,
  style,
}: AddressFormProps) {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.fieldsContainer}>
        <View style={styles.field}>
          <Label>Address line 1</Label>
          <Input
            value={value.line1}
            onChangeText={(text: string) => onChange({ ...value, line1: text })}
            placeholder="Street address"
          />
          {errors?.line1 ? (
            <Text style={styles.errorText}>{errors.line1}</Text>
          ) : null}
        </View>

        <View style={styles.field}>
          <Label>Address line 2</Label>
          <Input
            value={value.line2 ?? ''}
            onChangeText={(text: string) => onChange({ ...value, line2: text })}
            placeholder="Apartment, suite, unit (optional)"
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.field, styles.halfField]}>
            <Label>City</Label>
            <Input
              value={value.city}
              onChangeText={(text: string) => onChange({ ...value, city: text })}
              placeholder="City"
            />
            {errors?.city ? (
              <Text style={styles.errorText}>{errors.city}</Text>
            ) : null}
          </View>

          <View style={[styles.field, styles.halfField]}>
            <Label>State</Label>
            <Input
              value={value.state ?? ''}
              onChangeText={(text: string) => onChange({ ...value, state: text })}
              placeholder="State / Province"
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.field, styles.halfField]}>
            <Label>Postal code</Label>
            <Input
              value={value.postalCode}
              onChangeText={(text: string) => onChange({ ...value, postalCode: text })}
              placeholder="ZIP / Postal"
              keyboardType="default"
              autoCapitalize="characters"
            />
            {errors?.postalCode ? (
              <Text style={styles.errorText}>{errors.postalCode}</Text>
            ) : null}
          </View>

          <View style={[styles.field, styles.halfField]}>
            <Label>Country</Label>
            <Input
              value={value.country}
              onChangeText={(text: string) => onChange({ ...value, country: text })}
              placeholder="Country code"
              autoCapitalize="characters"
              maxLength={2}
            />
            {errors?.country ? (
              <Text style={styles.errorText}>{errors.country}</Text>
            ) : null}
          </View>
        </View>
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
  fieldsContainer: {
    gap: 12,
  },
  field: {
    gap: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfField: {
    flex: 1,
  },
  errorText: {
    fontSize: 12,
    color: '#dc2626',
    marginTop: 4,
  },
});
