import * as React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Input } from '../ui/input';
export function SearchInput({ value, onChange, placeholder = 'Search products…', style, }) {
    return (<View style={[styles.container, style]}>
      <Text style={styles.icon} aria-hidden>
        ⌕
      </Text>
      <Input value={value} onChangeText={onChange} placeholder={placeholder} style={styles.input} accessibilityLabel="Search"/>
    </View>);
}
const styles = StyleSheet.create({
    container: {
        position: 'relative',
        flexDirection: 'row',
        alignItems: 'center',
    },
    icon: {
        position: 'absolute',
        left: 12,
        color: '#737373',
        fontSize: 16,
        zIndex: 1,
    },
    input: {
        paddingLeft: 36,
        flex: 1,
    },
});
//# sourceMappingURL=SearchInput.js.map