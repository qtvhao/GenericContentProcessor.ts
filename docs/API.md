# 📷 Image API Documentation

**Base URL:** `https://http-fotosutokku-kiban-production-80.schnworks.com/`

---

## 🔍 GET `/search` (Deprecated)

**Description:**  
This route is deprecated. Use `/quick-search` or `/get-image` instead.

**Response:**
- `410 Gone`: `"The /search route is deprecated. Please use /quick-search or /get-image."`

---

## ⚡ POST `/quick-search`

**Description:**  
Publishes a search request to Kafka for asynchronous image lookup.

**Request Body (JSON):**
```json
{
  "query": "puppies",          // Required: Search term
  "output": "url" | "image",   // Optional: Response type (default: "html")
  "limit": "10",               // Optional: Max number of results (default: "10")
  "index": "1"                 // Optional: Index of specific image
}
```

**Response:**
- `202 Accepted`: `{ message: "Request accepted", conversationId: "conv-..." }`
- `400 Bad Request`: Missing query
- `500 Internal Server Error`: Kafka publish failed

---

## 🖼️ GET `/get-image`

**Description:**  
Fetch a specific image by search query and index from in-memory cache.

**Query Parameters:**
- `query` (string, required): Search term  
- `output` (must be `"image"`)  
- `index` (string, required): Index of image

**Response:**
- `200 OK`: Returns image (`image/png`)  
- `200 OK`: Returns JSON `{ fileKey }` if content is unavailable  
- `400 Bad Request`: Invalid parameters  
- `404 Not Found`: Image not found

---

## 🖼️ GET `/get-image/:output/:query/:index/image.jpg`

**Description:**  
Path-based version of `/get-image` for accessing JPEG images.

**Path Parameters:**
- `output` (must be `"image"`)  
- `query` (string, URL-encoded)  
- `index` (integer)

**Response:**
- `200 OK`: Returns image (`image/jpeg`)  
- `200 OK`: Returns JSON `{ fileKey }` if content is unavailable  
- `400 Bad Request`: Invalid parameters  
- `404 Not Found`: Image not found

---

## 📊 GET `/image-count/:query`

**Description:**  
Returns the number of cached images for a given query.

**Path Parameters:**
- `query` (string, URL-encoded)

**Response:**
- `200 OK`: `{ query: "puppies", count: 5 }`
