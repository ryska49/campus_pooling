# 🎒 Campus Parcel — Backend API

A production-quality Node.js backend for a campus peer-to-peer parcel delivery system. Students can post delivery requests, pick up parcels for others, earn tokens, and build reputation through ratings.

---

## 📁 Folder Structure

```
campus-parcel-backend/
├── src/
│   ├── config/
│   │   ├── db.js               # MongoDB connection
│   │   └── socket.js           # Socket.io setup & event emitters
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── requestController.js
│   │   ├── walletController.js
│   │   └── ratingController.js
│   ├── middleware/
│   │   ├── auth.js             # JWT protect middleware
│   │   ├── errorHandler.js     # Centralized error handler + AppError + asyncHandler
│   │   └── validators.js       # express-validator rules per route
│   ├── models/
│   │   ├── User.js
│   │   ├── DeliveryRequest.js
│   │   ├── Transaction.js
│   │   └── Rating.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── requestRoutes.js
│   │   ├── walletRoutes.js
│   │   └── ratingRoutes.js
│   ├── services/
│   │   ├── authService.js      # Register / login business logic
│   │   ├── requestService.js   # Full delivery lifecycle
│   │   ├── walletService.js    # Token deduction / credit / refund
│   │   └── ratingService.js    # Rating submission + avg recalculation
│   ├── utils/
│   │   ├── jwt.js              # Token generation & verification
│   │   ├── otp.js              # OTP generation & validation
│   │   └── response.js         # Standardized API response helpers
│   ├── app.js                  # Express app factory
│   └── server.js               # HTTP server + Socket.io bootstrap
├── .env.example
├── package.json
└── README.md
```

---

## ⚡ Quick Start

### 1. Prerequisites

- Node.js >= 18
- MongoDB running locally or a MongoDB Atlas URI

### 2. Clone & Install

```bash
cd campus-parcel-backend
npm install
```

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/campus_parcel
JWT_SECRET=change_this_to_a_long_random_secret
JWT_EXPIRES_IN=7d
DEFAULT_TOKEN_BALANCE=100
MIN_TOKEN_REWARD=5
CLIENT_URL=http://localhost:3000
```

### 4. Run the Server

```bash
# Development (auto-restart on file changes)
npm run dev

# Production
npm start
```

Server starts at: `http://localhost:5000`  
Health check: `http://localhost:5000/health`

---

## 🔌 Socket.io Client Integration

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000');

// Join your personal room to receive targeted events
socket.emit('join', userId);

// Listen for new delivery requests (all users see these)
socket.on('new_request', (data) => console.log('New request:', data));

// Listen for when your request is accepted (sender)
socket.on('request_accepted', (data) => console.log('Accepted:', data));

// Listen for delivery completion (both parties)
socket.on('delivery_completed', (data) => console.log('Completed:', data));
```

---

## 📡 API Reference

All protected routes require:
```
Authorization: Bearer <jwt_token>
```

### Auth

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | ❌ | Register new user |
| POST | `/api/auth/login` | ❌ | Login and get JWT |
| GET | `/api/auth/me` | ✅ | Get current user profile |

**Register body:**
```json
{
  "name": "Arjun Kumar",
  "email": "arjun@university.edu",
  "password": "password123",
  "hostel": "Block C"
}
```

**Login body:**
```json
{ "email": "arjun@university.edu", "password": "password123" }
```

---

### Delivery Requests

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/requests` | ✅ | Create a request (deducts tokens) |
| GET | `/api/requests/open` | ✅ | List open requests (not yours) |
| GET | `/api/requests/my` | ✅ | Your requests (`?role=carrier` for carried) |
| POST | `/api/requests/:id/accept` | ✅ | Become the carrier |
| POST | `/api/requests/:id/generate-otp` | ✅ | Sender generates OTP |
| POST | `/api/requests/:id/complete` | ✅ | Carrier submits OTP to complete |
| DELETE | `/api/requests/:id` | ✅ | Sender cancels (token refunded) |

**Create request body:**
```json
{
  "pickupLocation": "Main Gate",
  "dropLocation": "Block C Hostel",
  "parcelDetails": {
    "description": "Amazon package, medium box",
    "weight": "~2kg"
  },
  "tokenReward": 20
}
```

**Complete delivery body:**
```json
{ "otp": "847291" }
```

---

### Wallet

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/wallet` | ✅ | Get token balance |
| GET | `/api/wallet/transactions` | ✅ | Transaction history (`?page=1&limit=20`) |

---

### Ratings

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/ratings` | ✅ | Rate carrier after delivery |

**Rating body:**
```json
{
  "requestId": "64f1a2b3c4d5e6f7a8b9c0d1",
  "score": 5,
  "comment": "Very fast delivery, highly recommended!"
}
```

---

## 🔄 Delivery Lifecycle

```
Sender creates request  ──► OPEN  (tokens escrowed)
        │
Carrier accepts         ──► ACCEPTED
        │
Sender generates OTP    ──► OTP shared with carrier
        │
Carrier submits OTP     ──► COMPLETED  (tokens transferred to carrier)
        │
Sender rates carrier    ──► Rating stored, carrier avg updated
```

**Or:**
```
Sender cancels at any point ──► CANCELLED  (tokens refunded)
```

---

## 🏗 Architecture Decisions

| Concern | Approach |
|---|---|
| **Atomicity** | Mongoose sessions + transactions for all token operations |
| **Token escrow** | Tokens deducted at request creation, credited only on completion |
| **OTP security** | 6-digit code with 30-min expiry, cleared after use |
| **Password security** | bcrypt with salt rounds = 12 |
| **Error handling** | Centralized `errorHandler`, `AppError` class, `asyncHandler` wrapper |
| **Validation** | `express-validator` rules co-located with routes |
| **Real-time** | Socket.io rooms per userId for targeted delivery events |
| **Pagination** | All list endpoints support `?page` and `?limit` |

---

## 🧪 Sample cURL Flows

```bash
# 1. Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Arjun","email":"arjun@uni.edu","password":"pass123","hostel":"Block C"}'

# 2. Login → grab token
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"arjun@uni.edu","password":"pass123"}'

# 3. Create a delivery request (use token from step 2)
curl -X POST http://localhost:5000/api/requests \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"pickupLocation":"Main Gate","dropLocation":"Block C","parcelDetails":{"description":"Books"},"tokenReward":15}'

# 4. Check balance
curl http://localhost:5000/api/wallet \
  -H "Authorization: Bearer <TOKEN>"
```
