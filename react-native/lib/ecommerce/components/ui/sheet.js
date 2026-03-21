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
exports.SheetDescription = exports.SheetTitle = exports.SheetContent = void 0;
exports.Sheet = Sheet;
exports.SheetTrigger = SheetTrigger;
exports.SheetHeader = SheetHeader;
exports.SheetClose = SheetClose;
const React = __importStar(require("react"));
const react_native_1 = require("react-native");
const SheetContext = React.createContext(undefined);
function useSheet() {
    const context = React.useContext(SheetContext);
    if (!context) {
        throw new Error('Sheet components must be used within a Sheet');
    }
    return context;
}
function Sheet({ children, open, onOpenChange, defaultOpen }) {
    const [internalVisible, setInternalVisible] = React.useState(defaultOpen || false);
    const visible = open !== undefined ? open : internalVisible;
    const setVisible = onOpenChange || setInternalVisible;
    return (<SheetContext.Provider value={{ visible, setVisible }}>
      {children}
    </SheetContext.Provider>);
}
function SheetTrigger({ children }) {
    const { setVisible } = useSheet();
    return (<react_native_1.TouchableOpacity onPress={() => setVisible(true)} activeOpacity={0.7}>
      {children}
    </react_native_1.TouchableOpacity>);
}
exports.SheetContent = React.forwardRef(({ children, side = 'right', style, ...props }, ref) => {
    const { visible, setVisible } = useSheet();
    const slideAnim = React.useRef(new react_native_1.Animated.Value(0)).current;
    React.useEffect(() => {
        react_native_1.Animated.timing(slideAnim, {
            toValue: visible ? 1 : 0,
            duration: 200,
            useNativeDriver: true,
        }).start();
    }, [visible, slideAnim]);
    const getTransformStyle = () => {
        const { width: screenWidth, height: screenHeight } = react_native_1.Dimensions.get('window');
        switch (side) {
            case 'top':
                return {
                    transform: [
                        {
                            translateY: slideAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [-screenHeight, 0],
                            }),
                        },
                    ],
                };
            case 'bottom':
                return {
                    transform: [
                        {
                            translateY: slideAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [screenHeight, 0],
                            }),
                        },
                    ],
                };
            case 'left':
                return {
                    transform: [
                        {
                            translateX: slideAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [-screenWidth, 0],
                            }),
                        },
                    ],
                };
            case 'right':
                return {
                    transform: [
                        {
                            translateX: slideAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [screenWidth, 0],
                            }),
                        },
                    ],
                };
            case 'popup':
                return {
                    transform: [
                        {
                            scale: slideAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0.95, 1],
                            }),
                        },
                    ],
                    opacity: slideAnim,
                };
            default:
                return {};
        }
    };
    const getPositionStyle = () => {
        switch (side) {
            case 'top':
                return { top: 0, left: 0, right: 0 };
            case 'bottom':
                return { bottom: 0, left: 0, right: 0 };
            case 'left':
                return { left: 0, top: 0, bottom: 0 };
            case 'right':
                return { right: 0, top: 0, bottom: 0 };
            case 'popup':
                return {
                    bottom: 16,
                    right: 16,
                    maxWidth: 420,
                    maxHeight: react_native_1.Dimensions.get('window').height - 32,
                };
            default:
                return {};
        }
    };
    const getSizeStyle = () => {
        const { width: screenWidth } = react_native_1.Dimensions.get('window');
        switch (side) {
            case 'left':
            case 'right':
                return { width: screenWidth * 0.75, maxWidth: 384 };
            case 'popup':
                return { width: '100%' };
            default:
                return {};
        }
    };
    return (<react_native_1.Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)} {...props}>
        <react_native_1.Pressable style={styles.overlay} onPress={() => setVisible(false)}>
          <react_native_1.Animated.View ref={ref} style={[
            styles.content,
            getPositionStyle(),
            getSizeStyle(),
            getTransformStyle(),
            style,
        ]} onStartShouldSetResponder={() => true} onTouchEnd={(e) => e.stopPropagation()}>
            {children}
          </react_native_1.Animated.View>
        </react_native_1.Pressable>
      </react_native_1.Modal>);
});
exports.SheetContent.displayName = 'SheetContent';
function SheetHeader({ children, style, ...props }) {
    return (<react_native_1.View style={[styles.header, style]} {...props}>
      {children}
    </react_native_1.View>);
}
exports.SheetTitle = React.forwardRef(({ children, style, ...props }, ref) => (<react_native_1.Text ref={ref} style={[styles.title, style]} {...props}>
      {children}
    </react_native_1.Text>));
exports.SheetTitle.displayName = 'SheetTitle';
exports.SheetDescription = React.forwardRef(({ children, style, ...props }, ref) => (<react_native_1.Text ref={ref} style={[styles.description, style]} {...props}>
      {children}
    </react_native_1.Text>));
exports.SheetDescription.displayName = 'SheetDescription';
function SheetClose({ children }) {
    const { setVisible } = useSheet();
    return (<react_native_1.TouchableOpacity onPress={() => setVisible(false)} activeOpacity={0.7}>
      {children}
    </react_native_1.TouchableOpacity>);
}
const styles = react_native_1.StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
    },
    content: {
        position: 'absolute',
        backgroundColor: '#ffffff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
    },
    header: {
        padding: 24,
        gap: 8,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        color: '#171717',
        letterSpacing: -0.3,
    },
    description: {
        fontSize: 14,
        color: '#737373',
    },
});
//# sourceMappingURL=sheet.js.map