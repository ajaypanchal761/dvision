const jwt = require('jsonwebtoken');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Admin = require('../models/Admin');
const Agent = require('../models/Agent');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../utils/asyncHandler');

// Protect routes - verify JWT token
exports.protect = asyncHandler(async (req, res, next) => {
  // Accept token from common locations to avoid false 401s when clients use cookies or custom headers
  const authHeader = req.headers.authorization;
  const bearerToken =
    authHeader && authHeader.startsWith('Bearer') ? authHeader.split(' ')[1] : null;
  const cookieToken = req.cookies?.token;
  const headerToken = req.headers['x-auth-token'] || req.headers['token'];
  const queryToken = req.query?.token;

  const token = bearerToken || cookieToken || headerToken || queryToken;

  if (!token) {
    throw new ErrorResponse('Not authorized to access this route (token missing)', 401);
  }

  if (!process.env.JWT_SECRET) {
    throw new ErrorResponse('Server misconfiguration: JWT_SECRET missing', 500);
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user based on role from token
    let user;
    if (decoded.role === 'student') {
      user = await Student.findById(decoded.id);
    } else if (decoded.role === 'teacher') {
      user = await Teacher.findById(decoded.id);
    } else if (decoded.role === 'admin') {
      user = await Admin.findById(decoded.id);
    } else if (decoded.role === 'agent') {
      user = await Agent.findById(decoded.id);
    } else {
      throw new ErrorResponse('Invalid user role', 401);
    }

    if (!user) {
      throw new ErrorResponse('User not found', 404);
    }

    // Check if user is active
    if (!user.isActive) {
      throw new ErrorResponse('Your account has been deactivated', 401);
    }

    req.user = user;
    req.userRole = decoded.role;
    next();
  } catch (err) {
    // Provide clearer reasons while still returning 401 to clients
    if (err.name === 'TokenExpiredError') {
      throw new ErrorResponse('Session expired, please login again', 401);
    }
    if (err.name === 'JsonWebTokenError') {
      throw new ErrorResponse('Invalid token, please login again', 401);
    }
    throw new ErrorResponse('Not authorized to access this route', 401);
  }
});

// Grant access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.userRole)) {
      throw new ErrorResponse(
        `User role '${req.userRole}' is not authorized to access this route`,
        403
      );
    }
    next();
  };
};

