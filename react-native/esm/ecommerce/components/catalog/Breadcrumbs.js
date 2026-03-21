import * as React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, } from 'react-native';
export function Breadcrumbs({ items, style }) {
    return (<View style={[styles.container, style]} accessibilityLabel="Breadcrumb">
      {items.map((it, idx) => (<View key={`${it.label}-${idx}`} style={styles.item}>
          {it.onPress ? (<TouchableOpacity onPress={it.onPress}>
              <Text style={styles.link}>{it.label}</Text>
            </TouchableOpacity>) : (<Text style={styles.current}>{it.label}</Text>)}
          {idx < items.length - 1 ? (<Text style={styles.separator} accessibilityElementsHidden>
              ·
            </Text>) : null}
        </View>))}
    </View>);
}
const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    link: {
        fontSize: 12,
        color: '#525252',
        textDecorationLine: 'underline',
    },
    current: {
        fontSize: 12,
        color: '#171717',
        fontWeight: '500',
    },
    separator: {
        fontSize: 12,
        color: '#737373',
    },
});
//# sourceMappingURL=Breadcrumbs.js.map