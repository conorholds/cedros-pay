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
exports.TabsContent = exports.TabsTrigger = exports.TabsList = void 0;
exports.Tabs = Tabs;
const React = __importStar(require("react"));
const react_native_1 = require("react-native");
const TabsContext = React.createContext(undefined);
function useTabs() {
    const context = React.useContext(TabsContext);
    if (!context) {
        throw new Error('Tabs components must be used within a Tabs');
    }
    return context;
}
function Tabs({ children, value: controlledValue, defaultValue, onValueChange }) {
    const [internalValue, setInternalValue] = React.useState(defaultValue || '');
    const value = controlledValue !== undefined ? controlledValue : internalValue;
    const handleValueChange = (newValue) => {
        if (controlledValue === undefined) {
            setInternalValue(newValue);
        }
        onValueChange?.(newValue);
    };
    return (<TabsContext.Provider value={{ value, onValueChange: handleValueChange }}>
      {children}
    </TabsContext.Provider>);
}
exports.TabsList = React.forwardRef(({ children, style, ...props }, ref) => (<react_native_1.View ref={ref} style={[styles.list, style]} {...props}>
      {children}
    </react_native_1.View>));
exports.TabsList.displayName = 'TabsList';
exports.TabsTrigger = React.forwardRef(({ children, value: triggerValue, style, textStyle, activeStyle, activeTextStyle, ...props }, ref) => {
    const { value, onValueChange } = useTabs();
    const isActive = value === triggerValue;
    return (<react_native_1.TouchableOpacity ref={ref} onPress={() => onValueChange(triggerValue)} activeOpacity={0.7} style={[styles.trigger, isActive && styles.triggerActive, style, isActive && activeStyle]} {...props}>
        <react_native_1.Animated.Text style={[
            styles.triggerText,
            isActive && styles.triggerTextActive,
            textStyle,
            isActive && activeTextStyle,
        ]}>
          {children}
        </react_native_1.Animated.Text>
      </react_native_1.TouchableOpacity>);
});
exports.TabsTrigger.displayName = 'TabsTrigger';
exports.TabsContent = React.forwardRef(({ children, value: contentValue, style, ...props }, ref) => {
    const { value } = useTabs();
    const isActive = value === contentValue;
    if (!isActive)
        return null;
    return (<react_native_1.View ref={ref} style={[styles.content, style]} {...props}>
        {children}
      </react_native_1.View>);
});
exports.TabsContent.displayName = 'TabsContent';
const styles = react_native_1.StyleSheet.create({
    list: {
        flexDirection: 'row',
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
        backgroundColor: '#f5f5f5',
        padding: 4,
    },
    trigger: {
        flex: 1,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 6,
        paddingHorizontal: 12,
    },
    triggerActive: {
        backgroundColor: '#ffffff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    triggerText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#737373',
    },
    triggerTextActive: {
        color: '#171717',
    },
    content: {
        marginTop: 8,
    },
});
//# sourceMappingURL=tabs.js.map