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
exports.AccordionContent = exports.AccordionTrigger = exports.AccordionItem = void 0;
exports.Accordion = Accordion;
const React = __importStar(require("react"));
const react_native_1 = require("react-native");
if (react_native_1.Platform.OS === 'android' && react_native_1.UIManager.setLayoutAnimationEnabledExperimental) {
    react_native_1.UIManager.setLayoutAnimationEnabledExperimental(true);
}
const AccordionContext = React.createContext(undefined);
function useAccordion() {
    const context = React.useContext(AccordionContext);
    if (!context) {
        throw new Error('Accordion components must be used within an Accordion');
    }
    return context;
}
function Accordion({ children, type = 'single', value: controlledValue, defaultValue, onValueChange, collapsible = true, }) {
    const [internalValue, setInternalValue] = React.useState(defaultValue || (type === 'multiple' ? [] : ''));
    const value = controlledValue !== undefined ? controlledValue : internalValue;
    const handleValueChange = (itemValue) => {
        let newValue;
        if (type === 'single') {
            const currentValue = value;
            newValue = currentValue === itemValue && collapsible ? '' : itemValue;
        }
        else {
            const currentValue = value;
            newValue = currentValue.includes(itemValue)
                ? currentValue.filter((v) => v !== itemValue)
                : [...currentValue, itemValue];
        }
        if (controlledValue === undefined) {
            setInternalValue(newValue);
        }
        onValueChange?.(newValue);
    };
    return (<AccordionContext.Provider value={{ value, onValueChange: handleValueChange, type }}>
      <react_native_1.View style={styles.container}>{children}</react_native_1.View>
    </AccordionContext.Provider>);
}
exports.AccordionItem = React.forwardRef(({ children, style, ...props }, ref) => (<react_native_1.View ref={ref} style={[styles.item, style]} {...props}>
      {children}
    </react_native_1.View>));
exports.AccordionItem.displayName = 'AccordionItem';
exports.AccordionTrigger = React.forwardRef(({ children, style, textStyle, ...props }, ref) => {
    const { value, onValueChange, type } = useAccordion();
    const itemValue = props.value || '';
    const isExpanded = type === 'single' ? value === itemValue : value.includes(itemValue);
    const rotateAnim = React.useRef(new react_native_1.Animated.Value(isExpanded ? 1 : 0)).current;
    React.useEffect(() => {
        react_native_1.Animated.timing(rotateAnim, {
            toValue: isExpanded ? 1 : 0,
            duration: 200,
            useNativeDriver: true,
        }).start();
    }, [isExpanded, rotateAnim]);
    const handlePress = () => {
        react_native_1.LayoutAnimation.configureNext(react_native_1.LayoutAnimation.Presets.easeInEaseOut);
        onValueChange(itemValue);
    };
    return (<react_native_1.TouchableOpacity ref={ref} onPress={handlePress} activeOpacity={0.7} style={[styles.trigger, style]} {...props}>
        <react_native_1.Text style={[styles.triggerText, textStyle]}>{children}</react_native_1.Text>
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
      </react_native_1.TouchableOpacity>);
});
exports.AccordionTrigger.displayName = 'AccordionTrigger';
exports.AccordionContent = React.forwardRef(({ children, style, ...props }, ref) => {
    const { value, type } = useAccordion();
    const itemValue = props.value || '';
    const isExpanded = type === 'single' ? value === itemValue : value.includes(itemValue);
    const heightAnim = React.useRef(new react_native_1.Animated.Value(0)).current;
    React.useEffect(() => {
        react_native_1.Animated.timing(heightAnim, {
            toValue: isExpanded ? 1 : 0,
            duration: 200,
            useNativeDriver: false,
        }).start();
    }, [isExpanded, heightAnim]);
    if (!isExpanded)
        return null;
    return (<react_native_1.Animated.View ref={ref} style={[styles.content, style]} {...props}>
        {children}
      </react_native_1.Animated.View>);
});
exports.AccordionContent.displayName = 'AccordionContent';
const styles = react_native_1.StyleSheet.create({
    container: {
        width: '100%',
    },
    item: {
        borderBottomWidth: 1,
        borderBottomColor: '#e5e5e5',
    },
    trigger: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
    },
    triggerText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#171717',
        flex: 1,
    },
    chevron: {
        fontSize: 14,
        color: '#737373',
        marginLeft: 12,
    },
    content: {
        paddingBottom: 16,
        overflow: 'hidden',
    },
});
//# sourceMappingURL=accordion.js.map