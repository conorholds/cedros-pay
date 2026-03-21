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
exports.Button = void 0;
const React = __importStar(require("react"));
const react_native_1 = require("react-native");
const getVariantStyles = (variant) => {
    switch (variant) {
        case 'default':
            return {
                backgroundColor: '#171717',
            };
        case 'secondary':
            return {
                backgroundColor: '#f5f5f5',
            };
        case 'outline':
            return {
                backgroundColor: 'transparent',
                borderWidth: 1,
                borderColor: '#e5e5e5',
            };
        case 'ghost':
            return {
                backgroundColor: 'transparent',
            };
        case 'destructive':
            return {
                backgroundColor: '#dc2626',
            };
        case 'link':
            return {
                backgroundColor: 'transparent',
            };
        default:
            return {};
    }
};
const getTextColor = (variant, disabled) => {
    if (disabled)
        return '#a3a3a3';
    switch (variant) {
        case 'default':
            return '#ffffff';
        case 'secondary':
        case 'outline':
        case 'ghost':
        case 'link':
            return '#171717';
        case 'destructive':
            return '#ffffff';
        default:
            return '#171717';
    }
};
const getSizeStyles = (size) => {
    switch (size) {
        case 'sm':
            return { paddingVertical: 8, paddingHorizontal: 12 };
        case 'lg':
            return { paddingVertical: 14, paddingHorizontal: 24 };
        case 'default':
        default:
            return { paddingVertical: 10, paddingHorizontal: 16 };
    }
};
exports.Button = React.forwardRef(({ children, variant = 'default', size = 'default', disabled, loading, onPress, style, textStyle, ...props }, ref) => {
    const variantStyles = getVariantStyles(variant);
    const sizeStyles = getSizeStyles(size);
    const textColor = getTextColor(variant, disabled);
    return (<react_native_1.TouchableOpacity ref={ref} onPress={onPress} disabled={disabled || loading} activeOpacity={0.7} style={[
            styles.base,
            variantStyles,
            sizeStyles,
            (disabled || loading) && styles.disabled,
            style,
        ]} {...props}>
        {loading ? (<react_native_1.ActivityIndicator size="small" color={textColor}/>) : (<react_native_1.Text style={[
                styles.text,
                { color: textColor },
                variant === 'link' && styles.underline,
                textStyle,
            ]}>
            {children}
          </react_native_1.Text>)}
      </react_native_1.TouchableOpacity>);
});
exports.Button.displayName = 'Button';
const styles = react_native_1.StyleSheet.create({
    base: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
    },
    text: {
        fontSize: 14,
        fontWeight: '500',
    },
    underline: {
        textDecorationLine: 'underline',
    },
    disabled: {
        opacity: 0.5,
    },
});
//# sourceMappingURL=button.js.map