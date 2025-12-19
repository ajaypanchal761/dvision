const cron = require('node-cron');
const Timetable = require('../models/Timetable');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Class = require('../models/Class');
const notificationService = require('./notificationService');
const Notification = require('../models/Notification');

/**
 * Get day name from Date object
 */
const getDayName = (date) => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getDay()];
};

/**
 * Calculate notification time (5 minutes before class)
 */
const getNotificationTime = (startTime) => {
  const [hours, minutes] = startTime.split(':').map(Number);
  const notificationTime = new Date();
  notificationTime.setHours(hours, minutes - 5, 0, 0);
  return notificationTime;
};

/**
 * Send notifications to teachers to create classes based on timetable
 * Runs at the start of each hour to notify teachers about upcoming classes
 */
const sendTimetableClassCreationNotifications = async () => {
  try {
    const now = new Date();
    const currentDay = getDayName(now);
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Find all active timetables for today that haven't been notified yet
    const timetables = await Timetable.find({
      dayOfWeek: currentDay,
      isActive: true,
      notificationSent: false
    })
      .populate('classId', 'type class board name classCode')
      .populate('subjectId', 'name')
      .populate('teacherId', 'name email phone fcmToken fcmTokens isActive');

    for (const timetable of timetables) {
      if (!timetable.teacherId || !timetable.teacherId.isActive) continue;
      
      const [startHour, startMin] = timetable.startTime.split(':').map(Number);
      const classItem = timetable.classId;
      const subject = timetable.subjectId;
      const teacher = timetable.teacherId;
      
      // Create class start time for today
      const classStartTime = new Date();
      classStartTime.setHours(startHour, startMin, 0, 0);
      
      // Send notification 30 minutes before class OR at the start of the hour if class is within next 2 hours
      const timeUntilClass = classStartTime.getTime() - now.getTime();
      const thirtyMinutes = 30 * 60 * 1000;
      const twoHours = 2 * 60 * 60 * 1000;
      
      // Check if we should send notification:
      // 1. If it's 30 minutes before class (within 1 minute window)
      // 2. OR if it's the start of an hour and class is within next 2 hours
      const shouldNotify = 
        (timeUntilClass >= (thirtyMinutes - 60000) && timeUntilClass <= (thirtyMinutes + 60000)) ||
        (currentMinute === 0 && timeUntilClass > 0 && timeUntilClass <= twoHours);

      if (shouldNotify && classStartTime > now) {
        // Check if a live class already exists for this timetable today
        const LiveClass = require('../models/LiveClass');
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);
        
        const existingClass = await LiveClass.findOne({
          timetableId: timetable._id,
          scheduledStartTime: {
            $gte: todayStart,
            $lte: todayEnd
          }
        });

        // Only send notification if no live class exists yet
        if (!existingClass) {
          const className = classItem.type === 'regular' 
            ? `Class ${classItem.class} ${classItem.board}` 
            : classItem.name || 'Preparation Class';
          
          const minutesUntilClass = Math.floor(timeUntilClass / (60 * 1000));
          let notificationBody = '';
          
          if (minutesUntilClass <= 30) {
            notificationBody = `${subject.name} class for ${className} starts in ${minutesUntilClass} minutes. Create live class now!`;
          } else {
            notificationBody = `${subject.name} class for ${className} is scheduled at ${timetable.startTime}. Create live class now!`;
          }

          try {
            const notificationTitle = 'Create Live Class';
            const notificationData = {
              type: 'timetable_class_reminder',
              timetableId: timetable._id.toString(),
              classId: classItem._id.toString(),
              subjectId: subject._id.toString(),
              className: className,
              subjectName: subject.name,
              startTime: timetable.startTime,
              endTime: timetable.endTime,
              dayOfWeek: currentDay,
              topic: timetable.topic || '',
              url: '/teacher/create-live-class'
            };

            await notificationService.sendToUser(
              teacher._id.toString(),
              'teacher',
              { title: notificationTitle, body: notificationBody },
              notificationData
            );

            console.log(`✓ Notification sent to teacher ${teacher.name} for ${subject.name} class at ${timetable.startTime}`);
            
            // Mark notification as sent
            timetable.notificationSent = true;
            timetable.notificationSentAt = new Date();
            await timetable.save();
          } catch (error) {
            console.error(`Error sending notification to teacher ${teacher._id}:`, error);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error in timetable class creation notification scheduler:', error);
  }
};

/**
 * Send notifications for upcoming classes (5 minutes before - for students)
 */
const sendTimetableNotifications = async () => {
  try {
    const now = new Date();
    const currentDay = getDayName(now);
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;

    // Find all active timetables for today
    const timetables = await Timetable.find({
      dayOfWeek: currentDay,
      isActive: true
    })
      .populate('classId', 'type class board name classCode')
      .populate('subjectId', 'name')
      .populate('teacherId', 'name email phone fcmToken fcmTokens');

    for (const timetable of timetables) {
      const [startHour, startMin] = timetable.startTime.split(':').map(Number);
      
      // Create class start time for today
      const classStartTime = new Date();
      classStartTime.setHours(startHour, startMin, 0, 0);
      
      // Create notification time (5 minutes before class start)
      const notificationTime = new Date(classStartTime);
      notificationTime.setMinutes(notificationTime.getMinutes() - 5);
      
      // Check if it's time to send notification (within 1 minute window around 5-min-before time)
      const timeDiff = notificationTime.getTime() - now.getTime();
      const oneMinute = 60 * 1000;

      // Send notification if we're within 1 minute of the 5-minute-before time
      // Only send if notification time hasn't passed yet and class hasn't started
      if (timeDiff >= -oneMinute && timeDiff <= oneMinute && classStartTime > now) {
        const classItem = timetable.classId;
        const subject = timetable.subjectId;
        const teacher = timetable.teacherId;

        // Send notification to teacher (check all FCM token types)
        if (teacher && (teacher.fcmToken || teacher.fcmTokens?.app || teacher.fcmTokens?.web)) {
          try {
            const teacherNotification = {
              title: 'Live Class Starting Soon',
              body: `${subject.name} class starts in 5 minutes for ${classItem.type === 'regular' ? `Class ${classItem.class} ${classItem.board}` : classItem.name}`
            };

            const teacherResult = await notificationService.sendToUser(
              teacher._id.toString(),
              'teacher',
              teacherNotification,
              {
                type: 'live_class',
                timetableId: timetable._id.toString(),
                classId: classItem._id.toString(),
                subjectId: subject._id.toString(),
                startTime: timetable.startTime,
                endTime: timetable.endTime
              }
            );

            if (teacherResult.success) {
              console.log(`✓ Notification sent to teacher ${teacher.name} for class at ${timetable.startTime}`);
            }
          } catch (error) {
            console.error(`Error sending notification to teacher ${teacher._id}:`, error);
          }
        }

        // Send notification to students in the class
        try {
          let students = [];
          
          if (classItem.type === 'regular') {
            // Find students by class and board
            students = await Student.find({
              class: classItem.class,
              board: classItem.board,
              $and: [
                {
                  $or: [
                    { fcmToken: { $exists: true, $ne: null } },
                    { 'fcmTokens.app': { $exists: true, $ne: null } },
                    { 'fcmTokens.web': { $exists: true, $ne: null } }
                  ]
                },
                {
                  $or: [
                    { 'subscription.status': 'active', 'subscription.endDate': { $gt: now } },
                    { 'activeSubscriptions': { $exists: true, $ne: [] } }
                  ]
                }
              ]
            });
          } else {
            // For preparation classes, find students with active subscriptions for this class
            // This would require checking subscription plans linked to this class
            // For now, we'll skip preparation class students or implement based on subscription plans
            students = [];
          }

          if (students.length > 0) {
            // Get all tokens (app + web) from each student
            const notificationService = require('./notificationService');
            const studentFcmTokens = [];
            for (const student of students) {
              const tokens = notificationService.getUserFcmTokens(student);
              studentFcmTokens.push(...tokens);
            }
            
            if (studentFcmTokens.length > 0) {
              const studentNotification = {
                title: 'Live Class Starting Soon',
                body: `${subject.name} class starts in 5 minutes`
              };

              const studentResult = await notificationService.sendToMultipleTokens(
                studentFcmTokens,
                studentNotification,
                {
                  type: 'live_class',
                  timetableId: timetable._id.toString(),
                  classId: classItem._id.toString(),
                  subjectId: subject._id.toString(),
                  startTime: timetable.startTime,
                  endTime: timetable.endTime
                }
              );

              // Save notifications to database
              if (studentResult.success && studentResult.successCount > 0) {
                const notificationsToSave = students
                  .map((student, index) => {
                    const response = studentResult.responses[index];
                    if (response && response.success) {
                      return {
                        userId: student._id,
                        userType: 'student',
                        title: studentNotification.title,
                        body: studentNotification.body,
                        data: {
                          type: 'live_class',
                          timetableId: timetable._id.toString(),
                          classId: classItem._id.toString(),
                          subjectId: subject._id.toString(),
                          startTime: timetable.startTime,
                          endTime: timetable.endTime
                        },
                        type: 'live_class',
                        fcmMessageId: response.messageId
                      };
                    }
                    return null;
                  })
                  .filter(Boolean);

                if (notificationsToSave.length > 0) {
                  await Notification.insertMany(notificationsToSave);
                }
              }

              console.log(`✓ Notifications sent to ${studentResult.successCount} students for class at ${timetable.startTime}`);
            }
          }
        } catch (error) {
          console.error(`Error sending notifications to students for timetable ${timetable._id}:`, error);
        }

        // Mark notification as sent
        timetable.notificationSent = true;
        timetable.notificationSentAt = new Date();
        await timetable.save();
      }
    }
  } catch (error) {
    console.error('Error in timetable notification scheduler:', error);
  }
};

/**
 * Reset notification flags for new day
 * Run at midnight to reset notificationSent flags
 */
const resetNotificationFlags = async () => {
  try {
    const result = await Timetable.updateMany(
      { notificationSent: true },
      { 
        $set: { 
          notificationSent: false,
          notificationSentAt: null
        }
      }
    );
    console.log(`✓ Reset notification flags for ${result.modifiedCount} timetables`);
  } catch (error) {
    console.error('Error resetting notification flags:', error);
  }
};

/**
 * Initialize timetable notification scheduler
 */
const initializeTimetableScheduler = () => {
  // Run every minute to check for classes starting in 5 minutes (for students)
  cron.schedule('* * * * *', () => {
    sendTimetableNotifications();
  });

  // Run every hour at the start to notify teachers about upcoming classes
  cron.schedule('0 * * * *', () => {
    sendTimetableClassCreationNotifications();
  });

  // Also run every minute to catch 30-minute-before notifications
  cron.schedule('* * * * *', () => {
    sendTimetableClassCreationNotifications();
  });

  // Reset notification flags at midnight
  cron.schedule('0 0 * * *', () => {
    resetNotificationFlags();
  });

  console.log('✓ Timetable notification scheduler initialized');
  console.log('  - Checking for upcoming classes every minute (student notifications)');
  console.log('  - Notifying teachers to create classes (every hour + 30 min before)');
  console.log('  - Resetting notification flags at midnight');
};

module.exports = {
  initializeTimetableScheduler,
  sendTimetableNotifications,
  sendTimetableClassCreationNotifications,
  resetNotificationFlags
};

