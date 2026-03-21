"use strict";
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
exports.FAQAccordion = FAQAccordion;
const React = __importStar(require("react"));
const react_native_1 = require("react-native");
// Enable layout animations on Android
if (react_native_1.Platform.OS === 'android' && react_native_1.UIManager.setLayoutAnimationEnabledExperimental) {
    react_native_1.UIManager.setLayoutAnimationEnabledExperimental(true);
}
function ChevronIcon({ expanded }) {
    return (<react_native_1.View style={styles.chevron}>
      <react_native_1.Text style={[styles.chevronText, expanded && styles.chevronRotated]}>
        ▼
      </react_native_1.Text>
    </react_native_1.View>);
}
function FAQAccordion({ items, allowMultiple = false, style, }) {
    const [expandedIds, setExpandedIds] = React.useState(new Set());
    const toggleItem = (id) => {
        react_native_1.LayoutAnimation.configureNext(react_native_1.LayoutAnimation.Presets.easeInEaseOut);
        setExpandedIds((prev) => {
            const newSet = new Set(allowMultiple ? prev : []);
            if (newSet.has(id)) {
                newSet.delete(id);
            }
            else {
                newSet.add(id);
            }
            return newSet;
        });
    };
    return (<react_native_1.View style={[styles.container, style]}>
      {items.map((item) => {
            const isExpanded = expandedIds.has(item.id);
            return (<react_native_1.View key={item.id} style={styles.item}>
            <react_native_1.TouchableOpacity onPress={() => toggleItem(item.id)} style={styles.questionContainer} activeOpacity={0.7}>
              <react_native_1.Text style={styles.question}>{item.question}</react_native_1.Text>
              <ChevronIcon expanded={isExpanded}/>
            </react_native_1.TouchableOpacity>

            {isExpanded && (<react_native_1.View style={styles.answerContainer}>
                <react_native_1.Text style={styles.answer}>{item.answer}</react_native_1.Text>
              </react_native_1.View>)}
          </react_native_1.View>);
        })}
    </react_native_1.View>);
}
const styles = react_native_1.StyleSheet.create({
    container: {
        width: '100%',
    },
    item: {
        borderBottomWidth: 1,
        borderBottomColor: '#e5e5e5',
    },
    questionContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        paddingRight: 8,
    },
    question: {
        fontSize: 16,
        fontWeight: '500',
        color: '#171717',
        flex: 1,
        paddingRight: 16,
    },
    chevron: {
        width: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    chevronText: {
        fontSize: 12,
        color: '#737373',
    },
    chevronRotated: {
        transform: [{ rotate: '180deg' }],
    },
    answerContainer: {
        paddingBottom: 16,
        paddingRight: 32,
    },
    answer: {
        fontSize: 14,
        color: '#525252',
        lineHeight: 20,
    },
});
//# sourceMappingURL=FAQAccordion.js.map