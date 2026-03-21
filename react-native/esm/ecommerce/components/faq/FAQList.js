/**
 * FAQ List Component for React Native
 *
 * Displays a list of FAQs with optional accordion behavior.
 */
import * as React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FAQItem } from './FAQItem';
export function FAQList({ faqs, style, accordion = false, showKeywords = false, emptyMessage = 'No FAQs available.', emptyMessageStyle, itemStyle, }) {
    const [expandedId, setExpandedId] = React.useState(null);
    // Filter to only active FAQs
    const activeFaqs = faqs.filter((faq) => faq.active !== false);
    if (activeFaqs.length === 0) {
        return (<View style={[styles.emptyContainer, style]}>
        <Text style={[styles.emptyText, emptyMessageStyle]}>{emptyMessage}</Text>
      </View>);
    }
    return (<View style={[styles.container, style]}>
      {activeFaqs.map((faq) => (<FAQItem key={faq.id} faq={faq} style={itemStyle} showKeywords={showKeywords} expanded={accordion ? expandedId === faq.id : undefined} onExpandedChange={accordion
                ? (expanded) => setExpandedId(expanded ? faq.id : null)
                : undefined}/>))}
    </View>);
}
const styles = StyleSheet.create({
    container: {
        width: '100%',
    },
    emptyContainer: {
        paddingVertical: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        fontSize: 14,
        color: '#737373',
        textAlign: 'center',
    },
});
//# sourceMappingURL=FAQList.js.map