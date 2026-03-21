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
exports.CTAButton = CTAButton;
const React = __importStar(require("react"));
const react_native_1 = require("react-native");
function CTAButton({ children, onPress, variant = 'primary', size = 'md', disabled = false, loading = false, fullWidth = false, style, textStyle, }) {
    const getSizeStyles = () => {
        switch (size) {
            case 'sm':
                return { paddingVertical: 8, paddingHorizontal: 16, fontSize: 14 };
            case 'lg':
                return { paddingVertical: 16, paddingHorizontal: 32, fontSize: 18 };
            case 'md':
            default:
                return { paddingVertical: 12, paddingHorizontal: 24, fontSize: 16 };
        }
    };
    const getVariantStyles = () => {
        switch (variant) {
            case 'secondary':
                return {
                    backgroundColor: '#f5f5f5',
                    borderColor: 'transparent',
                    textColor: '#171717',
                };
            case 'outline':
                return {
                    backgroundColor: 'transparent',
                    borderColor: '#171717',
                    textColor: '#171717',
                };
            case 'primary':
            default:
                return {
                    backgroundColor: '#171717',
                    borderColor: '#171717',
                    textColor: '#ffffff',
                };
        }
    };
    const sizeStyles = getSizeStyles();
    const variantStyles = getVariantStyles();
    return (<react_native_1.TouchableOpacity onPress={onPress} disabled={disabled || loading} activeOpacity={0.8} style={[
            styles.base,
            {
                backgroundColor: variantStyles.backgroundColor,
                borderColor: variantStyles.borderColor,
                paddingVertical: sizeStyles.paddingVertical,
                paddingHorizontal: sizeStyles.paddingHorizontal,
            },
            fullWidth && styles.fullWidth,
            (disabled || loading) && styles.disabled,
            style,
        ]}>
      <react_native_1.Text style={[
            styles.text,
            {
                color: variantStyles.textColor,
                fontSize: sizeStyles.fontSize,
            },
            (disabled || loading) && styles.disabledText,
            textStyle,
        ]}>
        {children}
      </react_native_1.Text>
    </react_native_1.TouchableOpacity>);
}
const styles = react_native_1.StyleSheet.create({
    base: {
        borderRadius: 9999,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'flex-start',
    },
    fullWidth: {
        alignSelf: 'stretch',
    },
    text: {
        fontWeight: '600',
    },
    disabled: {
        opacity: 0.5,
    },
    disabledText: {
        opacity: 0.8,
    },
});
//# sourceMappingURL=CTAButton.js.map