import * as React from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

interface PromoCodeInputProps {
  value?: string;
  onApply: (code?: string) => void;
  style?: ViewStyle;
}

export function PromoCodeInput({
  value,
  onApply,
  style,
}: PromoCodeInputProps) {
  const [code, setCode] = React.useState(value ?? '');

  React.useEffect(() => {
    setCode(value ?? '');
  }, [value]);

  return (
    <View style={[styles.container, style]}>
      <Input
        value={code}
        onChangeText={(text: string) => setCode(text)}
        placeholder="Promo code"
        style={styles.input}
      />
      <Button
        variant="outline"
        onPress={() => onApply(code.trim() || undefined)}
        style={styles.applyButton}
      >
        Apply
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
  },
  applyButton: {
    paddingHorizontal: 16,
  },
});
