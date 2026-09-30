# Image Proxy Endpoint (`/api/proxy/image`)

## Overview & Purpose
Images hosted on the 1688 CDN (`cbu01.alicdn.com`) employ hotlink protection. When browsers load image URLs directly via HTML `<img src="...">` tags, they send a `Referer` header matching the origin of the host application. The CDN rejects cross-origin requests bearing a non-1688 `Referer` header with `net::ERR_FAILED`.

To bypass this restriction, `cf-engine` provides a backend image proxy route (`GET /api/proxy/image`) that fetches images server-side without sending a `Referer` header and streams the image binary back to the frontend with caching headers.

## Allowlist Security Controls
To prevent SSRF and open proxy abuse, the endpoint validates requested URLs against an explicit domain allowlist:
- `*.alicdn.com` / `alicdn.com`
- `*.1688.com` / `1688.com`
- `*.taobao.com` / `taobao.com`

Any request targeting hostnames outside this allowlist will be rejected with `HTTP 403 Forbidden`.

## Endpoint Contract

`GET /api/proxy/image?url=<URL_ENCODED_IMAGE_URL>`

### Parameters
- `url` (Query parameter, required): URL-encoded string representing the absolute image URL on an allowed domain.

### Responses & Error Codes

| Status Code | Error Code | Description |
|---|---|---|
| **200 OK** | - | Image stream / binary returned with `Content-Type: image/*` |
| **400 Bad Request** | `MISSING_URL` / `INVALID_URL` / `INVALID_PROTOCOL` | The `url` parameter was missing, empty, malformed, or using an unsupported protocol. |
| **403 Forbidden** | `DOMAIN_NOT_ALLOWED` | The target hostname is not in the allowed domain list. |
| **413 Payload Too Large** | `PAYLOAD_TOO_LARGE` | The upstream image size exceeds the maximum limit of 10 MB. |
| **415 Unsupported Media Type** | `UNSUPPORTED_MEDIA_TYPE` | The upstream response `Content-Type` header does not start with `image/`. |
| **502 Bad Gateway** | `UPSTREAM_FETCH_FAILED` / `UPSTREAM_ERROR` | Upstream CDN fetch timed out (10s), suffered a network error, or returned a non-200 HTTP status code. |

### Response Headers
- `Content-Type`: Upstream image MIME type (e.g. `image/jpeg`, `image/png`, `image/webp`).
- `Cache-Control`: `public, max-age=86400, immutable` (24-hour browser and CDN caching).
- `Access-Control-Allow-Origin`: `*` (Allows cross-origin image embedding).

## Usage Example

### Frontend Integration
```tsx
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function getProxiedImageUrl(imageUrl: string): string {
  if (!imageUrl) return '';
  if (imageUrl.startsWith('data:') || imageUrl.startsWith('/')) return imageUrl;
  return `${API_BASE_URL}/api/proxy/image?url=${encodeURIComponent(imageUrl)}`;
}

// In React Component:
<img src={getProxiedImageUrl(product.images[0])} alt={product.title} />
```
