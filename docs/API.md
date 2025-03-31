# Image Search & Retrieval API Documentation

**Base URL:** `https://http-fotosutokku-kiban-production-80.schnworks.com/`

---

## Endpoints

### GET /search *(Deprecated)*

**Description:**  
Legacy route for image search. No longer supported.

**Responses:**
- `410 Gone` – Instructs to use `/quick-search` or `/get-image` instead.

### GET /quick-search

**Description:**  
Initiates an image search request by publishing a message to Kafka. Returns a conversation ID for tracking.

**Query Parameters:**
- `query` (string, required): Search term.
- `output` (string, optional, default=html): Desired output format (html, url, image, etc.).
- `limit` (string, optional, default=10): Max number of results.
- `index` (string, optional): Index of a specific image (used when output=image).

**Responses:**
- `202 Accepted` – Request published successfully.
  
  ```json
  {
    "message": "Request accepted",
    "conversationId": "conv-..."
  }
  ```

- `400 Bad Request` – Missing query parameter.
- `500 Internal Server Error` – Kafka publishing error.

### GET /get-image

**Description:**  
Retrieves a specific image (or fallback fileKey) from stored results.

**Query Parameters:**
- `query` (string, required): Original search term.
- `output` (string, required): Must be "image".
- `index` (string, required): Image index to retrieve.

**Responses:**
- `200 OK` – Returns the image in binary (Content-Type: image/png).
- `200 OK` – Returns `{ fileKey: string }` if image content is missing.
- `400 Bad Request` – Invalid parameters.
- `404 Not Found` – Image not found.

### GET /get-image/:output/:query/:index/image.jpg

**Description:**  
Alternate path-based version of the /get-image endpoint. Returns a JPEG image.

**Path Parameters:**
- `output` (string): Must be "image".
- `query` (string): Encoded search term.
- `index` (string): Index of the image to return.

**Responses:**
- `200 OK` – Image in binary (Content-Type: image/jpeg).
- `200 OK` – Returns `{ fileKey: string }` if image content is missing.
- `400 Bad Request` – Invalid output.
- `404 Not Found` – Image not found.

### GET /image-count/:query

**Description:**  
Returns the number of images stored for a given search query.

**Path Parameters:**
- `query` (string): Encoded search term.

**Responses:**
- `200 OK`
  
  ```json
  {
    "query": "puppies",
    "count": 5
  }
  ```
