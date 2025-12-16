# FCM Token Update API Documentation

## Overview
The backend now supports platform-based FCM tokens for both **app** (Android/iOS) and **web** platforms. Each user can have separate tokens for app and web, allowing notifications to be sent to both platforms independently.

## API Endpoints

### 1. Student FCM Token Update

**URL:** `PUT /api/student/fcm-token`

**Headers:**
```
Authorization: Bearer <student_jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "fcmToken": "your_fcm_token_here",
  "platform": "app"  // or "web"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "FCM token updated successfully for app platform",
  "data": {
    "platform": "app",
    "tokenUpdated": true
  }
}
```

**Example Requests:**

**For Android App:**
```bash
curl -X PUT https://api.dvisionacademy.com/api/student/fcm-token \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "fcmToken": "dKx8Yz9...",
    "platform": "app"
  }'
```

**For Web:**
```bash
curl -X PUT https://api.dvisionacademy.com/api/student/fcm-token \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "fcmToken": "eLy9Za0...",
    "platform": "web"
  }'
```

---

### 2. Teacher FCM Token Update

**URL:** `PUT /api/teacher/fcm-token`

**Headers:**
```
Authorization: Bearer <teacher_jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "fcmToken": "your_fcm_token_here",
  "platform": "app"  // or "web"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "FCM token updated successfully for app platform",
  "data": {
    "platform": "app",
    "tokenUpdated": true
  }
}
```

**Example Requests:**

**For Android App:**
```bash
curl -X PUT https://api.dvisionacademy.com/api/teacher/fcm-token \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "fcmToken": "dKx8Yz9...",
    "platform": "app"
  }'
```

**For Web:**
```bash
curl -X PUT https://api.dvisionacademy.com/api/teacher/fcm-token \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "fcmToken": "eLy9Za0...",
    "platform": "web"
  }'
```

---

### 3. Agent FCM Token Update

**URL:** `PUT /api/agent/fcm-token`

**Headers:**
```
Authorization: Bearer <agent_jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "fcmToken": "your_fcm_token_here",
  "platform": "app"  // or "web"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "FCM token updated successfully for app platform",
  "data": {
    "platform": "app",
    "tokenUpdated": true
  }
}
```

**Example Requests:**

**For Android App:**
```bash
curl -X PUT https://api.dvisionacademy.com/api/agent/fcm-token \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "fcmToken": "dKx8Yz9...",
    "platform": "app"
  }'
```

**For Web:**
```bash
curl -X PUT https://api.dvisionacademy.com/api/agent/fcm-token \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "fcmToken": "eLy9Za0...",
    "platform": "web"
  }'
```

---

## Platform Values

- **`"app"`** - For Android/iOS mobile applications
- **`"web"`** - For web browsers (PWA/Web App)

**Note:** If `platform` is not provided, it defaults to `"web"` for backward compatibility.

## Data Model

Each user (Student, Teacher, Agent) now has:

```javascript
{
  // Legacy token (for backward compatibility)
  fcmToken: String,
  
  // Platform-based tokens
  fcmTokens: {
    app: String,  // Android/iOS token
    web: String   // Web browser token
  }
}
```

## Notification Behavior

- When sending notifications, the system will:
  1. Send to **both** app and web tokens if both exist
  2. Fall back to legacy `fcmToken` if platform tokens don't exist
  3. This ensures maximum notification delivery coverage

## Error Responses

**Missing Token:**
```json
{
  "success": false,
  "message": "Please provide FCM token"
}
```

**Invalid Platform:**
```json
{
  "success": false,
  "message": "Platform must be either \"app\" or \"web\""
}
```

**Unauthorized:**
```json
{
  "success": false,
  "message": "Not authorized to access this route"
}
```

## Integration Notes

1. **Flutter App Integration:**
   - Get FCM token from Firebase Messaging
   - Call the API with `platform: "app"` when token is received/refreshed
   - Update token whenever it changes

2. **Web Integration:**
   - Get FCM token from Firebase Messaging Web SDK
   - Call the API with `platform: "web"` when token is received/refreshed
   - Update token whenever it changes

3. **Token Refresh:**
   - Both platforms should update tokens whenever Firebase provides a new token
   - The backend will overwrite the previous token for that platform

## Firebase Project Setup

Based on your Firebase console:
- **Student App:** `com.dvisionstudent.academy` (Android)
- **Teacher App:** `com.teachernew.dvisionacademy` (Android)
- **Web App:** Configured in Firebase Console

Make sure to:
1. Download `google-services.json` for Android apps
2. Configure Web App credentials in Firebase
3. Use the same Firebase project for all platforms to share FCM tokens

