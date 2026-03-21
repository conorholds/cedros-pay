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
exports.Skeleton = Skeleton;
const React = __importStar(require("react"));
const react_native_1 = require("react-native");
function Skeleton({ style, width, height, ...props }) {
    const pulseAnim = React.useRef(new react_native_1.Animated.Value(0.5)).current;
    React.useEffect(() => {
        const pulse = react_native_1.Animated.loop(react_native_1.Animated.sequence([
            react_native_1.Animated.timing(pulseAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
            react_native_1.Animated.timing(pulseAnim, {
                toValue: 0.5,
                duration: 800,
                useNativeDriver: true,
            }),
        ]));
        pulse.start();
        return () => {
            pulse.stop();
        };
    }, [pulseAnim]);
    return (<react_native_1.Animated.View style={[
            styles.skeleton,
            { width: width, height: height },
            { opacity: pulseAnim },
            style,
        ]} {...props}/>);
}
const styles = react_native_1.StyleSheet.create({
    skeleton: {
        borderRadius: 6,
        backgroundColor: '#f5f5f5',
    },
});
//# sourceMappingURL=skeleton.js.map