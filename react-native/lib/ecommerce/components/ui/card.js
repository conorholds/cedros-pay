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
exports.CardFooter = exports.CardContent = exports.CardDescription = exports.CardTitle = exports.CardHeader = exports.Card = void 0;
const React = __importStar(require("react"));
const react_native_1 = require("react-native");
exports.Card = React.forwardRef(({ children, style, ...props }, ref) => (<react_native_1.View ref={ref} style={[styles.card, style]} {...props}>
    {children}
  </react_native_1.View>));
exports.Card.displayName = 'Card';
exports.CardHeader = React.forwardRef(({ children, style, ...props }, ref) => (<react_native_1.View ref={ref} style={[styles.header, style]} {...props}>
      {children}
    </react_native_1.View>));
exports.CardHeader.displayName = 'CardHeader';
exports.CardTitle = React.forwardRef(({ children, style, ...props }, ref) => (<react_native_1.Text ref={ref} style={[styles.title, style]} {...props}>
      {children}
    </react_native_1.Text>));
exports.CardTitle.displayName = 'CardTitle';
exports.CardDescription = React.forwardRef(({ children, style, ...props }, ref) => (<react_native_1.Text ref={ref} style={[styles.description, style]} {...props}>
      {children}
    </react_native_1.Text>));
exports.CardDescription.displayName = 'CardDescription';
exports.CardContent = React.forwardRef(({ children, style, ...props }, ref) => (<react_native_1.View ref={ref} style={[styles.content, style]} {...props}>
      {children}
    </react_native_1.View>));
exports.CardContent.displayName = 'CardContent';
exports.CardFooter = React.forwardRef(({ children, style, ...props }, ref) => (<react_native_1.View ref={ref} style={[styles.footer, style]} {...props}>
      {children}
    </react_native_1.View>));
exports.CardFooter.displayName = 'CardFooter';
const styles = react_native_1.StyleSheet.create({
    card: {
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e5e5e5',
        backgroundColor: '#ffffff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    header: {
        padding: 24,
        gap: 6,
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
    content: {
        paddingHorizontal: 24,
        paddingBottom: 24,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingBottom: 24,
    },
});
//# sourceMappingURL=card.js.map