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
exports.CheckoutSteps = CheckoutSteps;
const React = __importStar(require("react"));
const react_native_1 = require("react-native");
/**
 * Checkout Steps Component
 *
 * Displays a step indicator/progress bar for multi-step checkout flows.
 * Shows completed, current, and upcoming steps.
 */
function CheckoutSteps({ steps, currentStep, style, }) {
    return (<react_native_1.View style={[styles.container, style]}>
      <react_native_1.View style={styles.stepsContainer}>
        {steps.map((step, index) => {
            const isCompleted = index < currentStep;
            const isCurrent = index === currentStep;
            const isUpcoming = index > currentStep;
            return (<React.Fragment key={step.id}>
              <react_native_1.View style={styles.stepItem}>
                <react_native_1.View style={[
                    styles.stepCircle,
                    isCompleted && styles.stepCircleCompleted,
                    isCurrent && styles.stepCircleCurrent,
                ]}>
                  {isCompleted ? (<react_native_1.Text style={styles.checkmark}>✓</react_native_1.Text>) : (<react_native_1.Text style={[
                        styles.stepNumber,
                        isCurrent && styles.stepNumberCurrent,
                        isUpcoming && styles.stepNumberUpcoming,
                    ]}>
                      {index + 1}
                    </react_native_1.Text>)}
                </react_native_1.View>
                <react_native_1.Text style={[
                    styles.stepLabel,
                    isCompleted && styles.stepLabelCompleted,
                    isCurrent && styles.stepLabelCurrent,
                    isUpcoming && styles.stepLabelUpcoming,
                ]}>
                  {step.label}
                </react_native_1.Text>
                {step.description ? (<react_native_1.Text style={[
                        styles.stepDescription,
                        isUpcoming && styles.stepDescriptionUpcoming,
                    ]}>
                    {step.description}
                  </react_native_1.Text>) : null}
              </react_native_1.View>
              {index < steps.length - 1 ? (<react_native_1.View style={[
                        styles.connector,
                        isCompleted && styles.connectorCompleted,
                    ]}/>) : null}
            </React.Fragment>);
        })}
      </react_native_1.View>
    </react_native_1.View>);
}
const styles = react_native_1.StyleSheet.create({
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
//# sourceMappingURL=CheckoutSteps.js.map