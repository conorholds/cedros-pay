import * as React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  ViewStyle,
  TextStyle,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface AccordionContextType {
  value: string | string[];
  onValueChange: (value: string) => void;
  type: 'single' | 'multiple';
}

const AccordionContext = React.createContext<AccordionContextType | undefined>(undefined);

function useAccordion() {
  const context = React.useContext(AccordionContext);
  if (!context) {
    throw new Error('Accordion components must be used within an Accordion');
  }
  return context;
}

interface AccordionProps {
  children: React.ReactNode;
  type?: 'single' | 'multiple';
  value?: string | string[];
  defaultValue?: string | string[];
  onValueChange?: (value: string | string[]) => void;
  collapsible?: boolean;
}

export function Accordion({
  children,
  type = 'single',
  value: controlledValue,
  defaultValue,
  onValueChange,
  collapsible = true,
}: AccordionProps) {
  const [internalValue, setInternalValue] = React.useState<string | string[]>(
    defaultValue || (type === 'multiple' ? [] : '')
  );

  const value = controlledValue !== undefined ? controlledValue : internalValue;

  const handleValueChange = (itemValue: string) => {
    let newValue: string | string[];

    if (type === 'single') {
      const currentValue = value as string;
      newValue = currentValue === itemValue && collapsible ? '' : itemValue;
    } else {
      const currentValue = value as string[];
      newValue = currentValue.includes(itemValue)
        ? currentValue.filter((v) => v !== itemValue)
        : [...currentValue, itemValue];
    }

    if (controlledValue === undefined) {
      setInternalValue(newValue);
    }
    onValueChange?.(newValue);
  };

  return (
    <AccordionContext.Provider value={{ value, onValueChange: handleValueChange, type }}>
      <View style={styles.container}>{children}</View>
    </AccordionContext.Provider>
  );
}

interface AccordionItemProps {
  children: React.ReactNode;
  value: string;
  style?: ViewStyle;
}

export const AccordionItem = React.forwardRef<View, AccordionItemProps>(
  ({ children, style, ...props }, ref) => (
    <View ref={ref} style={[styles.item, style]} {...props}>
      {children}
    </View>
  )
);

AccordionItem.displayName = 'AccordionItem';

interface AccordionTriggerProps {
  children: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const AccordionTrigger = React.forwardRef<TouchableOpacity, AccordionTriggerProps>(
  ({ children, style, textStyle, ...props }, ref) => {
    const { value, onValueChange, type } = useAccordion();
    const itemValue = (props as { value?: string }).value || '';
    const isExpanded = type === 'single' ? value === itemValue : (value as string[]).includes(itemValue);
    const rotateAnim = React.useRef(new Animated.Value(isExpanded ? 1 : 0)).current;

    React.useEffect(() => {
      Animated.timing(rotateAnim, {
        toValue: isExpanded ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }, [isExpanded, rotateAnim]);

    const handlePress = () => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      onValueChange(itemValue);
    };

    return (
      <TouchableOpacity
        ref={ref}
        onPress={handlePress}
        activeOpacity={0.7}
        style={[styles.trigger, style]}
        {...props}
      >
        <Text style={[styles.triggerText, textStyle]}>{children}</Text>
        <Animated.Text
          style={[
            styles.chevron,
            {
              transform: [
                {
                  rotate: rotateAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '180deg'],
                  }),
                },
              ],
            },
          ]}
        >
          ▾
        </Animated.Text>
      </TouchableOpacity>
    );
  }
);

AccordionTrigger.displayName = 'AccordionTrigger';

interface AccordionContentProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const AccordionContent = React.forwardRef<any, AccordionContentProps>(
  ({ children, style, ...props }, ref) => {
    const { value, type } = useAccordion();
    const itemValue = (props as { value?: string }).value || '';
    const isExpanded = type === 'single' ? value === itemValue : (value as string[]).includes(itemValue);

    const heightAnim = React.useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
      Animated.timing(heightAnim, {
        toValue: isExpanded ? 1 : 0,
        duration: 200,
        useNativeDriver: false,
      }).start();
    }, [isExpanded, heightAnim]);

    if (!isExpanded) return null;

    return (
      <Animated.View ref={ref} style={[styles.content, style]} {...props}>
        {children}
      </Animated.View>
    );
  }
);

AccordionContent.displayName = 'AccordionContent';

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  item: {
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  triggerText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#171717',
    flex: 1,
  },
  chevron: {
    fontSize: 14,
    color: '#737373',
    marginLeft: 12,
  },
  content: {
    paddingBottom: 16,
    overflow: 'hidden',
  },
});
