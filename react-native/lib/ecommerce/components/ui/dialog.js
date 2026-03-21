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
exports.DialogDescription = exports.DialogTitle = exports.DialogContent = void 0;
exports.Dialog = Dialog;
exports.DialogTrigger = DialogTrigger;
exports.DialogHeader = DialogHeader;
exports.DialogFooter = DialogFooter;
exports.DialogClose = DialogClose;
const React = __importStar(require("react"));
const react_native_1 = require("react-native");
const DialogContext = React.createContext(undefined);
function useDialog() {
    const context = React.useContext(DialogContext);
    if (!context) {
        throw new Error('Dialog components must be used within a Dialog');
    }
    return context;
}
function Dialog({ children, open, onOpenChange, defaultOpen }) {
    const [internalVisible, setInternalVisible] = React.useState(defaultOpen || false);
    const visible = open !== undefined ? open : internalVisible;
    const setVisible = onOpenChange || setInternalVisible;
    return (<DialogContext.Provider value={{ visible, setVisible }}>
      {children}
    </DialogContext.Provider>);
}
function DialogTrigger({ children }) {
    const { setVisible } = useDialog();
    return (<react_native_1.TouchableOpacity onPress={() => setVisible(true)} activeOpacity={0.7}>
      {children}
    </react_native_1.TouchableOpacity>);
}
exports.DialogContent = React.forwardRef(({ children, style, ...props }, ref) => {
    const { visible, setVisible } = useDialog();
    return (<react_native_1.Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)} {...props}>
        <react_native_1.Pressable style={styles.overlay} onPress={() => setVisible(false)}>
          <react_native_1.View ref={ref} style={[styles.content, style]}>
            {children}
          </react_native_1.View>
        </react_native_1.Pressable>
      </react_native_1.Modal>);
});
exports.DialogContent.displayName = 'DialogContent';
function DialogHeader({ children, style, ...props }) {
    return (<react_native_1.View style={[styles.header, style]} {...props}>
      {children}
    </react_native_1.View>);
}
function DialogFooter({ children, style, ...props }) {
    return (<react_native_1.View style={[styles.footer, style]} {...props}>
      {children}
    </react_native_1.View>);
}
exports.DialogTitle = React.forwardRef(({ children, style, ...props }, ref) => (<react_native_1.Text ref={ref} style={[styles.title, style]} {...props}>
      {children}
    </react_native_1.Text>));
exports.DialogTitle.displayName = 'DialogTitle';
exports.DialogDescription = React.forwardRef(({ children, style, ...props }, ref) => (<react_native_1.Text ref={ref} style={[styles.description, style]} {...props}>
      {children}
    </react_native_1.Text>));
exports.DialogDescription.displayName = 'DialogDescription';
function DialogClose({ children }) {
    const { setVisible } = useDialog();
    return (<react_native_1.TouchableOpacity onPress={() => setVisible(false)} activeOpacity={0.7}>
      {children}
    </react_native_1.TouchableOpacity>);
}
const { width } = react_native_1.Dimensions.get('window');
const styles = react_native_1.StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    content: {
        width: Math.min(width - 40, 512),
        backgroundColor: '#ffffff',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#e5e5e5',
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
        gap: 16,
    },
    header: {
        gap: 8,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
        marginTop: 8,
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
//# sourceMappingURL=dialog.js.map