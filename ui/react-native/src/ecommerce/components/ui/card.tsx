import * as React from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp, TextStyle } from 'react-native';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const Card = React.forwardRef<View, CardProps>(({ children, style, ...props }, ref) => (
  <View ref={ref} style={[styles.card, style]} {...props}>
    {children}
  </View>
));

Card.displayName = 'Card';

interface CardHeaderProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const CardHeader = React.forwardRef<View, CardHeaderProps>(
  ({ children, style, ...props }, ref) => (
    <View ref={ref} style={[styles.header, style]} {...props}>
      {children}
    </View>
  )
);

CardHeader.displayName = 'CardHeader';

interface CardTitleProps {
  children: React.ReactNode;
  style?: TextStyle;
}

export const CardTitle = React.forwardRef<Text, CardTitleProps>(
  ({ children, style, ...props }, ref) => (
    <Text ref={ref} style={[styles.title, style]} {...props}>
      {children}
    </Text>
  )
);

CardTitle.displayName = 'CardTitle';

interface CardDescriptionProps {
  children: React.ReactNode;
  style?: TextStyle;
}

export const CardDescription = React.forwardRef<Text, CardDescriptionProps>(
  ({ children, style, ...props }, ref) => (
    <Text ref={ref} style={[styles.description, style]} {...props}>
      {children}
    </Text>
  )
);

CardDescription.displayName = 'CardDescription';

interface CardContentProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const CardContent = React.forwardRef<View, CardContentProps>(
  ({ children, style, ...props }, ref) => (
    <View ref={ref} style={[styles.content, style]} {...props}>
      {children}
    </View>
  )
);

CardContent.displayName = 'CardContent';

interface CardFooterProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const CardFooter = React.forwardRef<View, CardFooterProps>(
  ({ children, style, ...props }, ref) => (
    <View ref={ref} style={[styles.footer, style]} {...props}>
      {children}
    </View>
  )
);

CardFooter.displayName = 'CardFooter';

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  header: {
    padding: 24,
    gap: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#171717',
    letterSpacing: -0.3,
  },
  description: {
    fontSize: 14,
    color: '#737373',
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
});
