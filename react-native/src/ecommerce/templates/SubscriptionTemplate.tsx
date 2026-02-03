import * as React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle, ScrollView } from 'react-native';
import { useCedrosShop } from '../config/context';
import { useSubscriptionData } from '../hooks/useSubscriptionData';
import { formatMoney } from '../utils/money';
import { Button } from '../components/ui/button';
import { EmptyState } from '../components/general/EmptyState';
import { ErrorState } from '../components/general/ErrorState';
import { Skeleton } from '../components/ui/skeleton';
import { Card, CardContent } from '../components/ui/card';

// Checkmark icon component
function CheckIcon({ color }: { color: string }) {
  return (
    <View style={[styles.checkIcon, { backgroundColor: color }]}>
      <Text style={styles.checkText}>✓</Text>
    </View>
  );
}

export interface SubscriptionTemplateProps {
  style?: ViewStyle;
  /** Page title */
  title?: string;
  /** Subtitle shown below title */
  subtitle?: string;
  /** Text for annual savings badge (e.g., "2 months free") */
  annualSavingsBadge?: string;
  /** Badge text for popular plan (default: "Best Deal") */
  popularBadgeText?: string;
  /** Footer notice text */
  footerNotice?: string;
  /** Callback when user selects a tier */
  onSelectTier?: (tierId: string, interval: 'monthly' | 'annual') => void;
}

export function SubscriptionTemplate({
  style,
  title = 'Choose Your Plan',
  subtitle = 'Select the plan that best fits your needs.',
  annualSavingsBadge = '2 months free',
  popularBadgeText = 'Best Deal',
  footerNotice,
  onSelectTier,
}: SubscriptionTemplateProps) {
  const { config } = useCedrosShop();
  const { tiers, status, isLoading, error } = useSubscriptionData();
  const [interval, setInterval] = React.useState<'monthly' | 'annual'>('monthly');

  const handleSelectTier = (tierId: string) => {
    if (onSelectTier) {
      onSelectTier(tierId, interval);
    }
  };

  return (
    <View style={[styles.container, style]}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>

        {/* Billing Toggle */}
        <View style={styles.toggleContainer}>
          <View style={styles.toggleWrapper}>
            <TouchableOpacity
              onPress={() => setInterval('annual')}
              style={[
                styles.toggleButton,
                interval === 'annual' && styles.toggleButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.toggleText,
                  interval === 'annual' && styles.toggleTextActive,
                ]}
              >
                Yearly
              </Text>
              {annualSavingsBadge && (
                <View
                  style={[
                    styles.badge,
                    interval === 'annual'
                      ? styles.badgeActiveLight
                      : styles.badgeActiveDark,
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      interval === 'annual'
                        ? styles.badgeTextActive
                        : styles.badgeTextInactive,
                    ]}
                  >
                    {annualSavingsBadge}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setInterval('monthly')}
              style={[
                styles.toggleButton,
                interval === 'monthly' && styles.toggleButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.toggleText,
                  interval === 'monthly' && styles.toggleTextActive,
                ]}
              >
                Monthly
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Error State */}
        {error ? (
          <View style={styles.errorContainer}>
            <ErrorState description={error} />
          </View>
        ) : null}

        {/* Loading State */}
        {isLoading ? (
          <View style={styles.skeletonGrid}>
            <Skeleton style={styles.skeletonCard} />
            <Skeleton style={styles.skeletonCard} />
            <Skeleton style={styles.skeletonCard} />
          </View>
        ) : tiers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <EmptyState
              title="No plans available"
              description="Subscription plans will appear here once configured."
            />
          </View>
        ) : (
          /* Pricing Cards */
          <View style={styles.cardsContainer}>
            {tiers.map((tier) => {
              const isCurrent = status?.isActive && status.currentTierId === tier.id;
              const price =
                interval === 'annual' && tier.priceAnnual
                  ? tier.priceAnnual
                  : tier.priceMonthly;
              const isPopular = tier.isPopular;

              // Inventory tracking
              const hasInventoryLimit = tier.inventoryQuantity != null;
              const inventoryRemaining = hasInventoryLimit
                ? Math.max(0, (tier.inventoryQuantity ?? 0) - (tier.inventorySold ?? 0))
                : null;
              const isSoldOut = hasInventoryLimit && inventoryRemaining === 0;
              const isLowStock =
                hasInventoryLimit &&
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

              return (
                <Card
                  key={tier.id}
                  style={[
                    styles.pricingCard,
                    { backgroundColor: cardColors.backgroundColor },
                    isPopular && styles.popularCard,
                  ]}
                >
                  <CardContent style={styles.cardContent}>
                    {/* Popular Badge */}
                    {isPopular && popularBadgeText && (
                      <View style={styles.popularBadge}>
                        <Text style={styles.popularBadgeText}>
                          {popularBadgeText}
                        </Text>
                      </View>
                    )}

                    {/* Plan Header */}
                    <View style={styles.planHeader}>
                      <Text
                        style={[
                          styles.planTitle,
                          { color: cardColors.textColor },
                        ]}
                      >
                        {tier.title}
                      </Text>
                      {tier.description && (
                        <Text
                          style={[
                            styles.planDescription,
                            { color: cardColors.secondaryText },
                          ]}
                        >
                          {tier.description}
                        </Text>
                      )}
                    </View>

                    {/* Price */}
                    <View style={styles.priceContainer}>
                      <Text
                        style={[
                          styles.price,
                          { color: cardColors.textColor },
                        ]}
                      >
                        {formatMoney({
                          amount: price,
                          currency: tier.currency || config.currency,
                        })}
                      </Text>
                      <Text
                        style={[
                          styles.pricePeriod,
                          { color: cardColors.secondaryText },
                        ]}
                      >
                        Per {interval === 'annual' ? 'year' : 'month'}, billed{' '}
                        {interval === 'annual' ? 'annually' : 'monthly'}
                      </Text>
                    </View>

                    {/* Inventory Status */}
                    {hasInventoryLimit && (
                      <Text
                        style={[
                          styles.inventoryText,
                          isSoldOut
                            ? styles.soldOutText
                            : isLowStock
                            ? styles.lowStockText
                            : { color: cardColors.secondaryText },
                        ]}
                      >
                        {isSoldOut
                          ? 'Sold out'
                          : `${inventoryRemaining} remaining`}
                      </Text>
                    )}

                    {/* CTA Button */}
                    <Button
                      variant={isPopular ? 'default' : 'outline'}
                      disabled={isCurrent || isSoldOut}
                      onPress={() => handleSelectTier(tier.id)}
                      style={[
                        styles.ctaButton,
                        isPopular && styles.popularButton,
                      ]}
                    >
                      {isSoldOut
                        ? 'Sold Out'
                        : isCurrent
                        ? 'Current Plan'
                        : 'Purchase'}
                    </Button>

                    {/* Feature Highlight */}
                    {highlightFeature && (
                      <Text
                        style={[
                          styles.highlightFeature,
                          { color: cardColors.textColor },
                        ]}
                      >
                        {highlightFeature}
                      </Text>
                    )}

                    {/* Features List */}
                    {regularFeatures.length > 0 && (
                      <View style={styles.featuresList}>
                        {regularFeatures.map((feature, idx) => (
                          <View key={idx} style={styles.featureRow}>
                            <CheckIcon color={cardColors.checkColor} />
                            <Text
                              style={[
                                styles.featureText,
                                { color: cardColors.secondaryText },
                              ]}
                            >
                              {feature}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </View>
        )}

        {/* Footer Notice */}
        {footerNotice && (
          <View style={styles.footer}>
            <Text style={styles.footerText}>{footerNotice}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
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
