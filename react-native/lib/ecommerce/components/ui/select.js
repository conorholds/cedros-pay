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
exports.SelectItem = exports.SelectContent = exports.SelectTrigger = void 0;
exports.Select = Select;
exports.SelectValue = SelectValue;
exports.SelectGroup = SelectGroup;
const React = __importStar(require("react"));
const react_native_1 = require("react-native");
const SelectContext = React.createContext(undefined);
function useSelect() {
    const context = React.useContext(SelectContext);
    if (!context) {
        throw new Error('Select components must be used within a Select');
    }
    return context;
}
function Select({ children, value: controlledValue, defaultValue, onValueChange }) {
    const [internalValue, setInternalValue] = React.useState(defaultValue || '');
    const [open, setOpen] = React.useState(false);
    const value = controlledValue !== undefined ? controlledValue : internalValue;
    const handleValueChange = (newValue) => {
        if (controlledValue === undefined) {
            setInternalValue(newValue);
        }
        onValueChange?.(newValue);
        setOpen(false);
    };
    return (<SelectContext.Provider value={{ value, onValueChange: handleValueChange, open, setOpen }}>
      {children}
    </SelectContext.Provider>);
}
exports.SelectTrigger = React.forwardRef(({ children, style, ...props }, ref) => {
    const { open, setOpen, value } = useSelect();
    return (<react_native_1.TouchableOpacity ref={ref} onPress={() => setOpen(!open)} activeOpacity={0.7} style={[styles.trigger, style]} {...props}>
        <react_native_1.View style={styles.triggerContent}>
          {children || <react_native_1.Text style={styles.valueText}>{value || 'Select...'}</react_native_1.Text>}
          <react_native_1.Text style={styles.icon}>▾</react_native_1.Text>
        </react_native_1.View>
      </react_native_1.TouchableOpacity>);
});
exports.SelectTrigger.displayName = 'SelectTrigger';
function SelectValue({ placeholder }) {
    const { value } = useSelect();
    return <react_native_1.Text style={styles.valueText}>{value || placeholder || 'Select...'}</react_native_1.Text>;
}
exports.SelectContent = React.forwardRef(({ children, style, ...props }, ref) => {
    const { open, setOpen } = useSelect();
    return (<react_native_1.Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)} {...props}>
        <react_native_1.Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <react_native_1.View ref={ref} style={[styles.content, style]} onStartShouldSetResponder={() => true}>
            <react_native_1.ScrollView>{children}</react_native_1.ScrollView>
          </react_native_1.View>
        </react_native_1.Pressable>
      </react_native_1.Modal>);
});
exports.SelectContent.displayName = 'SelectContent';
exports.SelectItem = React.forwardRef(({ children, value: itemValue, style, textStyle, ...props }, ref) => {
    const { value, onValueChange } = useSelect();
    const isSelected = value === itemValue;
    return (<react_native_1.TouchableOpacity ref={ref} onPress={() => onValueChange(itemValue)} activeOpacity={0.7} style={[styles.item, isSelected && styles.selectedItem, style]} {...props}>
        <react_native_1.Text style={[styles.itemText, isSelected && styles.selectedItemText, textStyle]}>
          {children}
        </react_native_1.Text>
      </react_native_1.TouchableOpacity>);
});
exports.SelectItem.displayName = 'SelectItem';
function SelectGroup({ children }) {
    return <react_native_1.View>{children}</react_native_1.View>;
}
const styles = react_native_1.StyleSheet.create({
    trigger: {
        height: 40,
        width: '100%',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e5e5e5',
        backgroundColor: '#ffffff',
        paddingHorizontal: 12,
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 1,
        elevation: 1,
    },
    triggerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    valueText: {
        fontSize: 14,
        color: '#171717',
    },
    icon: {
        fontSize: 12,
        color: '#737373',
        marginLeft: 8,
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        justifyContent: 'flex-end',
    },
    content: {
        backgroundColor: '#ffffff',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        maxHeight: '50%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
    },
    item: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f5f5f5',
    },
    selectedItem: {
        backgroundColor: '#f5f5f5',
    },
    itemText: {
        fontSize: 14,
        color: '#171717',
    },
    selectedItemText: {
        fontWeight: '500',
    },
});
//# sourceMappingURL=select.js.map