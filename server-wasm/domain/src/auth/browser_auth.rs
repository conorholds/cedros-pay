use crate::reqresp::RouteRequest;

const LOGIN_ACCESS_COOKIE: &str = "cedros_access";

pub(super) fn credential_present(req: &RouteRequest) -> bool {
    req.bearer_token().is_some()
        || req
            .header("cookie")
            .and_then(|header| cookie_value(header, LOGIN_ACCESS_COOKIE))
            .is_some()
}

pub(crate) fn buyer_token<'a>(req: &'a RouteRequest, base_url: &str) -> Option<&'a str> {
    if let Some(token) = req
        .bearer_token()
        .map(str::trim)
        .filter(|token| !token.is_empty())
    {
        return Some(token);
    }
    let expected_origin = base_url.trim().trim_end_matches('/');
    // Same-origin browser GETs normally omit Origin. Accept their exact-site
    // Referer for read-only discount lookup; writes still require Origin.
    let same_origin = match req.header("origin") {
        Some(origin) => origin.trim().trim_end_matches('/') == expected_origin,
        None if req.method == "GET" => req.header("referer").is_some_and(|referer| {
            referer
                .strip_prefix(expected_origin)
                .is_some_and(|path| path.starts_with('/'))
        }),
        None => false,
    };
    if !same_origin {
        return None;
    }
    cookie_value(req.header("cookie")?, LOGIN_ACCESS_COOKIE)
}

fn cookie_value<'a>(header: &'a str, name: &str) -> Option<&'a str> {
    header.split(';').find_map(|part| {
        let (key, value) = part.trim().split_once('=')?;
        (key == name)
            .then_some(value.trim())
            .filter(|value| !value.is_empty())
    })
}

#[cfg(test)]
mod tests {
    use super::super::{verify_buyer, SETTING_LOGIN_BASE_URL};
    use crate::fake::FakeSeams;
    use crate::reqresp::RouteRequest;

    fn configured() -> FakeSeams {
        let seams = FakeSeams::new();
        seams.set_setting(SETTING_LOGIN_BASE_URL, "https://site.example/");
        seams
    }

    #[test]
    fn same_origin_browser_action_accepts_the_site_wide_login_cookie() {
        let seams = configured();
        seams.push_http_response(200, r#"{"user":{"id":"cookie-user"}}"#);
        let request = RouteRequest {
            route_id: "cedros-pay:program-activate".into(),
            method: "POST".into(),
            path: "/programs/v1/activate".into(),
            headers: vec![
                ("origin".into(), "https://site.example".into()),
                (
                    "cookie".into(),
                    "theme=dark; cedros_access=cookie-session; cedros_refresh=private".into(),
                ),
            ],
            ..Default::default()
        };

        assert_eq!(
            verify_buyer(&seams, &request).unwrap().user_id,
            "cookie-user"
        );
        let headers = seams.http_requests.borrow()[0]["headers"]
            .as_array()
            .unwrap()
            .clone();
        assert!(headers
            .iter()
            .any(|header| header[0] == "authorization" && header[1] == "Bearer cookie-session"));
    }

    #[test]
    fn browser_cookie_is_rejected_without_an_exact_same_origin() {
        let seams = configured();
        for origin in [
            None,
            Some("https://attacker.example"),
            Some("https://site.example.evil"),
        ] {
            let mut headers = vec![("cookie".into(), "cedros_access=cookie-session".into())];
            if let Some(origin) = origin {
                headers.push(("origin".into(), origin.into()));
            }
            let request = RouteRequest {
                route_id: "cedros-pay:program-activate".into(),
                method: "POST".into(),
                path: "/programs/v1/activate".into(),
                headers,
                ..Default::default()
            };
            assert_eq!(verify_buyer(&seams, &request).unwrap_err().status, 401);
        }
        assert!(seams.http_requests.borrow().is_empty());
    }
}
