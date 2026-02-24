import * as React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
} from 'react-native';

type CheckoutStep = {
  id: string;
  label: string;
  description?: string;
};

interface CheckoutStepsProps {
  /** Array of checkout steps */
  steps: CheckoutStep[];
  /** Current active step index (0-based) */
  currentStep: number;
  /** Additional style for the container */
  style?: ViewStyle;
}

/**
 * Checkout Steps Component
 *
 * Displays a step indicator/progress bar for multi-step checkout flows.
 * Shows completed, current, and upcoming steps.
 */
export function CheckoutSteps({
  steps,
  currentStep,
  style,
}: CheckoutStepsProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.stepsContainer}>
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isUpcoming = index > currentStep;

          return (
            <React.Fragment key={step.id}>
              <View style={styles.stepItem}>
                <View
                  style={[
                    styles.stepCircle,
                    isCompleted && styles.stepCircleCompleted,
                    isCurrent && styles.stepCircleCurrent,
                  ]}
                >
                  {isCompleted ? (
                    <Text style={styles.checkmark}>✓</Text>
                  ) : (
                    <Text
                      style={[
                        styles.stepNumber,
                        isCurrent && styles.stepNumberCurrent,
                        isUpcoming && styles.stepNumberUpcoming,
                      ]}
                    >
                      {index + 1}
                    </Text>
                  )}
                </View>
                <Text
                  style={[
                    styles.stepLabel,
                    isCompleted && styles.stepLabelCompleted,
                    isCurrent && styles.stepLabelCurrent,
                    isUpcoming && styles.stepLabelUpcoming,
                  ]}
                >
                  {step.label}
                </Text>
                {step.description ? (
                  <Text
                    style={[
                      styles.stepDescription,
                      isUpcoming && styles.stepDescriptionUpcoming,
                    ]}
                  >
                    {step.description}
                  </Text>
                ) : null}
              </View>
              {index < steps.length - 1 ? (
                <View
                  style={[
                    styles.connector,
                    isCompleted && styles.connectorCompleted,
                  ]}
                />
              ) : null}
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  stepsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  stepItem: {
    alignItems: 'center',
    flex: 1,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    borderWidth: 2,
    borderColor: '#e5e5e5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleCompleted: {
    backgroundColor: '#171717',
    borderColor: '#171717',
  },
  stepCircleCurrent: {
    backgroundColor: '#ffffff',
    borderColor: '#171717',
  },
  checkmark: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#737373',
  },
  stepNumberCurrent: {
    color: '#171717',
  },
  stepNumberUpcoming: {
    color: '#a3a3a3',
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#171717',
    marginTop: 8,
    textAlign: 'center',
  },
  stepLabelCompleted: {
    color: '#171717',
  },
  stepLabelCurrent: {
    color: '#171717',
    fontWeight: '600',
  },
  stepLabelUpcoming: {
    color: '#a3a3a3',
  },
  stepDescription: {
    fontSize: 11,
    color: '#737373',
    marginTop: 2,
    textAlign: 'center',
  },
  stepDescriptionUpcoming: {
    color: '#a3a3a3',
  },
  connector: {
    width: 40,
    height: 2,
    backgroundColor: '#e5e5e5',
    marginTop: 15,
    marginHorizontal: 4,
  },
  connectorCompleted: {
    backgroundColor: '#171717',
  },
});
