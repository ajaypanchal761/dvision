const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer storage (save to local disk first)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const nameWithoutExt = path.basename(file.originalname, ext).replace(/\s+/g, '-');
    cb(null, `dvision-${nameWithoutExt}-${uniqueSuffix}${ext}`);
  }
});

// File filter for images
const imageFilter = (req, file, cb) => {
  // Accept only images
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

// File filter for videos
const videoFilter = (req, file, cb) => {
  // Accept only videos
  if (file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new Error('Only video files are allowed'), false);
  }
};

// File filter for images and videos
const mediaFilter = (req, file, cb) => {
  // Accept images and videos
  if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image and video files are allowed'), false);
  }
};

// File filter for PDFs
const pdfFilter = (req, file, cb) => {
  // Accept only PDF files
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed'), false);
  }
};

// Configure multer for images
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: imageFilter
});

// Configure multer for videos
const uploadVideo = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit for videos
  },
  fileFilter: videoFilter
});

// Configure multer for images and videos
const uploadMedia = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  },
  fileFilter: mediaFilter
});

// Configure multer for PDFs
const uploadPDF = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit for PDFs
  },
  fileFilter: pdfFilter
});

// Configure multer for course uploads (thumbnail + multiple PDFs)
// Thumbnail: single image
// PDFs: array of PDFs (field name: chapterPdf)
const uploadCourse = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB per file
  },
  fileFilter: (req, file, cb) => {
    // Accept images for thumbnail
    if (file.fieldname === 'thumbnail' && file.mimetype.startsWith('image/')) {
      cb(null, true);
    }
    // Accept PDFs for chapters (field name can be 'chapterPdf' or 'chapterPdf[0]', 'chapterPdf[1]', etc.)
    else if ((file.fieldname === 'chapterPdf' || file.fieldname.startsWith('chapterPdf')) && file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type for field ${file.fieldname}. Expected image for thumbnail or PDF for chapters.`), false);
    }
  }
});

// Configure multer for recording uploads (large video files)
const uploadRecording = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      const recordingsDir = path.join(__dirname, '../../uploads/recordings');
      if (!fs.existsSync(recordingsDir)) {
        fs.mkdirSync(recordingsDir, { recursive: true });
      }
      cb(null, recordingsDir);
    },
    filename: function (req, file, cb) {
      const { id } = req.params;
      const timestamp = Date.now();
      const ext = path.extname(file.originalname) || '.webm';
      cb(null, `recording_${id}_${timestamp}${ext}`);
    }
  }),
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB limit for recordings
  },
  fileFilter: (req, file, cb) => {
    // Accept video files (including codec variants)
    const allowedMimes = [
      'video/webm',
      'video/mp4',
      'video/ogg',
      'video/quicktime',
      'video/x-matroska',
      'video/x-msvideo'
    ];
    
    const isVideoFile = allowedMimes.some(allowedMime => 
      file.mimetype === allowedMime || file.mimetype.startsWith(allowedMime + ';')
    );
    
    const allowedExtensions = ['.webm', '.mp4', '.ogg', '.mov', '.avi', '.mkv'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    const hasValidExtension = allowedExtensions.includes(fileExtension);
    
    if (isVideoFile || hasValidExtension) {
      cb(null, true);
    } else {
      cb(new Error(`Only video files are allowed. Received: ${file.mimetype}`), false);
    }
  }
});

module.exports = upload;
module.exports.uploadVideo = uploadVideo;
module.exports.uploadMedia = uploadMedia;
module.exports.uploadPDF = uploadPDF;
module.exports.uploadCourse = uploadCourse;
module.exports.uploadRecording = uploadRecording.single('recording');


