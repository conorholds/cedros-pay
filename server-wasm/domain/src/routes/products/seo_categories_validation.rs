use serde_json::Value;

use crate::error::{AppError, AppResult};

use super::SeoCategory;

const MAX_TEXT: usize = 240;
const MAX_URL: usize = 2_048;

pub(super) fn categories(product: &Value) -> AppResult<Vec<SeoCategory>> {
    let mut values = Vec::new();
    for field in ["categoryIds", "categories"] {
        for value in product
            .get(field)
            .and_then(Value::as_array)
            .into_iter()
            .flatten()
        {
            if value.is_string() {
                continue;
            }
            values.push(parse(value)?);
        }
    }
    values.sort_by(|left, right| left.id.cmp(&right.id));
    values.dedup();
    Ok(values)
}

fn parse(value: &Value) -> AppResult<SeoCategory> {
    let object = value
        .as_object()
        .ok_or_else(|| AppError::bad_request("public category must be a string or object"))?;
    let allowed = ["id", "slug", "name", "parentId", "bannerImageUrl"];
    if object.keys().any(|key| !allowed.contains(&key.as_str())) {
        return Err(AppError::bad_request(
            "public category contains unsupported fields",
        ));
    }
    let text = |field: &str| object.get(field).and_then(Value::as_str);
    let id = required(text("id").unwrap_or_default(), "category id")?;
    let slug = required(text("slug").unwrap_or_default(), "category slug")?;
    validate_slug(&slug)?;
    let name = required(text("name").unwrap_or_default(), "category name")?;
    let parent_id = optional(text("parentId"), "category parentId")?;
    let banner_image_url = optional(text("bannerImageUrl"), "category bannerImageUrl")?;
    if let Some(url) = &banner_image_url {
        validate_banner(url)?;
    }
    Ok(SeoCategory {
        id,
        slug,
        name,
        parent_id,
        banner_image_url,
    })
}

fn required(value: &str, field: &str) -> AppResult<String> {
    if value.trim().is_empty() || value.len() > MAX_TEXT || value.chars().any(char::is_control) {
        return Err(AppError::bad_request(format!(
            "{field} must be nonblank and at most {MAX_TEXT} characters"
        )));
    }
    Ok(value.into())
}

fn optional(value: Option<&str>, field: &str) -> AppResult<Option<String>> {
    value.map(|value| required(value, field)).transpose()
}

fn validate_slug(value: &str) -> AppResult<()> {
    let valid = !value.is_empty()
        && value.len() <= MAX_TEXT
        && !value.starts_with('-')
        && !value.ends_with('-')
        && value
            .bytes()
            .all(|byte| byte.is_ascii_lowercase() || byte.is_ascii_digit() || byte == b'-');
    valid.then_some(()).ok_or_else(|| {
        AppError::bad_request(
            "category slug must be lowercase letters, numbers, and interior dashes only",
        )
    })
}

fn validate_banner(value: &str) -> AppResult<()> {
    let safe_bytes =
        value.len() <= MAX_URL && !value.contains('\\') && !value.chars().any(char::is_control);
    let same_origin = value.starts_with('/') && !value.starts_with("//");
    let absolute = ["http://", "https://"].iter().any(|prefix| {
        value
            .strip_prefix(prefix)
            .is_some_and(|authority| !authority.is_empty() && !authority.starts_with('/'))
    });
    if safe_bytes && (same_origin || absolute) {
        Ok(())
    } else {
        Err(AppError::bad_request(
            "category bannerImageUrl must be http(s) or a same-origin root path",
        ))
    }
}
