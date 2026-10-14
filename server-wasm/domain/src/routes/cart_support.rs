/// Extract the `{cartId}` path segment from `/paywall/v1/cart/{cartId}` (and the
/// longer `/paywall/v1/cart/{cartId}/credits/authorize`). The host mounts the route
/// under an extension prefix, so match the first segment after the cart marker
/// (consistent with the admin routes' `path_id`).
pub(crate) fn cart_id_from_path(path: &str) -> Option<&str> {
    const MARKER: &str = "/paywall/v1/cart/";
    let start = path.find(MARKER)? + MARKER.len();
    let id = path[start..].split('/').next().unwrap_or("");
    (!id.is_empty()).then_some(id)
}

/// Cart id format guard (`cart_` + 32 lowercase/upper hex).
/// Rejects malformed ids before a DB read.
pub(crate) fn is_valid_cart_id(cart_id: &str) -> bool {
    cart_id.len() == 37
        && cart_id.starts_with("cart_")
        && cart_id[5..].bytes().all(|b| b.is_ascii_hexdigit())
}
