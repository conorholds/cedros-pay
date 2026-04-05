# Cedros Pay Cross-Channel Setup Guide

This guide is for merchants who want one Cedros product catalog that can sell:

- on the web with Stripe
- in iOS apps distributed through the Apple App Store
- in Android apps distributed through Google Play

The goal is:

1. Create the product once in Cedros Admin.
2. Configure channel credentials once in Cedros Admin.
3. Complete the manual console setup in Stripe, App Store Connect, and Google Play Console.
4. Let Cedros packages select the right payment rail at runtime.

## What Cedros automates

- Product catalog storage and store-policy classification
- Store-aware payment method resolution at runtime
- Stripe Checkout and Stripe mobile subscription sessions
- Apple purchase verification and App Store Server Notification handling
- Google purchase verification, server-side acknowledgment, and RTDN handling
- React Native product-catalog hydration from `GET /paywall/v1/products`

## What Cedros cannot automate for you

- Creating products in Stripe, App Store Connect, or Google Play Console
- Generating Apple or Google credentials
- Enrolling in Apple or Google exception programs
- Pointing external consoles at your Cedros webhook / notification URLs
- Running real test purchases in each channel before launch

## Step 1: Create the product in Cedros Admin

In `Admin → Products`:

1. Create the normal commerce record:
   - product id
   - name
   - description
   - price
   - fulfillment
2. Set the **Store policy classification**:
   - `digital_in_app` for digital functionality used inside the app
   - `physical_goods` for shipped items
   - `real_world_service` for services delivered outside the app
   - `reader_content` only if the app is actually operating under the relevant reader rules
   - `other` only when you intend to review policy manually
3. If the product is sold in app-store builds, set the **Store-managed product kind**:
   - `consumable`
   - `non_consumable`
   - `auto_renewable_subscription`
4. Add the Apple product id and Google Play product id.
5. For Google subscriptions, also add:
   - package name
   - base plan id
   - optional offer id

## Step 2: Configure payment channels in Cedros Admin

In `Admin → Payment Options`:

### Stripe

Set:

- publishable key
- secret key
- webhook signing secret
- allowed redirect schemes if your app uses custom Stripe deep links

### App Stores

Set Apple:

- issuer id
- key id
- private key
- bundle id

Set Google:

- service account email
- private key
- package name
- push service account email
- push audience

Use the readiness checklist in the dashboard to verify Cedros sees these values.

## Step 3: Complete the Stripe manual setup

In Stripe:

1. Create the products / prices that correspond to your Cedros products.
2. Create a webhook endpoint pointing to your Cedros server:
   - `https://<your-server>/webhook/stripe`
3. Subscribe the endpoint to the Cedros-required events.
4. If your mobile app returns from Stripe using a custom URI scheme, add that scheme to Cedros `stripe.allowed_redirect_schemes`.
5. Run at least one web test checkout and one mobile redirect or PaymentSheet subscription flow.

Official Stripe references:

- Webhooks: https://docs.stripe.com/webhooks
- React Native subscriptions: https://docs.stripe.com/billing/subscriptions/build-subscriptions?payment-ui=mobile&platform=react-native
- PaymentSheet: https://docs.stripe.com/payments/mobile/payment-sheet

## Step 4: Complete the Apple manual setup

In App Store Connect:

1. Create the matching in-app purchase products or subscriptions.
2. Generate an App Store Server API key and copy:
   - issuer id
   - key id
   - private key
3. Configure App Store Server Notifications to your tenant-scoped Cedros URL:
   - `https://<your-server>/paywall/v1/native-store/apple/notifications`
4. Confirm your app bundle id matches the Cedros config.
5. Run sandbox purchases before shipping.

If you use any Apple exception path such as reader-account links or U.S. external purchase link behavior, do not enable those flags in the app until Apple has approved the relevant entitlement or storefront allowance.

Official Apple references:

- App Store Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
- App Store Server API: https://developer.apple.com/documentation/appstoreserverapi
- App Store Server Notifications: https://developer.apple.com/documentation/appstoreservernotifications
- Testing In-App Purchases: https://developer.apple.com/help/app-store-connect/test-in-app-purchases/overview-of-testing-in-sandbox

## Step 5: Complete the Google Play manual setup

In Google Play Console and Google Cloud:

1. Create the matching one-time products or subscriptions.
2. For subscriptions, create the correct base plan and any offers.
3. Create or select a Google Cloud service account with Android Publisher API access.
4. Grant that service account access in Play Console.
5. Configure Real-time developer notifications and Pub/Sub push delivery to your tenant-scoped Cedros URL:
   - `https://<your-server>/paywall/v1/native-store/google/notifications`
6. Set the push identity and audience in Cedros so the notification signature is verified.
7. Run internal test-track purchases before shipping.

If you use User Choice Billing, Alternative Billing Only, or External Offers, only enable those program flags in the app after Google has approved the app for the relevant storefront program.

Official Google references:

- Play Billing overview: https://developer.android.com/google/play/billing
- Purchase integration: https://developer.android.com/google/play/billing/integrate
- Manage purchases: https://developer.android.com/google/play/billing/manage-purchases
- RTDN reference: https://developer.android.com/google/play/billing/rtdn-reference

## Step 6: Configure the app package once

In your React Native app:

1. Point `CedrosProvider` at your Cedros server.
2. Set the build’s `distributionChannel` explicitly when you know it.
3. Keep `paymentPolicy.productCatalogSync.enabled` on unless you have a reason to override the catalog manually.
4. Set `stripeReturnUrl` when you use Stripe PaymentSheet or app-return flows.

Cedros will then merge the server catalog with any manual overrides and use the result for runtime policy resolution.

## Final launch checklist

You are ready to ship only when all of the following are true:

- Cedros Admin shows the product with the correct store policy classification.
- Every digital in-app product has Apple and Google mapping where relevant.
- Stripe keys and webhook secret are configured.
- Apple App Store credentials are configured.
- Google Play credentials and RTDN verification fields are configured.
- Stripe webhook delivery is green.
- Apple notifications reach Cedros successfully.
- Google RTDN reaches Cedros successfully.
- Web purchase tests pass.
- Apple sandbox or TestFlight purchase tests pass.
- Google internal-test purchase flows pass.
- Any Apple or Google exception-program flags are enabled only where actually approved.
