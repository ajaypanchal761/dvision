# Live Class Recording System Documentation

This document outlines the architecture and technical flow of the manual recording system implemented in the D-Vision platform.

## 🏗️ Architecture Overview

The system follows a **Hybrid Persistence Model**:
1.  **Client-Side Capture:** Media is captured and buffered in the teacher's browser using `MediaRecorder` and `IndexedDB`.
2.  **Server-Side Processing:** The backend processes the uploaded media (conversion/repair) before permanent storage.
3.  **Cloud Storage:** Final processed files are stored in AWS S3.

---

## 💻 Frontend Flow (Teacher Side)

### 1. Initialization & Persistence
- **IndexedDB:** We use a local browser database named `LiveClassRecordingDB` with two stores:
    -   `chunks`: Stores raw video data chunks (WebM blobs).
    -   `metadata`: Stores recording metadata like `accumulatedDuration`.
- **Persistence:** This allows the recording to survive page refreshes, browser crashes, or the teacher leaving/rejoining the class.

### 2. Recording Lifecycle
- **Start:** Initializes `MediaRecorder` with the teacher's local audio/video stream. It saves data to IndexedDB every 1 second (`recorder.start(1000)`).
- **Pause:** Stops the current recorder instance, calculates elapsed time, and saves the `accumulatedDuration` to IndexedDB.
- **Resume:** Starts a *new* recorder instance. New chunks are appended to the *same* IndexedDB session.
- **Rejoin:** If a teacher refreshes or rejoins, the system checks IndexedDB. If chunks exist and the backend status is `recording`, it automatically triggers a "Resume" to continue capture.

### 3. Safety Mechanisms
- **Race Condition Prevention:** A `beforeunload` listener and an `isComponentMounted` ref are used to block accidental uploads when the browser tab is closed or refreshed.
- **Manual Stop:** Upload only happens when the teacher explicitly clicks **"Stop Recording"** or **"End Class"**.

### 4. The Merge & Upload
- When stopped, the system:
    1.  Retrieves **all** chunks from IndexedDB (Session 1 + Session 2 + etc.).
    2.  Creates a single large `Blob` from these chunks.
    3.  Uploads this Blob as a multipart form-data to `/api/live-classes/teacher/live-classes/:id/upload-recording`.
    4.  Clears IndexedDB after a successful response.

---

## ⚙️ Backend Flow (Server Side)

### 1. Upload Handling
- **Multer Middleware:** Receives the incoming file and saves it temporarily to `backend/uploads/recordings/`.

### 2. Video Conversion & Repair (FFmpeg)
- **The Problem:** Merging WebM chunks in the browser often leads to "Timestamp Discontinuity." This makes the video play only partially or makes the seek-bar glitchy.
- **The Solution:** 
    -   The backend uses `fluent-ffmpeg` to process the file.
    -   It performs a **Remuxing** operation: `ffmpeg -i input.webm -c copy -movflags +faststart output.mp4`.
    -   This repairs the internal timestamps and wraps the video in a web-optimized MP4 container.
- **Fallback:** If FFmpeg fails (rare), the system falls back to the original WebM file to ensure the recording is never lost.

### 3. Storage & Database
- **AWS S3:** The processed MP4 is uploaded to S3.
- **MongoDB:** 
    -   Updates the `LiveClass` record status to `completed`.
    -   Creates a new entry in the `Recording` collection with the S3 URL, duration, and file size.
- **Cleanup:** All temporary files (original WebM and transformed MP4) are deleted from the server disk immediately after S3 upload.

---

## 🎓 Student Playback
- Students see a list of recordings.
- Clicking "Watch" opens a Video Player.
- Because the file was processed by FFmpeg on the backend, the player features a fully functional seek-bar and smooth playback even across "paused" segments.

---

## 🛠️ Key Files
- **Frontend:** `src/modules/teacher/pages/LiveClassRoom.jsx` (Core logic)
- **Backend Controller:** `backend/controllers/liveClassController.js` (`uploadRecording` function)
- **Backend Router:** `backend/routes/liveClassRoutes.js`
- **Database Models:** `backend/models/LiveClass.js`, `backend/models/Recording.js`
