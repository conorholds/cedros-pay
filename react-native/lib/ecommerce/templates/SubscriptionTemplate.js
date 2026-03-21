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
exports.SubscriptionTemplate = SubscriptionTemplate;
const React = __importStar(require("react"));
const react_native_1 = require("react-native");
const context_1 = require("../config/context");
const useSubscriptionData_1 = require("../hooks/useSubscriptionData");
const money_1 = require("../utils/money");
const button_1 = require("../components/ui/button");
const EmptyState_1 = require("../components/general/EmptyState");
const ErrorState_1 = require("../components/general/ErrorState");
const skeleton_1 = require("../components/ui/skeleton");
const card_1 = require("../components/ui/card");
// Checkmark icon component
function CheckIcon({ color }) {
    return (<react_native_1.View style={[styles.checkIcon, { backgroundColor: color }]}>
      <react_native_1.Text style={styles.checkText}>✓</react_native_1.Text>
    </react_native_1.View>);
}
function SubscriptionTemplate({ style, title = 'Choose Your Plan', subtitle = 'Select the plan that best fits your needs.', annualSavingsBadge = '2 months free', popularBadgeText = 'Best Deal', footerNotice, onSelectTier, }) {
    const { config } = (0, context_1.useCedrosShop)();
    const { tiers, status, isLoading, error } = (0, useSubscriptionData_1.useSubscriptionData)();
    const [interval, setInterval] = React.useState('monthly');
    const handleSelectTier = (tierId) => {
        if (onSelectTier) {
            onSelectTier(tierId, interval);
        }
    };
    return (<react_native_1.View style={[styles.container, style]}>
      <react_native_1.ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <react_native_1.View style={styles.header}>
          <react_native_1.Text style={styles.title}>{title}</react_native_1.Text>
          <react_native_1.Text style={styles.subtitle}>{subtitle}</react_native_1.Text>
        </react_native_1.View>

        {/* Billing Toggle */}
        <react_native_1.View style={styles.toggleContainer}>
          <react_native_1.View style={styles.toggleWrapper}>
            <react_native_1.TouchableOpacity onPress={() => setInterval('annual')} style={[
            styles.toggleButton,
            interval === 'annual' && styles.toggleButtonActive,
        ]}>
              <react_native_1.Text style={[
            styles.toggleText,
            interval === 'annual' && styles.toggleTextActive,
        ]}>
                Yearly
              </react_native_1.Text>
              {annualSavingsBadge && (<react_native_1.View style={[
                styles.badge,
                interval === 'annual'
                    ? styles.badgeActiveLight
                    : styles.badgeActiveDark,
            ]}>
                  <react_native_1.Text style={[
                styles.badgeText,
                interval === 'annual'
                    ? styles.badgeTextActive
                    : styles.badgeTextInactive,
            ]}>
                    {annualSavingsBadge}
                  </react_native_1.Text>
                </react_native_1.View>)}
            </react_native_1.TouchableOpacity>
            <react_native_1.TouchableOpacity onPress={() => setInterval('monthly')} style={[
            styles.toggleButton,
            interval === 'monthly' && styles.toggleButtonActive,
        ]}>
              <react_native_1.Text style={[
            styles.toggleText,
            interval === 'monthly' && styles.toggleTextActive,
        ]}>
                Monthly
              </react_native_1.Text>
            </react_native_1.TouchableOpacity>
          </react_native_1.View>
        </react_native_1.View>

        {/* Error State */}
        {error ? (<react_native_1.View style={styles.errorContainer}>
            <ErrorState_1.ErrorState description={error}/>
          </react_native_1.View>) : null}

        {/* Loading State */}
        {isLoading ? (<react_native_1.View style={styles.skeletonGrid}>
            <skeleton_1.Skeleton style={styles.skeletonCard}/>
            <skeleton_1.Skeleton style={styles.skeletonCard}/>
            <skeleton_1.Skeleton style={styles.skeletonCard}/>
          </react_native_1.View>) : tiers.length === 0 ? (<react_native_1.View style={styles.emptyContainer}>
            <EmptyState_1.EmptyState title="No plans available" description="Subscription plans will appear here once configured."/>
          </react_native_1.View>) : (
        /* Pricing Cards */
        <react_native_1.View style={styles.cardsContainer}>
            {tiers.map((tier) => {
                const isCurrent = status?.isActive && status.currentTierId === tier.id;
                const price = interval === 'annual' && tier.priceAnnual
                    ? tier.priceAnnual
                    : tier.priceMonthly;
                const isPopular = tier.isPopular;
                // Inventory tracking
                const hasInventoryLimit = tier.inventoryQuantity != null;
                const inventoryRemaining = hasInventoryLimit
                    ? Math.max(0, (tier.inventoryQuantity ?? 0) - (tier.inventorySold ?? 0))
                    : null;
                const isSoldOut = hasInventoryLimit && inventoryRemaining === 0;
                const isLowStock = hasInventoryLimit &&
                    inventoryRemaining != null &&
                    inventoryRemaining > 0 &&
                    inventoryRemaining <= 5;
                // Split features: first one is highlight, rest are regular
                const [highlightFeature, ...regularFeatures] = tier.features;
                const cardColors = isPopular
                    ? {
                        backgroundColor: '#171717',
                        textColor: '#ffffff',
                        secondaryText: '#a3a3a3',
                        checkColor: '#525252',
                    }
                    : {
                        backgroundColor: '#ffffff',
                        textColor: '#171717',
                        secondaryText: '#737373',
                        checkColor: '#d4d4d4',
                    };
                return (<card_1.Card key={tier.id} style={[
                        styles.pricingCard,
                        { backgroundColor: cardColors.backgroundColor },
                        isPopular && styles.popularCard,
                    ]}>
                  <card_1.CardContent style={styles.cardContent}>
                    {/* Popular Badge */}
                    {isPopular && popularBadgeText && (<react_native_1.View style={styles.popularBadge}>
                        <react_native_1.Text style={styles.popularBadgeText}>
                          {popularBadgeText}
                        </react_native_1.Text>
                      </react_native_1.View>)}

                    {/* Plan Header */}
                    <react_native_1.View style={styles.planHeader}>
                      <react_native_1.Text style={[
                        styles.planTitle,
                        { color: cardColors.textColor },
                    ]}>
                        {tier.title}
                      </react_native_1.Text>
                      {tier.description && (<react_native_1.Text style={[
                            styles.planDescription,
                            { color: cardColors.secondaryText },
                        ]}>
                          {tier.description}
                        </react_native_1.Text>)}
                    </react_native_1.View>

                    {/* Price */}
                    <react_native_1.View style={styles.priceContainer}>
                      <react_native_1.Text style={[
                        styles.price,
                        { color: cardColors.textColor },
                    ]}>
                        {(0, money_1.formatMoney)({
                        amount: price,
                        currency: tier.currency || config.currency,
                    })}
                      </react_native_1.Text>
                      <react_native_1.Text style={[
                        styles.pricePeriod,
                        { color: cardColors.secondaryText },
                    ]}>
                        Per {interval === 'annual' ? 'year' : 'month'}, billed{' '}
                        {interval === 'annual' ? 'annually' : 'monthly'}
                      </react_native_1.Text>
                    </react_native_1.View>

                    {/* Inventory Status */}
                    {hasInventoryLimit && (<react_native_1.Text style={[
                            styles.inventoryText,
                            isSoldOut
                                ? styles.soldOutText
                                : isLowStock
                                    ? styles.lowStockText
                                    : { color: cardColors.secondaryText },
                        ]}>
                        {isSoldOut
                            ? 'Sold out'
                            : `${inventoryRemaining} remaining`}
                      </react_native_1.Text>)}

                    {/* CTA Button */}
                    <button_1.Button variant={isPopular ? 'default' : 'outline'} disabled={isCurrent || isSoldOut} onPress={() => handleSelectTier(tier.id)} style={[
                        styles.ctaButton,
                        isPopular && styles.popularButton,
                    ]}>
                      {isSoldOut
                        ? 'Sold Out'
                        : isCurrent
                            ? 'Current Plan'
                            : 'Purchase'}
                    </button_1.Button>

                    {/* Feature Highlight */}
                    {highlightFeature && (<react_native_1.Text style={[
                            styles.highlightFeature,
                            { color: cardColors.textColor },
                        ]}>
                        {highlightFeature}
                      </react_native_1.Text>)}

                    {/* Features List */}
                    {regularFeatures.length > 0 && (<react_native_1.View style={styles.featuresList}>
                        {regularFeatures.map((feature, idx) => (<react_native_1.View key={idx} style={styles.featureRow}>
                            <CheckIcon color={cardColors.checkColor}/>
                            <react_native_1.Text style={[
                                styles.featureText,
                                { color: cardColors.secondaryText },
                            ]}>
                              {feature}
                            </react_native_1.Text>
                          </react_native_1.View>))}
                      </react_native_1.View>)}
                  </card_1.CardContent>
                </card_1.Card>);
            })}
          </react_native_1.View>)}

        {/* Footer Notice */}
        {footerNotice && (<react_native_1.View style={styles.footer}>
            <react_native_1.Text style={styles.footerText}>{footerNotice}</react_native_1.Text>
          </react_native_1.View>)}
      </react_native_1.ScrollView>
    </react_native_1.View>);
}
const styles = react_native_1.StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fafafa',
    },
    content: {
        paddingHorizontal: 16,
        paddingTop: 48,
        paddingBottom: 32,
    },
    header: {
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 36,
        fontWeight: '700',
        color: '#171717',
        textAlign: 'center',
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 16,
        color: '#737373',
        textAlign: 'center',
        marginTop: 12,
    },
    toggleContainer: {
        alignItems: 'center',
        marginBottom: 24,
    },
    toggleWrapper: {
        flexDirection: 'row',
        backgroundColor: '#e5e5e5',
        borderRadius: 9999,
        padding: 4,
    },
    toggleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 9999,
    },
    toggleButtonActive: {
        backgroundColor: '#171717',
    },
    toggleText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#737373',
    },
    toggleTextActive: {
        color: '#ffffff',
    },
    badge: {
        borderRadius: 9999,
        paddingHorizontal: 8,
        paddingVertical: 2,
    },
    badgeActiveLight: {
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    badgeActiveDark: {
        backgroundColor: '#171717',
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '500',
    },
    badgeTextActive: {
        color: '#ffffff',
    },
    badgeTextInactive: {
        color: '#ffffff',
    },
    errorContainer: {
        marginTop: 24,
    },
    skeletonGrid: {
        gap: 16,
        marginTop: 32,
    },
    skeletonCard: {
        height: 480,
        borderRadius: 16,
    },
    emptyContainer: {
        marginTop: 32,
    },
    cardsContainer: {
        gap: 16,
        marginTop: 32,
    },
    pricingCard: {
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#e5e5e5',
    },
    popularCard: {
        borderColor: '#171717',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
    },
    cardContent: {
        padding: 20,
    },
    popularBadge: {
        position: 'absolute',
        top: -12,
        right: 16,
        backgroundColor: '#f5f5f5',
        borderRadius: 9999,
        paddingHorizontal: 12,
        paddingVertical: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 4,
    },
    popularBadgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#171717',
    },
    planHeader: {
        marginBottom: 20,
    },
    planTitle: {
        fontSize: 20,
        fontWeight: '700',
    },
    planDescription: {
        fontSize: 14,
        lineHeight: 20,
        marginTop: 6,
    },
    priceContainer: {
        marginBottom: 16,
    },
    price: {
        fontSize: 44,
        fontWeight: '700',
        letterSpacing: -1,
    },
    pricePeriod: {
        fontSize: 14,
        marginTop: 4,
    },
    inventoryText: {
        fontSize: 12,
        fontWeight: '500',
        marginBottom: 16,
    },
    soldOutText: {
        color: '#dc2626',
    },
    lowStockText: {
        color: '#d97706',
    },
    ctaButton: {
        width: '100%',
        borderRadius: 9999,
        paddingVertical: 14,
        marginBottom: 20,
    },
    popularButton: {
        backgroundColor: '#ffffff',
    },
    highlightFeature: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 12,
    },
    featuresList: {
        gap: 10,
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
    },
    checkIcon: {
        width: 16,
        height: 16,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 2,
    },
    checkText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#ffffff',
    },
    featureText: {
        fontSize: 14,
        lineHeight: 20,
        flex: 1,
    },
    footer: {
        marginTop: 40,
        alignItems: 'center',
    },
    footerText: {
        fontSize: 12,
        color: '#a3a3a3',
        textAlign: 'center',
        maxWidth: 600,
        lineHeight: 18,
    },
});
//# sourceMappingURL=SubscriptionTemplate.js.map