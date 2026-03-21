"use strict";
/**
 * FAQ List Component for React Native
 *
 * Displays a list of FAQs with optional accordion behavior.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.FAQList = FAQList;
const React = __importStar(require("react"));
const react_native_1 = require("react-native");
const FAQItem_1 = require("./FAQItem");
function FAQList({ faqs, style, accordion = false, showKeywords = false, emptyMessage = 'No FAQs available.', emptyMessageStyle, itemStyle, }) {
    const [expandedId, setExpandedId] = React.useState(null);
    // Filter to only active FAQs
    const activeFaqs = faqs.filter((faq) => faq.active !== false);
    if (activeFaqs.length === 0) {
        return (<react_native_1.View style={[styles.emptyContainer, style]}>
        <react_native_1.Text style={[styles.emptyText, emptyMessageStyle]}>{emptyMessage}</react_native_1.Text>
      </react_native_1.View>);
    }
    return (<react_native_1.View style={[styles.container, style]}>
      {activeFaqs.map((faq) => (<FAQItem_1.FAQItem key={faq.id} faq={faq} style={itemStyle} showKeywords={showKeywords} expanded={accordion ? expandedId === faq.id : undefined} onExpandedChange={accordion
                ? (expanded) => setExpandedId(expanded ? faq.id : null)
                : undefined}/>))}
    </react_native_1.View>);
}
const styles = react_native_1.StyleSheet.create({
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