import * as React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useCedrosShop } from '../config/context';
import { CartPageContent } from '../components/cart/CartPageContent';
import { useStorefrontSettings } from '../hooks/useStorefrontSettings';
export function CartTemplate({ style, onCheckout, }) {
    const { config } = useCedrosShop();
    const { settings: storefrontSettings } = useStorefrontSettings();
    // Show promo codes only if both code-level config AND storefront settings allow it
    const showPromoCodes = config.checkout.allowPromoCodes && storefrontSettings.checkout.promoCodes;
    const handleCheckout = () => {
        if (onCheckout) {
            onCheckout();
        }
    };
    return (<View style={[styles.container, style]}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Cart</Text>
        <Text style={styles.subtitle}>
          Review items, adjust quantities, then check out.
        </Text>
        <View style={styles.contentWrapper}>
          <CartPageContent onCheckout={handleCheckout} showPromoCode={showPromoCodes}/>
        </View>
      </ScrollView>
    </View>);
}
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fafafa',
    },
    scrollView: {
        flex: 1,
    },
    content: {
        paddingHorizontal: 16,
        paddingTop: 32,
        paddingBottom: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: '600',
        color: '#171717',
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 14,
        color: '#737373',
        marginTop: 8,
    },
    contentWrapper: {
        marginTop: 24,
    },
});
//# sourceMappingURL=CartTemplate.js.map