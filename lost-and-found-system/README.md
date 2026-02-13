# Lost and Found System - Jyothi Engineering College

A comprehensive web-based Lost and Found system with database integration for managing lost and found items on campus.

## 📋 Project Overview

This system allows students to:
- Report lost items with detailed information
- View all reported lost items
- Report found items
- Browse unclaimed items
- Match lost items with found items
- Contact owners/finders directly

## 🏗️ Project Structure

```
lost-and-found/
├── backend/
│   ├── server.js           # Express server with REST API
│   ├── package.json        # Node.js dependencies
│   └── database/
│       └── lost_and_found.db  # SQLite database (auto-created)
├── database/
│   └── schema.sql          # Database schema
├── frontend/
│   ├── index.html          # Homepage
│   ├── report-lost.html    # Report lost item form
│   ├── report-found.html   # Report found item form
│   ├── lost-items.html     # NEW: Browse all lost items page
│   └── unclaimed.html      # Browse unclaimed found items
└── README.md
```

## 🚀 Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- npm (comes with Node.js)

### Installation Steps

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the server:**
   ```bash
   npm start
   ```

   The server will start on `http://localhost:3000`

4. **Open the frontend:**
   Open `frontend/index.html` in your web browser, or serve it using a local server:
   ```bash
   # Using Python 3
   cd frontend
   python3 -m http.server 8000
   # Then visit http://localhost:8000
   ```

## 🗄️ Database Schema

The system uses SQLite with the following tables:

### lost_items
- `id` - Unique identifier
- `item_name` - Name of the lost item
- `category` - Category (Electronics, Books, etc.)
- `description` - Detailed description
- `date_lost` - Date the item was lost
- `location_lost` - Where it was lost
- `student_name` - Reporter's name
- `contact_number` - Contact phone
- `email` - Contact email
- `student_id` - Student ID number
- `status` - active/found/cancelled
- `created_at` - Timestamp

### found_items
- `id` - Unique identifier
- `item_name` - Name of the found item
- `category` - Category
- `description` - Detailed description
- `date_found` - Date the item was found
- `location_found` - Where it was found
- `finder_name` - Finder's name
- `contact_number` - Contact phone
- `email` - Contact email
- `student_id` - Student ID
- `status` - unclaimed/claimed
- `image_url` - Optional image URL
- `created_at` - Timestamp

### match_requests
- `id` - Unique identifier
- `lost_item_id` - Reference to lost item
- `found_item_id` - Reference to found item
- `claimer_name` - Person claiming the item
- `claimer_contact` - Contact info
- `verification_status` - pending/verified/rejected
- `notes` - Additional notes

## 🔌 API Endpoints

### Lost Items
- `GET /api/lost-items` - Get all lost items (with optional filters)
  - Query params: `status`, `category`, `search`
- `GET /api/lost-items/:id` - Get single lost item
- `POST /api/lost-items` - Create new lost item report
- `PUT /api/lost-items/:id/status` - Update item status

### Found Items
- `GET /api/found-items` - Get all found items (with optional filters)
- `GET /api/found-items/:id` - Get single found item
- `POST /api/found-items` - Create new found item report

### Match Requests
- `POST /api/match-requests` - Create a match/claim request

### Statistics
- `GET /api/statistics` - Get system statistics

## ✨ New Features

### Lost Items Page (lost-items.html)
A dedicated page to browse all reported lost items with:
- **Search functionality** - Search by item name or description
- **Category filter** - Filter by item category
- **Status filter** - Filter by active/found status
- **Statistics dashboard** - View total lost items, recovered items, etc.
- **Detailed item cards** - Each item displays:
  - Item name and category
  - Description
  - Date lost and days ago
  - Location
  - Status badge
  - View details button
- **Item detail modal** - Click any item to see:
  - Full description
  - Contact information (name, phone, email, student ID)
  - Date and location details
  - Helpful instructions for finders

### Updated Navigation
- All pages now include a "Lost Items" link in the navigation menu
- Consistent navigation across desktop and mobile views

### Database Integration
- All forms now submit data to the backend API
- Data is persisted in SQLite database
- Real-time loading of items from database
- Error handling and user feedback

## 🎨 Features

### Report Lost Item
- Comprehensive form with validation
- Categories for easy classification
- Contact information collection
- Immediate confirmation

### Browse Lost Items
- Grid layout with beautiful cards
- Real-time search and filtering
- Responsive design
- Modal view for detailed information

### Report Found Item
- Similar form structure as lost items
- Optional image upload capability
- Finder contact information

### Unclaimed Items
- Display all found items awaiting owners
- Contact finders directly
- Mark items as claimed

## 🔧 Troubleshooting

### Server won't start
- Ensure Node.js is installed: `node --version`
- Check if port 3000 is available
- Install dependencies: `npm install`

### Database errors
- The database file is auto-created on first run
- Check write permissions in the backend/database directory
- Delete `lost_and_found.db` to reset database

### CORS errors
- Ensure frontend is served from localhost (not file://)
- Use a local server like `python -m http.server`

### Items not loading
- Check that the backend server is running
- Open browser console (F12) for error messages
- Verify API_BASE_URL in HTML files matches your server

## 📝 Code Errors Fixed

### Original Issues:
1. ❌ No database integration - forms didn't save data
2. ❌ Missing "Lost Items" page to view reported items
3. ❌ Broken navigation links
4. ❌ No backend API
5. ❌ Static data only

### Fixes Applied:
1. ✅ Complete Express.js backend with REST API
2. ✅ SQLite database with proper schema
3. ✅ New lost-items.html page with full functionality
4. ✅ Updated all navigation menus
5. ✅ Form submission with database integration
6. ✅ Search and filter capabilities
7. ✅ Real-time data loading
8. ✅ Error handling and user feedback

## 🚀 Enhancements Added

1. **Advanced Search** - Search by name or description
2. **Multiple Filters** - Category and status filtering
3. **Statistics Dashboard** - Real-time count of items
4. **Modal View** - Detailed item information in popup
5. **Responsive Design** - Works on all device sizes
6. **Loading States** - Smooth user experience
7. **Animation** - AOS animations for smooth page load
8. **Error Handling** - Graceful error messages

## 🔐 Security Notes

- Input validation on both frontend and backend
- SQL injection prevention using parameterized queries
- CORS configured for security
- No sensitive data exposed in responses

## 📱 Future Enhancements

1. User authentication system
2. Admin dashboard for managing items
3. Email notifications for matches
4. Image upload for items
5. WhatsApp integration
6. SMS alerts
7. Advanced matching algorithm
8. Export reports to PDF

## 👥 Contributors

Built for Jyothi Engineering College Lost and Found System

## 📄 License

MIT License - Feel free to use and modify for your institution
