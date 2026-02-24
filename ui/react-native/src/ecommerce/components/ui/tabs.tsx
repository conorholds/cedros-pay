import * as React from 'react';
import {
  View,
  TouchableOpacity,
  Animated,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';

interface TabsContextType {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextType | undefined>(undefined);

function useTabs() {
  const context = React.useContext(TabsContext);
  if (!context) {
    throw new Error('Tabs components must be used within a Tabs');
  }
  return context;
}

interface TabsProps {
  children: React.ReactNode;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
}

export function Tabs({ children, value: controlledValue, defaultValue, onValueChange }: TabsProps) {
  const [internalValue, setInternalValue] = React.useState(defaultValue || '');

  const value = controlledValue !== undefined ? controlledValue : internalValue;
  const handleValueChange = (newValue: string) => {
    if (controlledValue === undefined) {
      setInternalValue(newValue);
    }
    onValueChange?.(newValue);
  };

  return (
    <TabsContext.Provider value={{ value, onValueChange: handleValueChange }}>
      {children}
    </TabsContext.Provider>
  );
}

interface TabsListProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const TabsList = React.forwardRef<View, TabsListProps>(
  ({ children, style, ...props }, ref) => (
    <View ref={ref} style={[styles.list, style]} {...props}>
      {children}
    </View>
  )
);

TabsList.displayName = 'TabsList';

interface TabsTriggerProps {
  children: React.ReactNode;
  value: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
  activeStyle?: ViewStyle;
  activeTextStyle?: TextStyle;
}

export const TabsTrigger = React.forwardRef<TouchableOpacity, TabsTriggerProps>(
  (
    { children, value: triggerValue, style, textStyle, activeStyle, activeTextStyle, ...props },
    ref
  ) => {
    const { value, onValueChange } = useTabs();
    const isActive = value === triggerValue;

    return (
      <TouchableOpacity
        ref={ref}
        onPress={() => onValueChange(triggerValue)}
        activeOpacity={0.7}
        style={[styles.trigger, isActive && styles.triggerActive, style, isActive && activeStyle]}
        {...props}
      >
        <Animated.Text
          style={[
            styles.triggerText,
            isActive && styles.triggerTextActive,
            textStyle,
            isActive && activeTextStyle,
          ]}
        >
          {children}
        </Animated.Text>
      </TouchableOpacity>
    );
  }
);

TabsTrigger.displayName = 'TabsTrigger';

interface TabsContentProps {
  children: React.ReactNode;
  value: string;
  style?: ViewStyle;
}

export const TabsContent = React.forwardRef<View, TabsContentProps>(
  ({ children, value: contentValue, style, ...props }, ref) => {
    const { value } = useTabs();
    const isActive = value === contentValue;

    if (!isActive) return null;

    return (
      <View ref={ref} style={[styles.content, style]} {...props}>
        {children}
      </View>
    );
  }
);

TabsContent.displayName = 'TabsContent';

const styles = StyleSheet.create({
  list: {
    flexDirection: 'row',
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    padding: 4,
  },
  trigger: {
    flex: 1,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    paddingHorizontal: 12,
  },
  triggerActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  triggerText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#737373',
  },
  triggerTextActive: {
    color: '#171717',
  },
  content: {
    marginTop: 8,
  },
});
