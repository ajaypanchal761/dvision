const { getFirebaseAdmin } = require('../config/firebase');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Admin = require('../models/Admin');
const Notification = require('../models/Notification');
const asyncHandler = require('../utils/asyncHandler');

class NotificationService {
  /**
   * Helper function to get all FCM tokens from a user (app + web)
   * @param {Object} user - User document (Student, Teacher, Agent, or Admin)
   * @returns {Array<string>} - Array of FCM tokens
   */
  getUserFcmTokens(user) {
    const tokens = [];
    
    // Get platform-based tokens (app and web)
    if (user.fcmTokens) {
      if (user.fcmTokens.app) tokens.push(user.fcmTokens.app);
      if (user.fcmTokens.web) tokens.push(user.fcmTokens.web);
    }
    
    // Fallback to legacy fcmToken if no platform tokens exist
    if (tokens.length === 0 && user.fcmToken) {
      tokens.push(user.fcmToken);
    }
    
    return tokens.filter(Boolean); // Remove null/undefined
  }

  /**
   * Send notification to a single FCM token
   * @param {string} fcmToken - FCM token of the device
   * @param {Object} notification - Notification payload
   * @param {Object} data - Additional data payload
   * @returns {Promise<Object>} - Result of sending notification
   */
  async sendToToken(fcmToken, notification, data = {}) {
    try {
      const admin = getFirebaseAdmin();
      
      if (!admin) {
        throw new Error('Firebase Admin not initialized');
      }
      
      const message = {
        token: fcmToken,
        notification: {
          title: notification.title || 'Dvision Academy',
          body: notification.body || '',
        },
        data: {
          ...data,
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
        },
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: 'dvision_academy_channel',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
        webpush: {
          notification: {
            icon: '/icon-192x192.png',
            badge: '/badge-72x72.png',
          },
          fcmOptions: {
            link: data.url || '/',
          },
        },
      };

      const response = await admin.messaging().send(message);
      return {
        success: true,
        messageId: response,
      };
    } catch (error) {
      console.error('Error sending notification to token:', error);
      
      // Handle invalid token
      if (error.code === 'messaging/invalid-registration-token' || 
          error.code === 'messaging/registration-token-not-registered') {
        return {
          success: false,
          error: 'Invalid or unregistered token',
          code: error.code,
        };
      }
      
      throw error;
    }
  }

  /**
   * Send notification to multiple FCM tokens
   * @param {Array<string>} fcmTokens - Array of FCM tokens
   * @param {Object} notification - Notification payload
   * @param {Object} data - Additional data payload
   * @returns {Promise<Object>} - Result of sending notifications
   */
  async sendToMultipleTokens(fcmTokens, notification, data = {}) {
    try {
      const admin = getFirebaseAdmin();
      
      if (!admin) {
        throw new Error('Firebase Admin not initialized');
      }
      
      // Remove invalid tokens
      const validTokens = fcmTokens.filter(token => token && token.trim() !== '');
      
      if (validTokens.length === 0) {
        return {
          success: false,
          error: 'No valid FCM tokens provided',
        };
      }

      const message = {
        notification: {
          title: notification.title || 'Dvision Academy',
          body: notification.body || '',
        },
        data: {
          ...data,
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
        },
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: 'dvision_academy_channel',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
        webpush: {
          notification: {
            icon: '/icon-192x192.png',
            badge: '/badge-72x72.png',
          },
          fcmOptions: {
            link: data.url || '/',
          },
        },
        tokens: validTokens,
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      
      return {
        success: true,
        successCount: response.successCount,
        failureCount: response.failureCount,
        responses: response.responses,
      };
    } catch (error) {
      console.error('Error sending multicast notification:', error);
      throw error;
    }
  }

  /**
   * Send notification to a user by ID
   * @param {string} userId - User ID
   * @param {string} userType - 'student', 'teacher', or 'admin'
   * @param {Object} notification - Notification payload
   * @param {Object} data - Additional data payload
   * @returns {Promise<Object>} - Result of sending notification
   */
  async sendToUser(userId, userType, notification, data = {}) {
    try {
      console.log('[DEBUG] sendToUser called:', { userId, userType, notificationTitle: notification.title });
      
      let user;
      
      // Get user based on type
      if (userType === 'student') {
        user = await Student.findById(userId);
      } else if (userType === 'teacher') {
        user = await Teacher.findById(userId);
      } else if (userType === 'admin') {
        user = await Admin.findById(userId);
      } else {
        console.error('[ERROR] Invalid user type:', userType);
        throw new Error('Invalid user type');
      }

      if (!user) {
        console.error('[ERROR] User not found:', { userId, userType });
        return {
          success: false,
          error: 'User not found',
        };
      }

      // Get all FCM tokens (app + web)
      const fcmTokens = this.getUserFcmTokens(user);
      
      console.log('[DEBUG] User found:', { 
        userId: user._id.toString(), 
        hasFcmToken: !!user.fcmToken,
        hasAppToken: !!(user.fcmTokens?.app),
        hasWebToken: !!(user.fcmTokens?.web),
        tokenCount: fcmTokens.length,
        isActive: user.isActive 
      });

      if (fcmTokens.length === 0) {
        console.warn('[WARN] User does not have FCM token:', { userId: user._id.toString(), userType });
        // Still save notification to database even without FCM token
        try {
          await Notification.create({
            userId: user._id,
            userType,
            title: notification.title || 'Dvision Academy',
            body: notification.body || '',
            data: data || {},
            type: data.type || 'general',
          });
          console.log('[DEBUG] Notification saved to database (no FCM token)');
        } catch (dbError) {
          console.error('[ERROR] Failed to save notification to database:', dbError);
        }
        return {
          success: false,
          error: 'User does not have FCM token',
        };
      }

      // Send to all tokens (app + web)
      let lastResult = null;
      for (const token of fcmTokens) {
        console.log('[DEBUG] Sending FCM notification to token:', token.substring(0, 20) + '...');
        lastResult = await this.sendToToken(token, notification, data);
        console.log('[DEBUG] FCM send result:', { success: lastResult.success, messageId: lastResult.messageId });
      }
      
      const result = lastResult || { success: false };
      
      // Save notification to database if sent successfully
      if (result.success) {
        try {
          const savedNotification = await Notification.create({
            userId: user._id,
            userType,
            title: notification.title || 'Dvision Academy',
            body: notification.body || '',
            data: data || {},
            type: data.type || 'general',
            fcmMessageId: result.messageId
          });
          console.log('[DEBUG] Notification saved to database:', { notificationId: savedNotification._id, userId: savedNotification.userId.toString(), userType: savedNotification.userType });
        } catch (dbError) {
          console.error('[ERROR] Failed to save notification to database:', dbError);
        }
      } else {
        console.warn('[WARN] FCM send failed, not saving to database');
      }

      return result;
    } catch (error) {
      console.error('[ERROR] Error sending notification to user:', error);
      throw error;
    }
  }

  /**
   * Send notification to multiple users
   * @param {Array<string>} userIds - Array of user IDs
   * @param {string} userType - 'student', 'teacher', or 'admin'
   * @param {Object} notification - Notification payload
   * @param {Object} data - Additional data payload
   * @returns {Promise<Object>} - Result of sending notifications
   */
  async sendToMultipleUsers(userIds, userType, notification, data = {}) {
    try {
      let UserModel;
      
      if (userType === 'student') {
        UserModel = Student;
      } else if (userType === 'teacher') {
        UserModel = Teacher;
      } else if (userType === 'admin') {
        UserModel = Admin;
      } else {
        throw new Error('Invalid user type');
      }

      // Get all users (with or without FCM tokens) to save notifications
      const allUsers = await UserModel.find({
        _id: { $in: userIds }
      });

      // Get users with FCM tokens for push notification
      // Collect all tokens (app + web) from each user
      const fcmTokens = [];
      const usersWithTokens = [];
      
      for (const user of allUsers) {
        const userTokens = this.getUserFcmTokens(user);
        if (userTokens.length > 0) {
          usersWithTokens.push(user);
          fcmTokens.push(...userTokens);
        }
      }

      let result = { success: false, successCount: 0, failureCount: 0, responses: [] };

      // Send push notifications if there are tokens
      if (fcmTokens.length > 0) {
        result = await this.sendToMultipleTokens(fcmTokens, notification, data);
      }
      
      // Save notifications to database for ALL users (regardless of FCM token or push success)
      // This ensures notifications appear in the app even if push fails
      const notificationsToSave = allUsers.map((user) => {
        // Find if this user has a token and if the push was successful
        const tokenIndex = usersWithTokens.findIndex(u => u._id.toString() === user._id.toString());
        const fcmMessageId = tokenIndex >= 0 && result.responses && result.responses[tokenIndex]?.success
          ? result.responses[tokenIndex].messageId
          : null;

        return {
          userId: user._id,
          userType: userType,
          title: notification.title || 'Dvision Academy',
          body: notification.body || '',
          data: data || {},
          type: data.type || 'general',
          fcmMessageId: fcmMessageId
        };
      });

      if (notificationsToSave.length > 0) {
        console.log('Saving notifications - userType:', userType, 'count:', notificationsToSave.length);
        console.log('Sample notification userId:', notificationsToSave[0].userId, 'userId type:', typeof notificationsToSave[0].userId);
        console.log('Sample notification userType:', notificationsToSave[0].userType);
        console.log('Sample notification full:', JSON.stringify(notificationsToSave[0], null, 2));
        await Notification.insertMany(notificationsToSave);
        console.log('Notifications saved successfully');
        
        // Verify saved notifications
        const savedNotifications = await Notification.find({
          userId: notificationsToSave[0].userId,
          userType: userType
        }).limit(1);
        console.log('Verification - Found saved notifications:', savedNotifications.length);
        if (savedNotifications.length > 0) {
          console.log('Verification - Saved notification userId:', savedNotifications[0].userId, 'userType:', savedNotifications[0].userType);
        }
      }

      // Return result with total count including users without tokens
      return {
        success: true,
        successCount: result.successCount || 0,
        failureCount: result.failureCount || 0,
        totalSaved: notificationsToSave.length,
        responses: result.responses || []
      };
    } catch (error) {
      console.error('Error sending notification to multiple users:', error);
      throw error;
    }
  }

  /**
   * Send notification to students by class and board
   * @param {Number} class - Class number (9, 10, 11, 12)
   * @param {String} board - Board name (CBSE, ICSE, State Board)
   * @param {Object} notification - Notification payload
   * @param {Object} data - Additional data payload
   * @returns {Promise<Object>} - Result of sending notifications
   */
  async sendToStudentsByClassBoard(classNumber, board, notification, data = {}) {
    try {
      const students = await Student.find({
        class: classNumber,
        board: board,
        $or: [
          { fcmToken: { $exists: true, $ne: null } },
          { 'fcmTokens.app': { $exists: true, $ne: null } },
          { 'fcmTokens.web': { $exists: true, $ne: null } }
        ],
        'subscription.status': 'active',
        'subscription.endDate': { $gt: new Date() },
      });

      // Collect all tokens (app + web) from each student
      const fcmTokens = [];
      for (const student of students) {
        const studentTokens = this.getUserFcmTokens(student);
        fcmTokens.push(...studentTokens);
      }

      if (fcmTokens.length === 0) {
        return {
          success: false,
          error: 'No students found with active subscriptions and FCM tokens',
        };
      }

      const result = await this.sendToMultipleTokens(fcmTokens, notification, data);
      
      // Save notifications to database for all students
      if (result.success && result.successCount > 0) {
        const notificationsToSave = students.map((student, index) => {
          // Only save if notification was successfully sent to this student's token
          const response = result.responses[index];
          if (response && response.success) {
            return {
              userId: student._id,
              userType: 'student',
              title: notification.title || 'Dvision Academy',
              body: notification.body || '',
              data: data || {},
              type: data.type || 'general',
              fcmMessageId: response.messageId
            };
          }
          return null;
        }).filter(Boolean);

        if (notificationsToSave.length > 0) {
          await Notification.insertMany(notificationsToSave);
        }
      }

      return result;
    } catch (error) {
      console.error('Error sending notification to students by class/board:', error);
      throw error;
    }
  }
}

module.exports = new NotificationService();

