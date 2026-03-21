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
exports.ChatWidget = ChatWidget;
const React = __importStar(require("react"));
const react_native_1 = require("react-native");
const ChatPanel_1 = require("./ChatPanel");
const { height } = react_native_1.Dimensions.get('window');
function ChatWidget({ title = 'Chat Support', subtitle = 'How can we help you today?', position = 'bottom-right', style, onSendMessage, }) {
    const [isOpen, setIsOpen] = React.useState(false);
    const slideAnim = React.useRef(new react_native_1.Animated.Value(height)).current;
    const fadeAnim = React.useRef(new react_native_1.Animated.Value(0)).current;
    React.useEffect(() => {
        if (isOpen) {
            react_native_1.Animated.parallel([
                react_native_1.Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }),
                react_native_1.Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();
        }
        else {
            react_native_1.Animated.parallel([
                react_native_1.Animated.timing(slideAnim, {
                    toValue: height,
                    duration: 250,
                    useNativeDriver: true,
                }),
                react_native_1.Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [isOpen]);
    return (<>
      {/* Floating Button */}
      <react_native_1.TouchableOpacity style={[
            styles.floatingButton,
            position === 'bottom-left' ? styles.leftPosition : styles.rightPosition,
            style,
        ]} onPress={() => setIsOpen(true)} activeOpacity={0.8}>
        <react_native_1.Text style={styles.floatingButtonText}>💬</react_native_1.Text>
      </react_native_1.TouchableOpacity>

      {/* Chat Modal */}
      <react_native_1.Modal visible={isOpen} transparent animationType="none" onRequestClose={() => setIsOpen(false)}>
        <react_native_1.View style={styles.modalOverlay}>
          <react_native_1.Animated.View style={[
            styles.modalContent,
            {
                transform: [{ translateY: slideAnim }],
                opacity: fadeAnim,
            },
        ]}>
            {/* Header */}
            <react_native_1.View style={styles.header}>
              <react_native_1.View style={styles.headerText}>
                <react_native_1.Text style={styles.headerTitle}>{title}</react_native_1.Text>
                <react_native_1.Text style={styles.headerSubtitle}>{subtitle}</react_native_1.Text>
              </react_native_1.View>
              <react_native_1.TouchableOpacity onPress={() => setIsOpen(false)} style={styles.closeButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <react_native_1.Text style={styles.closeButtonText}>✕</react_native_1.Text>
              </react_native_1.TouchableOpacity>
            </react_native_1.View>

            {/* Chat Panel */}
            <ChatPanel_1.ChatPanel onSendMessage={onSendMessage}/>
          </react_native_1.Animated.View>
        </react_native_1.View>
      </react_native_1.Modal>
    </>);
}
const styles = react_native_1.StyleSheet.create({
    floatingButton: {
        position: 'absolute',
        bottom: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#171717',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 8,
        zIndex: 1000,
    },
    leftPosition: {
        left: 24,
    },
    rightPosition: {
        right: 24,
    },
    floatingButtonText: {
        fontSize: 24,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#ffffff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        height: height * 0.75,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 12,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e5e5',
    },
    headerText: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#171717',
    },
    headerSubtitle: {
        fontSize: 13,
        color: '#737373',
        marginTop: 2,
    },
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#f5f5f5',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#737373',
    },
});
//# sourceMappingURL=ChatWidget.js.map