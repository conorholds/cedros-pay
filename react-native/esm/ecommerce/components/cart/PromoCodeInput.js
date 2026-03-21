import * as React from 'react';
import { View, StyleSheet, } from 'react-native';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
export function PromoCodeInput({ value, onApply, style, }) {
    const [code, setCode] = React.useState(value ?? '');
    React.useEffect(() => {
        setCode(value ?? '');
    }, [value]);
    return (<View style={[styles.container, style]}>
      <Input value={code} onChangeText={(text) => setCode(text)} placeholder="Promo code" style={styles.input}/>
      <Button variant="outline" onPress={() => onApply(code.trim() || undefined)} style={styles.applyButton}>
        Apply
      </Button>
    </View>);
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
//# sourceMappingURL=PromoCodeInput.js.map