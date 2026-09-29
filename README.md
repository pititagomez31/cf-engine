# cf-engine

`cf-engine` is an independent experimental backend API for extracting and normalizing 1688 product data using the Apify Actor `zen-studio~1688-wholesale-scraper`.

## Tech Stack
- **Runtime**: Node.js 22+ (ES modules)
- **Framework**: Fastify v5
- **Validation**: Zod
- **HTTP client**: apify-client v2
- **Env**: dotenv

## Project Structure
```
cf-engine/
├── .gitignore
├── README.md
├── shared/
│   └── schemas/
│       └── product.schema.js
└── backend/
    ├── .env.example
    ├── package.json
    └── src/
        ├── server.js
        ├── routes/
        │   └── products.js
        ├── services/
        │   └── apify1688.js
        └── utils/
            └── extractOfferId.js
```

## Getting Started

### 1. Prerequisites
- Node.js v22 or higher
- An Apify account and API token

### 2. Installation
Navigate to the `backend` directory and install dependencies:
```bash
cd backend
npm install
```

### 3. Environment Configuration
Copy `.env.example` to `.env` in the `backend` folder:
```bash
cp .env.example .env
```
Fill in your `APIFY_API_TOKEN` and optional configuration variables.

### 4. Running the Server

#### Development Mode (with auto-reload)
```bash
npm run dev
```

#### Production Mode
```bash
npm start
```

The server runs on `http://localhost:3001` by default.

### 5. Running Tests
```bash
npm test
```

## API Endpoints

### GET `/api/health`
Health check endpoint.

**Response (200 OK):**
```json
{
  "status": "ok"
}
```

### POST `/api/1688/product`
Scrapes and normalizes product information from a 1688 product URL.

**Request Body:**
```json
{
  "url": "https://detail.1688.com/offer/123456789.html"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "product": {
    "id": "123456789",
    "title": "Product Title",
    "images": ["https://..."],
    "supplier": {
      "name": "Supplier Name",
      "location": "Location"
    },
    "variants": [
      {
        "sku": "SKU123",
        "price": 12.5,
        "stock": 100
      }
    ],
    "pricing": {
      "min": 12.5,
      "max": 18.0,
      "currency": "CNY",
      "tiers": []
    },
    "inventory": {
      "total": 100,
      "available": true
    },
    "logistics": {
      "weight_kg": null,
      "origin": "CN"
    }
  },
  "meta": {
    "fetched_at": "2025-01-01T00:00:00.000Z",
    "provider": "apify:zen-studio",
    "version": "1.0"
  }
}
```

**Error Responses:**
- `400 Bad Request`: `{ "error": "MISSING_URL" | "INVALID_1688_URL" | "OFFER_ID_NOT_FOUND" }`
- `502 Bad Gateway`: `{ "error": "APIFY_ERROR", "details": "..." }`
- `500 Internal Server Error`: `{ "error": "NORMALIZATION_ERROR" }`
