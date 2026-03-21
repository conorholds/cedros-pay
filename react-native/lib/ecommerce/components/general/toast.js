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
exports.useToast = useToast;
exports.useOptionalToast = useOptionalToast;
exports.ToastProvider = ToastProvider;
const React = __importStar(require("react"));
const react_native_1 = require("react-native");
const ToastContext = React.createContext(null);
function useToast() {
    const ctx = React.useContext(ToastContext);
    if (!ctx)
        throw new Error('useToast must be used within ToastProvider');
    return ctx;
}
function useOptionalToast() {
    return React.useContext(ToastContext);
}
// Individual Toast component
function ToastItem({ data, onDismiss, }) {
    const fadeAnim = React.useRef(new react_native_1.Animated.Value(0)).current;
    const slideAnim = React.useRef(new react_native_1.Animated.Value(-100)).current;
    React.useEffect(() => {
        // Animate in
        react_native_1.Animated.parallel([
            react_native_1.Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
            react_native_1.Animated.timing(slideAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start();
        // Auto dismiss after duration
        const timer = setTimeout(() => {
            handleDismiss();
        }, data.durationMs ?? 5000);
        return () => clearTimeout(timer);
    }, []);
    const handleDismiss = () => {
        react_native_1.Animated.parallel([
            react_native_1.Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
            react_native_1.Animated.timing(slideAnim, {
                toValue: -100,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start(() => {
            onDismiss();
        });
    };
    const handleAction = () => {
        data.onAction?.();
        handleDismiss();
    };
    return (<react_native_1.Animated.View style={[
            styles.toast,
            {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
            },
        ]}>
      <react_native_1.View style={styles.content}>
        {data.title && <react_native_1.Text style={styles.title}>{data.title}</react_native_1.Text>}
        {data.description && (<react_native_1.Text style={styles.description}>{data.description}</react_native_1.Text>)}
      </react_native_1.View>
      <react_native_1.View style={styles.actions}>
        {data.actionLabel && (<react_native_1.TouchableOpacity onPress={handleAction} style={styles.actionButton}>
            <react_native_1.Text style={styles.actionButtonText}>{data.actionLabel}</react_native_1.Text>
          </react_native_1.TouchableOpacity>)}
        <react_native_1.TouchableOpacity onPress={handleDismiss} style={styles.closeButton}>
          <react_native_1.Text style={styles.closeButtonText}>✕</react_native_1.Text>
        </react_native_1.TouchableOpacity>
      </react_native_1.View>
    </react_native_1.Animated.View>);
}
function ToastProvider({ children }) {
    const [toasts, setToasts] = React.useState([]);
    const toast = React.useCallback((data) => {
        const id = Math.random().toString(36).substring(7);
        setToasts((prev) => [...prev, { ...data, id }]);
    }, []);
    const dismissToast = React.useCallback((id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);
    return (<ToastContext.Provider value={{ toast }}>
      {children}
      <react_native_1.Modal visible={toasts.length > 0} transparent animationType="none" pointerEvents="box-none">
        <react_native_1.View style={styles.container} pointerEvents="box-none">
          <react_native_1.View style={styles.toastList} pointerEvents="auto">
            {toasts.map((t) => (<ToastItem key={t.id} data={t} onDismiss={() => dismissToast(t.id)}/>))}
          </react_native_1.View>
        </react_native_1.View>
      </react_native_1.Modal>
    </ToastContext.Provider>);
}
const { width } = react_native_1.Dimensions.get('window');
const styles = react_native_1.StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'flex-start',
        alignItems: 'center',
        paddingTop: react_native_1.Platform.OS === 'ios' ? 50 : 20,
    },
    toastList: {
        width: '100%',
        alignItems: 'center',
        gap: 8,
    },
    toast: {
        flexDirection: 'row',
        alignItems: 'center',
        width: width - 32,
        maxWidth: 400,
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 16,
        ...react_native_1.Platform.select({
            ios: {
                shadowColor: '#000000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    content: {
        flex: 1,
    },
    title: {
        fontSize: 14,
        fontWeight: '600',
        color: '#171717',
        marginBottom: 4,
    },
    description: {
        fontSize: 14,
        color: '#737373',
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    actionButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
        backgroundColor: '#f5f5f5',
    },
    actionButtonText: {
        fontSize: 12,
        fontWeight: '500',
        color: '#171717',
    },
    closeButton: {
        padding: 4,
        borderRadius: 4,
    },
    closeButtonText: {
        fontSize: 14,
        color: '#737373',
    },
});
//# sourceMappingURL=toast.js.map