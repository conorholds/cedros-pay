"use strict";
/**
 * FAQ Item Component for React Native
 *
 * Displays a single FAQ with question, answer, and optional metadata.
 * Supports expandable/collapsible behavior.
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
exports.FAQItem = FAQItem;
const React = __importStar(require("react"));
const react_native_1 = require("react-native");
if (react_native_1.Platform.OS === 'android' && react_native_1.UIManager.setLayoutAnimationEnabledExperimental) {
    react_native_1.UIManager.setLayoutAnimationEnabledExperimental(true);
}
function FAQItem({ faq, style, expanded: controlledExpanded, defaultExpanded = false, onExpandedChange, showKeywords = false, questionStyle, answerStyle, keywordStyle, keywordTextStyle, }) {
    const [internalExpanded, setInternalExpanded] = React.useState(defaultExpanded);
    const isControlled = controlledExpanded !== undefined;
    const expanded = isControlled ? controlledExpanded : internalExpanded;
    const rotateAnim = React.useRef(new react_native_1.Animated.Value(expanded ? 1 : 0)).current;
    React.useEffect(() => {
        react_native_1.Animated.timing(rotateAnim, {
            toValue: expanded ? 1 : 0,
            duration: 200,
            useNativeDriver: true,
        }).start();
    }, [expanded, rotateAnim]);
    const handleToggle = () => {
        react_native_1.LayoutAnimation.configureNext(react_native_1.LayoutAnimation.Presets.easeInEaseOut);
        const newExpanded = !expanded;
        if (!isControlled) {
            setInternalExpanded(newExpanded);
        }
        onExpandedChange?.(newExpanded);
    };
    return (<react_native_1.View style={[styles.container, style]}>
      <react_native_1.TouchableOpacity onPress={handleToggle} style={styles.header} activeOpacity={0.7} accessibilityRole="button" accessibilityState={{ expanded }}>
        <react_native_1.Text style={[styles.question, questionStyle]}>{faq.question}</react_native_1.Text>
        <react_native_1.Animated.Text style={[
            styles.chevron,
            {
                transform: [
                    {
                        rotate: rotateAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0deg', '180deg'],
                        }),
                    },
                ],
            },
        ]}>
          ▾
        </react_native_1.Animated.Text>
      </react_native_1.TouchableOpacity>

      {expanded && (<react_native_1.View style={styles.content}>
          <react_native_1.Text style={[styles.answer, answerStyle]}>{faq.answer}</react_native_1.Text>

          {showKeywords && faq.keywords && faq.keywords.length > 0 && (<react_native_1.View style={styles.keywordsContainer}>
              {faq.keywords.map((keyword) => (<react_native_1.View key={keyword} style={[styles.keywordBadge, keywordStyle]}>
                  <react_native_1.Text style={[styles.keywordText, keywordTextStyle]}>{keyword}</react_native_1.Text>
                </react_native_1.View>))}
            </react_native_1.View>)}
        </react_native_1.View>)}
    </react_native_1.View>);
}
const styles = react_native_1.StyleSheet.create({
    container: {
        borderWidth: 1,
        borderColor: '#e5e5e5',
        borderRadius: 8,
        overflow: 'hidden',
        marginVertical: 4,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#f5f5f5',
    },
    question: {
        fontSize: 14,
        fontWeight: '500',
        color: '#171717',
        flex: 1,
        paddingRight: 12,
    },
    chevron: {
        fontSize: 16,
        color: '#737373',
    },
    content: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#ffffff',
    },
    answer: {
        fontSize: 14,
        color: '#525252',
        lineHeight: 20,
    },
    keywordsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 12,
        gap: 6,
    },
    keywordBadge: {
        backgroundColor: '#f5f5f5',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    keywordText: {
        fontSize: 12,
        color: '#737373',
    },
});
//# sourceMappingURL=FAQItem.js.map