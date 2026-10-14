// Exact Pay registrations from Data 02e4b247d7.
use crate::reqresp::RouteSpec;
pub const ROUTES: &[RouteSpec] = &[
    RouteSpec {
        route_id: "cedros-pay:capacity-binding-read-v1",
        method: "POST",
        path: "/capacity/v1/binding/read",
    },
    RouteSpec {
        route_id: "cedros-pay:capacity-offers-http-v1",
        method: "POST",
        path: "/paywall/v1/capacity/offers",
    },
    RouteSpec {
        route_id: "cedros-pay:capacity-preview-http-v1",
        method: "POST",
        path: "/paywall/v1/capacity/preview",
    },
    RouteSpec {
        route_id: "cedros-pay:capacity-preview-read-http-v1",
        method: "GET",
        path: "/paywall/v1/capacity/previews/{quoteId}",
    },
    RouteSpec {
        route_id: "cedros-pay:capacity-purchase-http-v1",
        method: "POST",
        path: "/paywall/v1/capacity/purchases",
    },
    RouteSpec {
        route_id: "cedros-pay:capacity-purchase-read-http-v1",
        method: "GET",
        path: "/paywall/v1/capacity/purchases/{purchaseId}",
    },
    RouteSpec {
        route_id: "cedros-pay:capacity-grants-snapshot-http-v1",
        method: "POST",
        path: "/subscriptions/v1/capacity/grants/snapshot",
    },
    RouteSpec {
        route_id: "cedros-pay:capacity-billing-action-http-v1",
        method: "POST",
        path: "/paywall/v1/capacity/purchases/{purchaseId}/actions",
    },
    RouteSpec {
        route_id: "cedros-pay:capacity-cancel-http-v1",
        method: "POST",
        path: "/paywall/v1/capacity/purchases/{purchaseId}/cancel",
    },
    RouteSpec {
        route_id: "cedros-pay:capacity-offers-v1",
        method: "POST",
        path: "/capacity/v1/offers",
    },
    RouteSpec {
        route_id: "cedros-pay:capacity-preview-v1",
        method: "POST",
        path: "/capacity/v1/preview",
    },
    RouteSpec {
        route_id: "cedros-pay:capacity-preview-read-v1",
        method: "POST",
        path: "/capacity/v1/preview/read",
    },
    RouteSpec {
        route_id: "cedros-pay:capacity-purchase-v1",
        method: "POST",
        path: "/capacity/v1/purchase",
    },
    RouteSpec {
        route_id: "cedros-pay:capacity-purchase-read-v1",
        method: "POST",
        path: "/capacity/v1/purchase/read",
    },
    RouteSpec {
        route_id: "cedros-pay:capacity-grants-snapshot-v1",
        method: "POST",
        path: "/capacity/v1/grants/snapshot",
    },
    RouteSpec {
        route_id: "cedros-pay:capacity-billing-action-v1",
        method: "POST",
        path: "/capacity/v1/billing/action",
    },
    RouteSpec {
        route_id: "cedros-pay:capacity-cancel-v1",
        method: "POST",
        path: "/capacity/v1/cancel",
    },
];
