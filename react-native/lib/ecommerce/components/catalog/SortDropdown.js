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
exports.SortDropdown = SortDropdown;
const React = __importStar(require("react"));
const react_native_1 = require("react-native");
const button_1 = require("../ui/button");
const separator_1 = require("../ui/separator");
const OPTION_LABELS = {
    featured: 'Featured',
    priceAsc: 'Price: Low to High',
    priceDesc: 'Price: High to Low',
    newest: 'Newest First',
    bestselling: 'Best Selling',
};
function SortDropdown({ value, onChange, options = ['featured', 'priceAsc', 'priceDesc', 'newest', 'bestselling'], style, }) {
    const [visible, setVisible] = React.useState(false);
    const selectedLabel = OPTION_LABELS[value];
    return (<react_native_1.View style={style}>
      <react_native_1.TouchableOpacity style={styles.trigger} onPress={() => setVisible(true)}>
        <react_native_1.Text style={styles.triggerLabel}>Sort by:</react_native_1.Text>
        <react_native_1.Text style={styles.triggerValue}>{selectedLabel}</react_native_1.Text>
        <react_native_1.Text style={styles.chevron}>▼</react_native_1.Text>
      </react_native_1.TouchableOpacity>

      <react_native_1.Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
        <react_native_1.View style={styles.overlay}>
          <react_native_1.View style={styles.content}>
            <react_native_1.View style={styles.header}>
              <react_native_1.Text style={styles.headerText}>Sort by</react_native_1.Text>
              <button_1.Button size="sm" variant="ghost" onPress={() => setVisible(false)}>
                Close
              </button_1.Button>
            </react_native_1.View>
            <separator_1.Separator />
            <react_native_1.ScrollView showsVerticalScrollIndicator={false}>
              {options.map((option) => (<react_native_1.TouchableOpacity key={option} style={[
                styles.option,
                value === option && styles.optionActive,
            ]} onPress={() => {
                onChange(option);
                setVisible(false);
            }}>
                  <react_native_1.Text style={[
                styles.optionText,
                value === option && styles.optionTextActive,
            ]}>
                    {OPTION_LABELS[option]}
                  </react_native_1.Text>
                  {value === option && <react_native_1.Text style={styles.checkmark}>✓</react_native_1.Text>}
                </react_native_1.TouchableOpacity>))}
            </react_native_1.ScrollView>
          </react_native_1.View>
        </react_native_1.View>
      </react_native_1.Modal>
    </react_native_1.View>);
}
const styles = react_native_1.StyleSheet.create({
    trigger: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e5e5e5',
        backgroundColor: '#ffffff',
    },
    triggerLabel: {
        fontSize: 14,
        color: '#737373',
    },
    triggerValue: {
        fontSize: 14,
        fontWeight: '500',
        color: '#171717',
        flex: 1,
    },
    chevron: {
        fontSize: 12,
        color: '#737373',
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    content: {
        backgroundColor: '#ffffff',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        padding: 16,
        maxHeight: '50%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    headerText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#171717',
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderRadius: 8,
    },
    optionActive: {
        backgroundColor: '#f5f5f5',
    },
    optionText: {
        fontSize: 16,
        color: '#404040',
    },
    optionTextActive: {
        fontWeight: '500',
        color: '#171717',
    },
    checkmark: {
        fontSize: 16,
        color: '#171717',
        fontWeight: '600',
    },
});
//# sourceMappingURL=SortDropdown.js.map