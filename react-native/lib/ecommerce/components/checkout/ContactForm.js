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
exports.ContactForm = ContactForm;
const React = __importStar(require("react"));
const react_native_1 = require("react-native");
const input_1 = require("../ui/input");
const label_1 = require("../ui/label");
function FieldError({ message }) {
    if (!message)
        return null;
    return <react_native_1.Text style={styles.fieldError}>{message}</react_native_1.Text>;
}
function ContactForm({ email, name, phone, onEmailChange, onNameChange, onPhoneChange, emailRequired, nameRequired, phoneRequired, emailError, nameError, phoneError, style, }) {
    const showEmail = email !== undefined;
    const showName = name !== undefined;
    const showPhone = phone !== undefined;
    const isRequired = emailRequired || nameRequired || phoneRequired;
    return (<react_native_1.View style={[styles.container, style]}>
      <react_native_1.View style={styles.header}>
        <react_native_1.Text style={styles.title}>Contact</react_native_1.Text>
        {isRequired ? (<react_native_1.Text style={styles.requiredBadge}>Required</react_native_1.Text>) : (<react_native_1.Text style={styles.optionalBadge}>Optional</react_native_1.Text>)}
      </react_native_1.View>

      <react_native_1.View style={styles.fieldsContainer}>
        {showEmail ? (<react_native_1.View style={styles.field}>
            <label_1.Label>Email</label_1.Label>
            <input_1.Input value={email} onChangeText={onEmailChange} placeholder="you@company.com" keyboardType="email-address" autoCapitalize="none" autoCorrect={false}/>
            <FieldError message={emailError}/>
          </react_native_1.View>) : null}

        {showName ? (<react_native_1.View style={styles.field}>
            <label_1.Label>Name</label_1.Label>
            <input_1.Input value={name} onChangeText={onNameChange} placeholder="Full name" autoCapitalize="words"/>
            <FieldError message={nameError}/>
          </react_native_1.View>) : null}

        {showPhone ? (<react_native_1.View style={styles.field}>
            <label_1.Label>Phone</label_1.Label>
            <input_1.Input value={phone} onChangeText={onPhoneChange} placeholder="Phone number" keyboardType="phone-pad"/>
            <FieldError message={phoneError}/>
          </react_native_1.View>) : null}
      </react_native_1.View>
    </react_native_1.View>);
}
const styles = react_native_1.StyleSheet.create({
    container: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e5e5e5',
        padding: 16,
        marginBottom: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    title: {
        fontSize: 14,
        fontWeight: '600',
        color: '#171717',
    },
    requiredBadge: {
        fontSize: 12,
        color: '#737373',
    },
    optionalBadge: {
        fontSize: 12,
        color: '#a3a3a3',
    },
    fieldsContainer: {
        gap: 12,
    },
    field: {
        gap: 4,
    },
    fieldError: {
        fontSize: 12,
        color: '#dc2626',
        marginTop: 4,
    },
});
//# sourceMappingURL=ContactForm.js.map