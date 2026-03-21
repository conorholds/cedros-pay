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
exports.ChatMessage = ChatMessage;
const React = __importStar(require("react"));
const react_native_1 = require("react-native");
function ChatMessage({ message, style }) {
    const isUser = message.role === 'user';
    const formatTime = (date) => {
        return date.toLocaleTimeString(undefined, {
            hour: 'numeric',
            minute: '2-digit',
        });
    };
    return (<react_native_1.View style={[
            styles.container,
            isUser ? styles.userContainer : styles.assistantContainer,
            style,
        ]}>
      <react_native_1.View style={[
            styles.bubble,
            isUser ? styles.userBubble : styles.assistantBubble,
        ]}>
        <react_native_1.Text style={[
            styles.content,
            isUser ? styles.userContent : styles.assistantContent,
        ]}>
          {message.content}
        </react_native_1.Text>
      </react_native_1.View>
      <react_native_1.Text style={styles.timestamp}>{formatTime(message.timestamp)}</react_native_1.Text>
    </react_native_1.View>);
}
const styles = react_native_1.StyleSheet.create({
    container: {
        marginVertical: 4,
        maxWidth: '80%',
    },
    userContainer: {
        alignSelf: 'flex-end',
    },
    assistantContainer: {
        alignSelf: 'flex-start',
    },
    bubble: {
        borderRadius: 16,
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    userBubble: {
        backgroundColor: '#171717',
        borderBottomRightRadius: 4,
    },
    assistantBubble: {
        backgroundColor: '#f5f5f5',
        borderBottomLeftRadius: 4,
    },
    content: {
        fontSize: 14,
        lineHeight: 20,
    },
    userContent: {
        color: '#ffffff',
    },
    assistantContent: {
        color: '#171717',
    },
    timestamp: {
        fontSize: 11,
        color: '#a3a3a3',
        marginTop: 4,
        marginHorizontal: 4,
    },
});
//# sourceMappingURL=ChatMessage.js.map