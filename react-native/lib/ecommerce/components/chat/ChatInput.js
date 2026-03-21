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
exports.ChatInput = ChatInput;
const React = __importStar(require("react"));
const react_native_1 = require("react-native");
function ChatInput({ onSend, disabled = false, placeholder = 'Type a message...', style, }) {
    const [text, setText] = React.useState('');
    const inputRef = React.useRef(null);
    const handleSend = () => {
        const trimmed = text.trim();
        if (!trimmed || disabled)
            return;
        onSend(trimmed);
        setText('');
        react_native_1.Keyboard.dismiss();
    };
    return (<react_native_1.View style={[styles.container, style]}>
      <react_native_1.View style={styles.inputContainer}>
        <react_native_1.TextInput ref={inputRef} style={styles.input} value={text} onChangeText={setText} placeholder={placeholder} placeholderTextColor="#a3a3a3" multiline maxLength={1000} editable={!disabled} returnKeyType="send" blurOnSubmit={false} onSubmitEditing={handleSend}/>
        <react_native_1.TouchableOpacity style={[
            styles.sendButton,
            (!text.trim() || disabled) && styles.sendButtonDisabled,
        ]} onPress={handleSend} disabled={!text.trim() || disabled} activeOpacity={0.7}>
          <react_native_1.Text style={styles.sendButtonText}>➤</react_native_1.Text>
        </react_native_1.TouchableOpacity>
      </react_native_1.View>
    </react_native_1.View>);
}
const styles = react_native_1.StyleSheet.create({
    container: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderTopWidth: 1,
        borderTopColor: '#e5e5e5',
        backgroundColor: '#ffffff',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        backgroundColor: '#f5f5f5',
        borderRadius: 24,
        paddingHorizontal: 4,
        paddingVertical: 4,
        minHeight: 48,
    },
    input: {
        flex: 1,
        fontSize: 15,
        color: '#171717',
        paddingHorizontal: 16,
        paddingVertical: 12,
        maxHeight: 120,
        lineHeight: 20,
    },
    sendButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#171717',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 4,
    },
    sendButtonDisabled: {
        backgroundColor: '#d4d4d4',
    },
    sendButtonText: {
        fontSize: 14,
        color: '#ffffff',
        transform: [{ rotate: '-45deg' }],
    },
});
//# sourceMappingURL=ChatInput.js.map