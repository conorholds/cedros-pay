import * as React from 'react';
import { ViewStyle } from 'react-native';
interface ContactFormProps {
    email?: string;
    name?: string;
    phone?: string;
    onEmailChange: (email: string) => void;
    onNameChange: (name: string) => void;
    onPhoneChange: (phone: string) => void;
    emailRequired?: boolean;
    nameRequired?: boolean;
    phoneRequired?: boolean;
    emailError?: string;
    nameError?: string;
    phoneError?: string;
    style?: ViewStyle;
}
export declare function ContactForm({ email, name, phone, onEmailChange, onNameChange, onPhoneChange, emailRequired, nameRequired, phoneRequired, emailError, nameError, phoneError, style, }: ContactFormProps): React.JSX.Element;
export {};
//# sourceMappingURL=ContactForm.d.ts.map