# System Architecture

## High-Level Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                          │
│                      (Frontend - HTML/CSS/JS)                   │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 │ HTTP Requests
                                 │ (GET, POST, PUT)
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                         API SERVER                               │
│                     (Express.js Backend)                         │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐   │
│  │              API Routes & Controllers                   │   │
│  │  • /api/lost-items      • /api/found-items             │   │
│  │  • /api/match-requests  • /api/statistics              │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐   │
│  │            Middleware & Validation                      │   │
│  │  • CORS  • Body Parser  • Error Handling               │   │
│  └────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 │ SQL Queries
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                       DATABASE LAYER                             │
│                    (SQLite Database)                             │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ lost_items   │  │ found_items  │  │match_requests│         │
│  │──────────────│  │──────────────│  │──────────────│         │
│  │ id           │  │ id           │  │ id           │         │
│  │ item_name    │  │ item_name    │  │ lost_item_id │         │
│  │ category     │  │ category     │  │ found_item_id│         │
│  │ description  │  │ description  │  │ claimer_name │         │
│  │ date_lost    │  │ date_found   │  │ status       │         │
│  │ location     │  │ location     │  │ ...          │         │
│  │ contact_info │  │ contact_info │  └──────────────┘         │
│  │ status       │  │ status       │                            │
│  │ ...          │  │ ...          │                            │
│  └──────────────┘  └──────────────┘                            │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow Diagram

### Reporting a Lost Item

```
Student fills form          Form validation           Data sent to API
  (Frontend)          ─────▶  (JavaScript)     ─────▶  (POST request)
                                                              │
                                                              ▼
                                                      Express Server
                                                       validates data
                                                              │
                                                              ▼
                                                       SQLite INSERT
                                                        (lost_items)
                                                              │
                                                              ▼
                                                      Response sent back
                                                              │
                                                              ▼
                                              Success message displayed
                                              Redirect to Lost Items page
```

### Browsing Lost Items

```
User clicks "Lost Items"     Page loads               API request sent
      (Navigation)     ─────▶  lost-items.html  ─────▶ GET /api/lost-items
                                                              │
                                                              ▼
                                                       Server queries DB
                                                        SELECT * FROM
                                                         lost_items
                                                              │
                                                              ▼
                                                       JSON data returned
                                                              │
                                                              ▼
                                               JavaScript renders cards
                                                Items displayed to user
```

## Page Flow Diagram

```
                        ┌─────────────────┐
                        │   index.html    │
                        │   (Homepage)    │
                        └────────┬────────┘
                                 │
                ┌────────────────┼────────────────┐
                │                │                │
                ▼                ▼                ▼
      ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
      │report-lost   │  │report-found  │  │unclaimed     │
      │  .html       │  │  .html       │  │  .html       │
      └──────┬───────┘  └──────┬───────┘  └──────────────┘
             │                 │
             ▼                 ▼
      ┌──────────────────────────────┐
      │     lost-items.html          │
      │  (NEW - Browse all lost)     │
      └──────────────────────────────┘
```

## API Request/Response Flow

### Example: Creating a Lost Item

```
1. User Input
   ┌────────────────────────┐
   │ Item: "iPhone 12"      │
   │ Category: Electronics  │
   │ Date: 2024-02-01      │
   │ Location: Library     │
   │ Contact: John Doe     │
   └────────────────────────┘
              │
              ▼
2. Frontend Validation
   ┌────────────────────────┐
   │ Check required fields  │
   │ Validate date format  │
   │ Validate phone number │
   └────────────────────────┘
              │
              ▼
3. API Request
   POST /api/lost-items
   ┌────────────────────────┐
   │ {                      │
   │   "item_name": "...",  │
   │   "category": "...",   │
   │   ...                  │
   │ }                      │
   └────────────────────────┘
              │
              ▼
4. Backend Processing
   ┌────────────────────────┐
   │ Validate data          │
   │ Sanitize inputs        │
   │ Check for duplicates   │
   └────────────────────────┘
              │
              ▼
5. Database Insert
   ┌────────────────────────┐
   │ INSERT INTO lost_items │
   │ VALUES (...)           │
   └────────────────────────┘
              │
              ▼
6. Response
   ┌────────────────────────┐
   │ {                      │
   │   "success": true,     │
   │   "id": 123            │
   │ }                      │
   └────────────────────────┘
              │
              ▼
7. User Feedback
   ┌────────────────────────┐
   │ ✓ Success message     │
   │ Redirect to list      │
   └────────────────────────┘
```

## Security Layers

```
┌─────────────────────────────────────────┐
│          Input Validation               │
│  • Required field checks                │
│  • Data type validation                 │
│  • Length limits                        │
└─────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│         CORS Configuration              │
│  • Allowed origins                      │
│  • Allowed methods                      │
│  • Credentials handling                 │
└─────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│       SQL Injection Prevention          │
│  • Parameterized queries                │
│  • Input sanitization                   │
│  • Prepared statements                  │
└─────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│         Error Handling                  │
│  • Try-catch blocks                     │
│  • Graceful degradation                 │
│  • User-friendly messages               │
└─────────────────────────────────────────┘
```

## Technology Stack

```
┌─────────────────────────────────────────────────┐
│                  FRONTEND                        │
│                                                  │
│  HTML5    CSS (Tailwind)    JavaScript (ES6+)  │
│    │            │                    │          │
│    └────────────┴────────────────────┘          │
│                  │                               │
│           Feather Icons                          │
│           AOS Animations                         │
└─────────────────────────────────────────────────┘
                    │
                    │ HTTP/HTTPS
                    │
┌─────────────────────────────────────────────────┐
│                  BACKEND                         │
│                                                  │
│  Node.js    Express.js    SQLite3               │
│     │            │            │                  │
│     └────────────┴────────────┘                 │
│                  │                               │
│            body-parser                           │
│            cors                                  │
└─────────────────────────────────────────────────┘
```

## Deployment Architecture

```
                  ┌──────────────┐
                  │   Internet   │
                  └──────┬───────┘
                         │
                  ┌──────▼───────┐
                  │   Firewall   │
                  └──────┬───────┘
                         │
         ┌───────────────┼───────────────┐
         │                               │
    ┌────▼─────┐                  ┌─────▼─────┐
    │  Web     │                  │   API     │
    │ Server   │◄────────────────▶│  Server   │
    │(Frontend)│                  │ (Backend) │
    └──────────┘                  └─────┬─────┘
                                        │
                                  ┌─────▼─────┐
                                  │ Database  │
                                  │ (SQLite)  │
                                  └───────────┘
```
