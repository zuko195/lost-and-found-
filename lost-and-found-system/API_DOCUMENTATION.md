# API Documentation

Base URL: `http://localhost:3000/api`

## Endpoints

### Health Check
```
GET /api/health
```

**Response:**
```json
{
  "status": "OK",
  "message": "Server is running"
}
```

---

### Get All Lost Items
```
GET /api/lost-items
```

**Query Parameters:**
- `status` (optional): Filter by status (active, found, cancelled)
- `category` (optional): Filter by category
- `search` (optional): Search in item name or description

**Example:**
```
GET /api/lost-items?status=active&category=Electronics
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "item_name": "iPhone 12",
      "category": "Electronics",
      "description": "Black iPhone 12 with cracked screen",
      "date_lost": "2024-02-01",
      "location_lost": "Library",
      "student_name": "John Doe",
      "contact_number": "1234567890",
      "email": "john@example.com",
      "student_id": "JEC001",
      "status": "active",
      "created_at": "2024-02-01 10:30:00",
      "updated_at": "2024-02-01 10:30:00"
    }
  ]
}
```

---

### Get Single Lost Item
```
GET /api/lost-items/:id
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "item_name": "iPhone 12",
    ...
  }
}
```

---

### Create Lost Item Report
```
POST /api/lost-items
```

**Request Body:**
```json
{
  "item_name": "iPhone 12",
  "category": "Electronics",
  "description": "Black iPhone 12 with cracked screen",
  "date_lost": "2024-02-01",
  "location_lost": "Library",
  "student_name": "John Doe",
  "contact_number": "1234567890",
  "email": "john@example.com",
  "student_id": "JEC001"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Lost item reported successfully",
  "id": 1
}
```

---

### Update Lost Item Status
```
PUT /api/lost-items/:id/status
```

**Request Body:**
```json
{
  "status": "found"
}
```

**Valid Statuses:** active, found, cancelled

**Response:**
```json
{
  "success": true,
  "message": "Status updated successfully"
}
```

---

### Get All Found Items
```
GET /api/found-items
```

**Query Parameters:** Same as lost items

**Response:** Similar structure to lost items

---

### Get Single Found Item
```
GET /api/found-items/:id
```

---

### Create Found Item Report
```
POST /api/found-items
```

**Request Body:**
```json
{
  "item_name": "Water Bottle",
  "category": "Other",
  "description": "Blue water bottle with stickers",
  "date_found": "2024-02-01",
  "location_found": "Cafeteria",
  "finder_name": "Jane Smith",
  "contact_number": "0987654321",
  "email": "jane@example.com",
  "student_id": "JEC002",
  "image_url": "https://example.com/image.jpg"
}
```

---

### Create Match Request
```
POST /api/match-requests
```

**Request Body:**
```json
{
  "lost_item_id": 1,
  "found_item_id": 5,
  "claimer_name": "John Doe",
  "claimer_contact": "1234567890",
  "claimer_email": "john@example.com",
  "notes": "This is my lost item"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Match request submitted successfully",
  "id": 1
}
```

---

### Get Statistics
```
GET /api/statistics
```

**Response:**
```json
{
  "success": true,
  "data": {
    "activeLostItems": 15,
    "unclaimedFoundItems": 8,
    "pendingMatches": 3
  }
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Error message here"
}
```

**HTTP Status Codes:**
- 200: Success
- 400: Bad Request (validation error)
- 404: Not Found
- 500: Internal Server Error

---

## Categories

Valid categories for items:
- Electronics
- Books & Notes
- Stationery
- ID Cards
- Bags & Wallets
- Clothing
- Keys
- Other

---

## Locations

Campus locations:
- Main Building
- Library
- Cafeteria
- Sports Complex
- Hostel
- Parking Area
- Other
