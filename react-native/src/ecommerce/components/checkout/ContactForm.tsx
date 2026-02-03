import * as React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

interface FieldErrorProps {
  message?: string;
}

function FieldError({ message }: FieldErrorProps) {
  if (!message) return null;
  return <Text style={styles.fieldError}>{message}</Text>;
}

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

export function ContactForm({
  email,
  name,
  phone,
  onEmailChange,
  onNameChange,
  onPhoneChange,
  emailRequired,
  nameRequired,
  phoneRequired,
  emailError,
  nameError,
  phoneError,
  style,
}: ContactFormProps) {
  const showEmail = email !== undefined;
  const showName = name !== undefined;
  const showPhone = phone !== undefined;

  const isRequired = emailRequired || nameRequired || phoneRequired;

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <Text style={styles.title}>Contact</Text>
        {isRequired ? (
          <Text style={styles.requiredBadge}>Required</Text>
        ) : (
          <Text style={styles.optionalBadge}>Optional</Text>
        )}
      </View>

      <View style={styles.fieldsContainer}>
        {showEmail ? (
          <View style={styles.field}>
            <Label>Email</Label>
            <Input
              value={email}
              onChangeText={onEmailChange}
              placeholder="you@company.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <FieldError message={emailError} />
          </View>
        ) : null}

        {showName ? (
          <View style={styles.field}>
            <Label>Name</Label>
            <Input
              value={name}
              onChangeText={onNameChange}
              placeholder="Full name"
              autoCapitalize="words"
            />
            <FieldError message={nameError} />
          </View>
        ) : null}

        {showPhone ? (
          <View style={styles.field}>
            <Label>Phone</Label>
            <Input
              value={phone}
              onChangeText={onPhoneChange}
              placeholder="Phone number"
              keyboardType="phone-pad"
            />
            <FieldError message={phoneError} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
