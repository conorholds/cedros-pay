import * as React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';

interface TrustBadge {
  icon?: React.ReactNode;
  label: string;
}

export interface TrustBadgesProps {
  badges?: TrustBadge[];
  style?: ViewStyle;
}

// Default icons using simple text representations
function ShieldIcon() {
  return (
    <View style={styles.iconContainer}>
      <Text style={styles.iconText}>🛡️</Text>
    </View>
  );
}

function LockIcon() {
  return (
    <View style={styles.iconContainer}>
      <Text style={styles.iconText}>🔒</Text>
    </View>
  );
}

function TruckIcon() {
  return (
    <View style={styles.iconContainer}>
      <Text style={styles.iconText}>🚚</Text>
    </View>
  );
}

function ReturnIcon() {
  return (
    <View style={styles.iconContainer}>
      <Text style={styles.iconText}>↩️</Text>
    </View>
  );
}

const defaultBadges: TrustBadge[] = [
  { label: 'Secure Checkout', icon: <ShieldIcon /> },
  { label: 'SSL Encrypted', icon: <LockIcon /> },
  { label: 'Fast Shipping', icon: <TruckIcon /> },
  { label: '30-Day Returns', icon: <ReturnIcon /> },
];

export function TrustBadges({ badges = defaultBadges, style }: TrustBadgesProps) {
  return (
    <View style={[styles.container, style]}>
      {badges.map((badge, index) => (
        <View key={index} style={styles.badge}>
          {badge.icon || <ShieldIcon />}
          <Text style={styles.label}>{badge.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconContainer: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 16,
  },
  label: {
    fontSize: 12,
    color: '#737373',
  },
});
