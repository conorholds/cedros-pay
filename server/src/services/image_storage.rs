//! Image storage service for S3-compatible object storage.
//!
//! Handles image upload (validate, resize, WebP conversion), deletion,
//! and S3 client management with TTL-based caching.

use std::io::Cursor;
use std::sync::Arc;
use std::time::{Duration, Instant};

use aws_credential_types::Credentials;
use aws_sdk_s3::primitives::ByteStream;
use aws_sdk_s3::Client as S3Client;
use image::imageops::FilterType;
use image::DynamicImage;
use parking_lot::Mutex;
use serde_json::Value as JsonValue;
use thiserror::Error;

use crate::config::db::repository::PostgresConfigRepository;

/// Maximum image dimension (width or height) before resize.
const MAX_IMAGE_DIMENSION: u32 = 2048;

/// Thumbnail max dimension.
const THUMBNAIL_DIMENSION: u32 = 400;

/// S3 client cache TTL.
const CLIENT_CACHE_TTL: Duration = Duration::from_secs(300);

/// Allowed image MIME magic-byte prefixes.
const JPEG_MAGIC: &[u8] = &[0xFF, 0xD8, 0xFF];
const PNG_MAGIC: &[u8] = &[0x89, 0x50, 0x4E, 0x47];
const GIF_MAGIC: &[u8] = &[0x47, 0x49, 0x46];
const WEBP_MAGIC: &[u8] = b"RIFF";

#[derive(Debug, Error)]
pub enum ImageStorageError {
    #[error("storage not configured: {0}")]
    NotConfigured(String),

    #[error("invalid image: {0}")]
    InvalidImage(String),

    #[error("image too large: {size} bytes exceeds {max} byte limit")]
    TooLarge { size: usize, max: usize },

    #[error("S3 error: {0}")]
    S3(String),

    #[error("config error: {0}")]
    Config(String),

    #[error("image processing error: {0}")]
    Processing(String),
}

/// URLs returned after a successful upload.
#[derive(Debug, Clone, serde::Serialize)]
pub struct UploadResult {
    pub url: String,
    pub thumb_url: String,
}

/// Cached S3 client with resolved config.
struct CachedClient {
    client: S3Client,
    bucket: String,
    cdn_url: Option<String>,
    created_at: Instant,
}

/// Image storage service backed by S3-compatible storage.
pub struct ImageStorageService {
    config_repo: Arc<PostgresConfigRepository>,
    cache: Mutex<Option<(String, CachedClient)>>,
}

impl ImageStorageService {
    pub fn new(config_repo: Arc<PostgresConfigRepository>) -> Self {
        Self {
            config_repo,
            cache: Mutex::new(None),
        }
    }

    /// Upload an image: validate → decode → resize → WebP → upload to S3.
    ///
    /// Returns URLs for the full-size and thumbnail images.
    pub async fn upload_image(
        &self,
        tenant_id: &str,
        data: &[u8],
        max_size: usize,
    ) -> Result<UploadResult, ImageStorageError> {
        // 1. Validate size
        if data.len() > max_size {
            return Err(ImageStorageError::TooLarge {
                size: data.len(),
                max: max_size,
            });
        }

        // 2. Validate magic bytes
        if !is_valid_image_magic(data) {
            return Err(ImageStorageError::InvalidImage(
                "unsupported image format (expected JPEG, PNG, GIF, or WebP)".into(),
            ));
        }

        // 3. Decode image
        let img = image::load_from_memory(data)
            .map_err(|e| ImageStorageError::InvalidImage(e.to_string()))?;

        // 4. Resize if too large
        let full = resize_if_needed(&img, MAX_IMAGE_DIMENSION);
        let thumb = resize_if_needed(&img, THUMBNAIL_DIMENSION);

        // 5. Encode to WebP
        let full_bytes = encode_webp(&full)?;
        let thumb_bytes = encode_webp(&thumb)?;

        // 6. Generate keys
        let id = uuid::Uuid::new_v4();
        let full_key = format!("{}/images/{}.webp", tenant_id, id);
        let thumb_key = format!("{}/images/{}_thumb.webp", tenant_id, id);

        // 7. Upload to S3
        let (client, bucket, cdn_url) = self.get_client(tenant_id).await?;

        upload_object(&client, &bucket, &full_key, full_bytes).await?;
        upload_object(&client, &bucket, &thumb_key, thumb_bytes).await?;

        // 8. Build URLs
        let base = cdn_url.unwrap_or_else(|| {
            // Construct from S3 endpoint
            format!("https://{}.s3.amazonaws.com", bucket)
        });
        let base = base.trim_end_matches('/');
        let url = format!("{}/{}", base, full_key);
        let thumb_url = format!("{}/{}", base, thumb_key);

        Ok(UploadResult { url, thumb_url })
    }

    /// Delete an image (and its thumbnail) from S3.
    pub async fn delete_image(
        &self,
        tenant_id: &str,
        image_url: &str,
    ) -> Result<(), ImageStorageError> {
        let (client, bucket, cdn_url) = self.get_client(tenant_id).await?;

        let base = cdn_url
            .as_deref()
            .unwrap_or("")
            .trim_end_matches('/');

        // Extract object key from URL
        let key = extract_object_key(image_url, base, &bucket)?;

        // Delete full image
        client
            .delete_object()
            .bucket(&bucket)
            .key(&key)
            .send()
            .await
            .map_err(|e| ImageStorageError::S3(e.to_string()))?;

        // Try to delete thumbnail (best-effort)
        if let Some(thumb_key) = key.strip_suffix(".webp") {
            let thumb_key = format!("{}_thumb.webp", thumb_key);
            let _ = client
                .delete_object()
                .bucket(&bucket)
                .key(&thumb_key)
                .send()
                .await;
        }

        Ok(())
    }

    /// Get or create an S3 client for the tenant.
    async fn get_client(
        &self,
        tenant_id: &str,
    ) -> Result<(S3Client, String, Option<String>), ImageStorageError> {
        // Check cache
        {
            let cache = self.cache.lock();
            if let Some((cached_tenant, cached)) = cache.as_ref() {
                if cached_tenant == tenant_id && cached.created_at.elapsed() < CLIENT_CACHE_TTL {
                    return Ok((
                        cached.client.clone(),
                        cached.bucket.clone(),
                        cached.cdn_url.clone(),
                    ));
                }
            }
        }

        // Load config from repo (with decryption)
        let entries = self
            .config_repo
            .get_config(tenant_id, "storage")
            .await
            .map_err(|e| ImageStorageError::Config(e.to_string()))?;

        let mut config: std::collections::HashMap<String, String> =
            std::collections::HashMap::new();

        for entry in &entries {
            let decrypted = self
                .config_repo
                .decrypt_entry(entry)
                .await
                .map_err(|e| ImageStorageError::Config(e.to_string()))?;

            if let Some(s) = decrypted.as_str() {
                config.insert(entry.config_key.clone(), s.to_string());
            } else if let JsonValue::Object(obj) = &decrypted {
                // Flatten single-key object entries
                for (k, v) in obj {
                    if let Some(s) = v.as_str() {
                        config.insert(k.clone(), s.to_string());
                    }
                }
            }
        }

        let bucket = config
            .get("bucket_name")
            .filter(|s| !s.is_empty())
            .cloned()
            .ok_or_else(|| {
                ImageStorageError::NotConfigured("bucket_name not set".into())
            })?;

        let access_key = config.get("access_key_id").filter(|s| !s.is_empty()).cloned()
            .ok_or_else(|| {
                ImageStorageError::NotConfigured("access_key_id not set".into())
            })?;

        let secret_key = config.get("secret_access_key").filter(|s| !s.is_empty()).cloned()
            .ok_or_else(|| {
                ImageStorageError::NotConfigured("secret_access_key not set".into())
            })?;

        let region = config
            .get("region")
            .filter(|s| !s.is_empty())
            .cloned()
            .unwrap_or_else(|| "us-east-1".to_string());

        let endpoint_url = config.get("endpoint_url").filter(|s| !s.is_empty()).cloned();
        let cdn_url = config.get("cdn_url").filter(|s| !s.is_empty()).cloned();

        // Build S3 client
        let credentials = Credentials::new(access_key, secret_key, None, None, "cedros-storage");

        let mut s3_config = aws_sdk_s3::Config::builder()
            .region(aws_sdk_s3::config::Region::new(region))
            .credentials_provider(credentials)
            .behavior_version_latest();

        if let Some(ep) = &endpoint_url {
            s3_config = s3_config
                .endpoint_url(ep)
                .force_path_style(false);
        }

        let client = S3Client::from_conf(s3_config.build());

        // Cache the client
        {
            let mut cache = self.cache.lock();
            *cache = Some((
                tenant_id.to_string(),
                CachedClient {
                    client: client.clone(),
                    bucket: bucket.clone(),
                    cdn_url: cdn_url.clone(),
                    created_at: Instant::now(),
                },
            ));
        }

        Ok((client, bucket, cdn_url))
    }
}

fn is_valid_image_magic(data: &[u8]) -> bool {
    data.starts_with(JPEG_MAGIC)
        || data.starts_with(PNG_MAGIC)
        || data.starts_with(GIF_MAGIC)
        || (data.len() >= 12 && data.starts_with(WEBP_MAGIC) && &data[8..12] == b"WEBP")
}

fn resize_if_needed(img: &DynamicImage, max_dim: u32) -> DynamicImage {
    let (w, h) = (img.width(), img.height());
    if w <= max_dim && h <= max_dim {
        return img.clone();
    }
    img.resize(max_dim, max_dim, FilterType::Lanczos3)
}

fn encode_webp(img: &DynamicImage) -> Result<Vec<u8>, ImageStorageError> {
    let rgba = img.to_rgba8();
    let mut buf = Cursor::new(Vec::new());
    let encoder = image::codecs::webp::WebPEncoder::new_lossless(&mut buf);
    encoder
        .encode(
            rgba.as_raw(),
            rgba.width(),
            rgba.height(),
            image::ExtendedColorType::Rgba8,
        )
        .map_err(|e: image::ImageError| ImageStorageError::Processing(e.to_string()))?;
    Ok(buf.into_inner())
}

async fn upload_object(
    client: &S3Client,
    bucket: &str,
    key: &str,
    data: Vec<u8>,
) -> Result<(), ImageStorageError> {
    client
        .put_object()
        .bucket(bucket)
        .key(key)
        .body(ByteStream::from(data))
        .content_type("image/webp")
        .cache_control("public, max-age=31536000, immutable")
        .send()
        .await
        .map_err(|e| ImageStorageError::S3(e.to_string()))?;
    Ok(())
}

fn extract_object_key(url: &str, cdn_base: &str, bucket: &str) -> Result<String, ImageStorageError> {
    // Try CDN URL prefix
    if !cdn_base.is_empty() {
        if let Some(key) = url.strip_prefix(cdn_base) {
            return Ok(key.trim_start_matches('/').to_string());
        }
    }

    // Try S3-style URL: https://bucket.s3.amazonaws.com/key
    let s3_prefix = format!("https://{}.s3.amazonaws.com/", bucket);
    if let Some(key) = url.strip_prefix(&s3_prefix) {
        return Ok(key.to_string());
    }

    // Try to extract path after domain
    if let Ok(parsed) = url::Url::parse(url) {
        let path = parsed.path().trim_start_matches('/');
        if !path.is_empty() {
            return Ok(path.to_string());
        }
    }

    Err(ImageStorageError::InvalidImage(format!(
        "cannot extract object key from URL: {}",
        url
    )))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_is_valid_image_magic() {
        assert!(is_valid_image_magic(&[0xFF, 0xD8, 0xFF, 0xE0])); // JPEG
        assert!(is_valid_image_magic(&[0x89, 0x50, 0x4E, 0x47])); // PNG
        assert!(is_valid_image_magic(b"GIF89a")); // GIF
        assert!(is_valid_image_magic(b"RIFF\x00\x00\x00\x00WEBP")); // WebP
        assert!(!is_valid_image_magic(b"not an image"));
        assert!(!is_valid_image_magic(&[]));
    }

    #[test]
    fn test_extract_object_key_cdn() {
        let key = extract_object_key(
            "https://cdn.example.com/tenant1/images/abc.webp",
            "https://cdn.example.com",
            "my-bucket",
        )
        .unwrap();
        assert_eq!(key, "tenant1/images/abc.webp");
    }

    #[test]
    fn test_extract_object_key_s3() {
        let key = extract_object_key(
            "https://my-bucket.s3.amazonaws.com/tenant1/images/abc.webp",
            "",
            "my-bucket",
        )
        .unwrap();
        assert_eq!(key, "tenant1/images/abc.webp");
    }
}
