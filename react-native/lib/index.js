"use strict";
/**
 * @cedros/pay-react-native - Unified Stripe and Solana payments for React Native
 *
 * Main library exports - NO ADMIN functionality
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isDuplicateRequest = exports.setButtonCooldown = exports.isButtonInCooldown = exports.createDedupedClickHandler = exports.deduplicateRequest = exports.formatUserError = exports.getUserFriendlyError = exports.ERROR_MESSAGES = exports.parseErrorResponse = exports.formatError = exports.validateConfig = exports.createLogger = exports.getLogger = exports.Logger = exports.LogLevel = exports.RouteDiscoveryManager = exports.StoreBillingManager = exports.SubscriptionChangeManager = exports.SubscriptionManager = exports.ERROR_CATEGORIES = exports.isManageableStoreSubscription = exports.isRestorableStoreProduct = exports.resolveNativeStoreMethod = exports.fetchCedrosProductCatalog = exports.createCedrosProductCatalogFromPaywallProducts = exports.mapPaywallProductToCedrosProductDefinition = exports.selectGooglePlayOffer = exports.resolveStoreProductConfiguration = exports.mergeCedrosProductDefinition = exports.detectDistributionChannel = exports.collapseRenderablePaymentMethods = exports.resolvePaymentPolicy = exports.resolveAllowedPaymentMethods = exports.useRefundVerification = exports.useCryptoSubscription = exports.useCreditsSubscription = exports.useStoreAwarePaymentPolicy = exports.useSubscriptionManagement = exports.useSubscription = exports.useCedrosTheme = exports.useCedrosContext = exports.CedrosProvider = exports.CryptoSubscribeButton = exports.CreditsSubscribeButton = exports.ProductPrice = exports.SubscriptionManagementPanel = exports.SubscribeButton = exports.ManageSubscriptionsButton = exports.RestorePurchasesButton = exports.NativeStoreButton = void 0;
exports.getLocalizedError = exports.createTranslator = exports.getAvailableLocales = exports.loadLocale = exports.detectLocale = exports.CSP_PRESETS = exports.RPC_PROVIDERS = exports.formatCSP = exports.generateCSPDirectives = exports.generateCSP = exports.WalletPool = exports.createWalletPool = exports.formatDateTime = exports.formatDate = exports.stackCheckoutCoupons = exports.calculateDiscountPercentage = exports.formatCouponCodes = exports.parseCouponCodes = exports.KNOWN_STABLECOINS = exports.validateTokenMint = exports.SECURITY_RECOMMENDATIONS = exports.logSecurityReport = exports.validateSecurity = exports.DEFAULT_FETCH_TIMEOUT_MS = exports.fetchWithTimeout = exports.RETRY_PRESETS = exports.retryWithBackoff = exports.CIRCUIT_BREAKER_PRESETS = exports.CircuitBreakerOpenError = exports.CircuitState = exports.createCircuitBreaker = exports.RATE_LIMITER_PRESETS = exports.createRateLimiter = exports.getUserErrorMessage = exports.isRetryableError = exports.emitPaymentError = exports.emitPaymentSuccess = exports.emitPaymentProcessing = exports.emitWalletError = exports.emitWalletConnected = exports.emitWalletConnect = exports.emitPaymentStart = exports.CEDROS_EVENTS = exports.DEFAULT_DEDUP_WINDOW_MS = exports.DEFAULT_COOLDOWN_MS = exports.getDeduplicationStats = exports.clearDeduplicationCache = exports.trackInFlightRequest = exports.getInFlightRequest = exports.markRequestProcessed = void 0;
exports.useLocalizedError = exports.useTranslation = exports.useCedrosTranslation = exports.selectPlural = exports.formatNumberValue = exports.formatMinorCurrencyAmount = exports.formatDateTimeValue = exports.formatDateOnly = exports.formatCurrencyAmount = exports.getLocaleDirection = exports.normalizeLocale = void 0;
// Components
var components_1 = require("./components");
Object.defineProperty(exports, "NativeStoreButton", { enumerable: true, get: function () { return components_1.NativeStoreButton; } });
Object.defineProperty(exports, "RestorePurchasesButton", { enumerable: true, get: function () { return components_1.RestorePurchasesButton; } });
Object.defineProperty(exports, "ManageSubscriptionsButton", { enumerable: true, get: function () { return components_1.ManageSubscriptionsButton; } });
Object.defineProperty(exports, "SubscribeButton", { enumerable: true, get: function () { return components_1.SubscribeButton; } });
Object.defineProperty(exports, "SubscriptionManagementPanel", { enumerable: true, get: function () { return components_1.SubscriptionManagementPanel; } });
Object.defineProperty(exports, "ProductPrice", { enumerable: true, get: function () { return components_1.ProductPrice; } });
Object.defineProperty(exports, "CreditsSubscribeButton", { enumerable: true, get: function () { return components_1.CreditsSubscribeButton; } });
Object.defineProperty(exports, "CryptoSubscribeButton", { enumerable: true, get: function () { return components_1.CryptoSubscribeButton; } });
// Context
var context_1 = require("./context");
Object.defineProperty(exports, "CedrosProvider", { enumerable: true, get: function () { return context_1.CedrosProvider; } });
Object.defineProperty(exports, "useCedrosContext", { enumerable: true, get: function () { return context_1.useCedrosContext; } });
Object.defineProperty(exports, "useCedrosTheme", { enumerable: true, get: function () { return context_1.useCedrosTheme; } });
// Hooks
var useSubscription_1 = require("./hooks/useSubscription");
Object.defineProperty(exports, "useSubscription", { enumerable: true, get: function () { return useSubscription_1.useSubscription; } });
var useSubscriptionManagement_1 = require("./hooks/useSubscriptionManagement");
Object.defineProperty(exports, "useSubscriptionManagement", { enumerable: true, get: function () { return useSubscriptionManagement_1.useSubscriptionManagement; } });
var useStoreAwarePaymentPolicy_1 = require("./hooks/useStoreAwarePaymentPolicy");
Object.defineProperty(exports, "useStoreAwarePaymentPolicy", { enumerable: true, get: function () { return useStoreAwarePaymentPolicy_1.useStoreAwarePaymentPolicy; } });
var useCreditsSubscription_1 = require("./hooks/useCreditsSubscription");
Object.defineProperty(exports, "useCreditsSubscription", { enumerable: true, get: function () { return useCreditsSubscription_1.useCreditsSubscription; } });
var useCryptoSubscription_1 = require("./hooks/useCryptoSubscription");
Object.defineProperty(exports, "useCryptoSubscription", { enumerable: true, get: function () { return useCryptoSubscription_1.useCryptoSubscription; } });
var useRefundVerification_1 = require("./hooks/useRefundVerification");
Object.defineProperty(exports, "useRefundVerification", { enumerable: true, get: function () { return useRefundVerification_1.useRefundVerification; } });
// Policy
var policy_1 = require("./policy");
Object.defineProperty(exports, "resolveAllowedPaymentMethods", { enumerable: true, get: function () { return policy_1.resolveAllowedPaymentMethods; } });
Object.defineProperty(exports, "resolvePaymentPolicy", { enumerable: true, get: function () { return policy_1.resolvePaymentPolicy; } });
Object.defineProperty(exports, "collapseRenderablePaymentMethods", { enumerable: true, get: function () { return policy_1.collapseRenderablePaymentMethods; } });
Object.defineProperty(exports, "detectDistributionChannel", { enumerable: true, get: function () { return policy_1.detectDistributionChannel; } });
Object.defineProperty(exports, "mergeCedrosProductDefinition", { enumerable: true, get: function () { return policy_1.mergeCedrosProductDefinition; } });
Object.defineProperty(exports, "resolveStoreProductConfiguration", { enumerable: true, get: function () { return policy_1.resolveStoreProductConfiguration; } });
Object.defineProperty(exports, "selectGooglePlayOffer", { enumerable: true, get: function () { return policy_1.selectGooglePlayOffer; } });
Object.defineProperty(exports, "mapPaywallProductToCedrosProductDefinition", { enumerable: true, get: function () { return policy_1.mapPaywallProductToCedrosProductDefinition; } });
Object.defineProperty(exports, "createCedrosProductCatalogFromPaywallProducts", { enumerable: true, get: function () { return policy_1.createCedrosProductCatalogFromPaywallProducts; } });
Object.defineProperty(exports, "fetchCedrosProductCatalog", { enumerable: true, get: function () { return policy_1.fetchCedrosProductCatalog; } });
Object.defineProperty(exports, "resolveNativeStoreMethod", { enumerable: true, get: function () { return policy_1.resolveNativeStoreMethod; } });
Object.defineProperty(exports, "isRestorableStoreProduct", { enumerable: true, get: function () { return policy_1.isRestorableStoreProduct; } });
Object.defineProperty(exports, "isManageableStoreSubscription", { enumerable: true, get: function () { return policy_1.isManageableStoreSubscription; } });
// Error code categories (for bulk error handling)
var errors_1 = require("./types/errors");
Object.defineProperty(exports, "ERROR_CATEGORIES", { enumerable: true, get: function () { return errors_1.ERROR_CATEGORIES; } });
// Managers (for advanced usage)
var SubscriptionManager_1 = require("./managers/SubscriptionManager");
Object.defineProperty(exports, "SubscriptionManager", { enumerable: true, get: function () { return SubscriptionManager_1.SubscriptionManager; } });
var SubscriptionChangeManager_1 = require("./managers/SubscriptionChangeManager");
Object.defineProperty(exports, "SubscriptionChangeManager", { enumerable: true, get: function () { return SubscriptionChangeManager_1.SubscriptionChangeManager; } });
var StoreBillingManager_1 = require("./managers/StoreBillingManager");
Object.defineProperty(exports, "StoreBillingManager", { enumerable: true, get: function () { return StoreBillingManager_1.StoreBillingManager; } });
var RouteDiscoveryManager_1 = require("./managers/RouteDiscoveryManager");
Object.defineProperty(exports, "RouteDiscoveryManager", { enumerable: true, get: function () { return RouteDiscoveryManager_1.RouteDiscoveryManager; } });
// Utilities
var logger_1 = require("./utils/logger");
Object.defineProperty(exports, "LogLevel", { enumerable: true, get: function () { return logger_1.LogLevel; } });
Object.defineProperty(exports, "Logger", { enumerable: true, get: function () { return logger_1.Logger; } });
Object.defineProperty(exports, "getLogger", { enumerable: true, get: function () { return logger_1.getLogger; } });
Object.defineProperty(exports, "createLogger", { enumerable: true, get: function () { return logger_1.createLogger; } });
var validateConfig_1 = require("./utils/validateConfig");
Object.defineProperty(exports, "validateConfig", { enumerable: true, get: function () { return validateConfig_1.validateConfig; } });
var errorHandling_1 = require("./utils/errorHandling");
Object.defineProperty(exports, "formatError", { enumerable: true, get: function () { return errorHandling_1.formatError; } });
Object.defineProperty(exports, "parseErrorResponse", { enumerable: true, get: function () { return errorHandling_1.parseErrorResponse; } });
var errorMessages_1 = require("./utils/errorMessages");
Object.defineProperty(exports, "ERROR_MESSAGES", { enumerable: true, get: function () { return errorMessages_1.ERROR_MESSAGES; } });
Object.defineProperty(exports, "getUserFriendlyError", { enumerable: true, get: function () { return errorMessages_1.getUserFriendlyError; } });
Object.defineProperty(exports, "formatUserError", { enumerable: true, get: function () { return errorMessages_1.formatUserError; } });
var requestDeduplication_1 = require("./utils/requestDeduplication");
Object.defineProperty(exports, "deduplicateRequest", { enumerable: true, get: function () { return requestDeduplication_1.deduplicateRequest; } });
Object.defineProperty(exports, "createDedupedClickHandler", { enumerable: true, get: function () { return requestDeduplication_1.createDedupedClickHandler; } });
Object.defineProperty(exports, "isButtonInCooldown", { enumerable: true, get: function () { return requestDeduplication_1.isButtonInCooldown; } });
Object.defineProperty(exports, "setButtonCooldown", { enumerable: true, get: function () { return requestDeduplication_1.setButtonCooldown; } });
Object.defineProperty(exports, "isDuplicateRequest", { enumerable: true, get: function () { return requestDeduplication_1.isDuplicateRequest; } });
Object.defineProperty(exports, "markRequestProcessed", { enumerable: true, get: function () { return requestDeduplication_1.markRequestProcessed; } });
Object.defineProperty(exports, "getInFlightRequest", { enumerable: true, get: function () { return requestDeduplication_1.getInFlightRequest; } });
Object.defineProperty(exports, "trackInFlightRequest", { enumerable: true, get: function () { return requestDeduplication_1.trackInFlightRequest; } });
Object.defineProperty(exports, "clearDeduplicationCache", { enumerable: true, get: function () { return requestDeduplication_1.clearDeduplicationCache; } });
Object.defineProperty(exports, "getDeduplicationStats", { enumerable: true, get: function () { return requestDeduplication_1.getDeduplicationStats; } });
Object.defineProperty(exports, "DEFAULT_COOLDOWN_MS", { enumerable: true, get: function () { return requestDeduplication_1.DEFAULT_COOLDOWN_MS; } });
Object.defineProperty(exports, "DEFAULT_DEDUP_WINDOW_MS", { enumerable: true, get: function () { return requestDeduplication_1.DEFAULT_DEDUP_WINDOW_MS; } });
var eventEmitter_1 = require("./utils/eventEmitter");
Object.defineProperty(exports, "CEDROS_EVENTS", { enumerable: true, get: function () { return eventEmitter_1.CEDROS_EVENTS; } });
Object.defineProperty(exports, "emitPaymentStart", { enumerable: true, get: function () { return eventEmitter_1.emitPaymentStart; } });
Object.defineProperty(exports, "emitWalletConnect", { enumerable: true, get: function () { return eventEmitter_1.emitWalletConnect; } });
Object.defineProperty(exports, "emitWalletConnected", { enumerable: true, get: function () { return eventEmitter_1.emitWalletConnected; } });
Object.defineProperty(exports, "emitWalletError", { enumerable: true, get: function () { return eventEmitter_1.emitWalletError; } });
Object.defineProperty(exports, "emitPaymentProcessing", { enumerable: true, get: function () { return eventEmitter_1.emitPaymentProcessing; } });
Object.defineProperty(exports, "emitPaymentSuccess", { enumerable: true, get: function () { return eventEmitter_1.emitPaymentSuccess; } });
Object.defineProperty(exports, "emitPaymentError", { enumerable: true, get: function () { return eventEmitter_1.emitPaymentError; } });
var errorParser_1 = require("./utils/errorParser");
Object.defineProperty(exports, "isRetryableError", { enumerable: true, get: function () { return errorParser_1.isRetryableError; } });
Object.defineProperty(exports, "getUserErrorMessage", { enumerable: true, get: function () { return errorParser_1.getUserErrorMessage; } });
var rateLimiter_1 = require("./utils/rateLimiter");
Object.defineProperty(exports, "createRateLimiter", { enumerable: true, get: function () { return rateLimiter_1.createRateLimiter; } });
Object.defineProperty(exports, "RATE_LIMITER_PRESETS", { enumerable: true, get: function () { return rateLimiter_1.RATE_LIMITER_PRESETS; } });
var circuitBreaker_1 = require("./utils/circuitBreaker");
Object.defineProperty(exports, "createCircuitBreaker", { enumerable: true, get: function () { return circuitBreaker_1.createCircuitBreaker; } });
Object.defineProperty(exports, "CircuitState", { enumerable: true, get: function () { return circuitBreaker_1.CircuitState; } });
Object.defineProperty(exports, "CircuitBreakerOpenError", { enumerable: true, get: function () { return circuitBreaker_1.CircuitBreakerOpenError; } });
Object.defineProperty(exports, "CIRCUIT_BREAKER_PRESETS", { enumerable: true, get: function () { return circuitBreaker_1.CIRCUIT_BREAKER_PRESETS; } });
var exponentialBackoff_1 = require("./utils/exponentialBackoff");
Object.defineProperty(exports, "retryWithBackoff", { enumerable: true, get: function () { return exponentialBackoff_1.retryWithBackoff; } });
Object.defineProperty(exports, "RETRY_PRESETS", { enumerable: true, get: function () { return exponentialBackoff_1.RETRY_PRESETS; } });
var fetchWithTimeout_1 = require("./utils/fetchWithTimeout");
Object.defineProperty(exports, "fetchWithTimeout", { enumerable: true, get: function () { return fetchWithTimeout_1.fetchWithTimeout; } });
Object.defineProperty(exports, "DEFAULT_FETCH_TIMEOUT_MS", { enumerable: true, get: function () { return fetchWithTimeout_1.DEFAULT_FETCH_TIMEOUT_MS; } });
var securityValidation_1 = require("./utils/securityValidation");
Object.defineProperty(exports, "validateSecurity", { enumerable: true, get: function () { return securityValidation_1.validateSecurity; } });
Object.defineProperty(exports, "logSecurityReport", { enumerable: true, get: function () { return securityValidation_1.logSecurityReport; } });
Object.defineProperty(exports, "SECURITY_RECOMMENDATIONS", { enumerable: true, get: function () { return securityValidation_1.SECURITY_RECOMMENDATIONS; } });
var tokenMintValidator_1 = require("./utils/tokenMintValidator");
Object.defineProperty(exports, "validateTokenMint", { enumerable: true, get: function () { return tokenMintValidator_1.validateTokenMint; } });
Object.defineProperty(exports, "KNOWN_STABLECOINS", { enumerable: true, get: function () { return tokenMintValidator_1.KNOWN_STABLECOINS; } });
var couponHelpers_1 = require("./utils/couponHelpers");
Object.defineProperty(exports, "parseCouponCodes", { enumerable: true, get: function () { return couponHelpers_1.parseCouponCodes; } });
Object.defineProperty(exports, "formatCouponCodes", { enumerable: true, get: function () { return couponHelpers_1.formatCouponCodes; } });
Object.defineProperty(exports, "calculateDiscountPercentage", { enumerable: true, get: function () { return couponHelpers_1.calculateDiscountPercentage; } });
Object.defineProperty(exports, "stackCheckoutCoupons", { enumerable: true, get: function () { return couponHelpers_1.stackCheckoutCoupons; } });
var dateHelpers_1 = require("./utils/dateHelpers");
Object.defineProperty(exports, "formatDate", { enumerable: true, get: function () { return dateHelpers_1.formatDate; } });
Object.defineProperty(exports, "formatDateTime", { enumerable: true, get: function () { return dateHelpers_1.formatDateTime; } });
var utils_1 = require("./utils");
Object.defineProperty(exports, "createWalletPool", { enumerable: true, get: function () { return utils_1.createWalletPool; } });
Object.defineProperty(exports, "WalletPool", { enumerable: true, get: function () { return utils_1.WalletPool; } });
var utils_2 = require("./utils");
Object.defineProperty(exports, "generateCSP", { enumerable: true, get: function () { return utils_2.generateCSP; } });
Object.defineProperty(exports, "generateCSPDirectives", { enumerable: true, get: function () { return utils_2.generateCSPDirectives; } });
Object.defineProperty(exports, "formatCSP", { enumerable: true, get: function () { return utils_2.formatCSP; } });
Object.defineProperty(exports, "RPC_PROVIDERS", { enumerable: true, get: function () { return utils_2.RPC_PROVIDERS; } });
Object.defineProperty(exports, "CSP_PRESETS", { enumerable: true, get: function () { return utils_2.CSP_PRESETS; } });
// ============================================
// INTERNATIONALIZATION (i18n)
// ============================================
var i18n_1 = require("./i18n");
Object.defineProperty(exports, "detectLocale", { enumerable: true, get: function () { return i18n_1.detectLocale; } });
Object.defineProperty(exports, "loadLocale", { enumerable: true, get: function () { return i18n_1.loadLocale; } });
Object.defineProperty(exports, "getAvailableLocales", { enumerable: true, get: function () { return i18n_1.getAvailableLocales; } });
Object.defineProperty(exports, "createTranslator", { enumerable: true, get: function () { return i18n_1.createTranslator; } });
Object.defineProperty(exports, "getLocalizedError", { enumerable: true, get: function () { return i18n_1.getLocalizedError; } });
var locales_1 = require("./i18n/locales");
Object.defineProperty(exports, "normalizeLocale", { enumerable: true, get: function () { return locales_1.normalizeLocale; } });
Object.defineProperty(exports, "getLocaleDirection", { enumerable: true, get: function () { return locales_1.getLocaleDirection; } });
var formatting_1 = require("./i18n/formatting");
Object.defineProperty(exports, "formatCurrencyAmount", { enumerable: true, get: function () { return formatting_1.formatCurrencyAmount; } });
Object.defineProperty(exports, "formatDateOnly", { enumerable: true, get: function () { return formatting_1.formatDateOnly; } });
Object.defineProperty(exports, "formatDateTimeValue", { enumerable: true, get: function () { return formatting_1.formatDateTimeValue; } });
Object.defineProperty(exports, "formatMinorCurrencyAmount", { enumerable: true, get: function () { return formatting_1.formatMinorCurrencyAmount; } });
Object.defineProperty(exports, "formatNumberValue", { enumerable: true, get: function () { return formatting_1.formatNumberValue; } });
Object.defineProperty(exports, "selectPlural", { enumerable: true, get: function () { return formatting_1.selectPlural; } });
// Internationalization
var useCedrosTranslation_1 = require("./i18n/useCedrosTranslation");
Object.defineProperty(exports, "useCedrosTranslation", { enumerable: true, get: function () { return useCedrosTranslation_1.useCedrosTranslation; } });
var useTranslation_1 = require("./i18n/useTranslation");
Object.defineProperty(exports, "useTranslation", { enumerable: true, get: function () { return useTranslation_1.useTranslation; } });
Object.defineProperty(exports, "useLocalizedError", { enumerable: true, get: function () { return useTranslation_1.useLocalizedError; } });
//# sourceMappingURL=index.js.map