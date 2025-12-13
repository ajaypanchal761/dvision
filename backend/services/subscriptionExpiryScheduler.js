const cron = require('node-cron');
const Payment = require('../models/Payment');
const Student = require('../models/Student');
const notificationService = require('./notificationService');
const Notification = require('../models/Notification');

/**
 * Check and notify about expiring subscriptions
 * Runs daily at 9 AM
 */
const checkExpiringSubscriptions = async () => {
  try {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

    // Find subscriptions expiring today or tomorrow
    const expiringPayments = await Payment.find({
      status: 'completed',
      subscriptionEndDate: {
        $gte: tomorrow,
        $lt: dayAfterTomorrow
      }
    })
      .populate({
        path: 'studentId',
        select: 'name phone email fcmToken class board'
      })
      .populate({
        path: 'subscriptionPlanId',
        select: 'name type board classes classId duration',
        populate: {
          path: 'classId',
          select: 'name classCode'
        }
      });

    console.log(`Found ${expiringPayments.length} subscriptions expiring soon`);

    for (const payment of expiringPayments) {
      if (!payment.studentId || !payment.subscriptionPlanId) continue;

      const student = payment.studentId;
      const plan = payment.subscriptionPlanId;
      const endDate = new Date(payment.subscriptionEndDate);
      const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      // Create notification message
      const planType = plan.type === 'regular' ? 'class-based' : 'preparation';
      const planName = plan.type === 'regular' 
        ? `${plan.board} Class ${plan.classes?.join(', ') || ''}`
        : plan.classId?.name || 'Preparation Class';

      const notificationTitle = 'Subscription Expiring Soon';
      const notificationMessage = `Your ${planType} subscription for ${planName} is expiring in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}. Renew now to continue access.`;

      // Create notification in database
      try {
        await Notification.create({
          userId: student._id,
          userType: 'student',
          type: 'subscription_expiry',
          title: notificationTitle,
          message: notificationMessage,
          data: {
            paymentId: payment._id,
            planId: plan._id,
            planType: plan.type,
            endDate: payment.subscriptionEndDate,
            daysRemaining
          }
        });

        // Send push notification
        await notificationService.sendToUser(
          student._id,
          'student',
          {
            title: notificationTitle,
            body: notificationMessage
          },
          {
            type: 'subscription_expiry',
            paymentId: payment._id.toString(),
            planId: plan._id.toString(),
            planType: plan.type
          }
        );
      } catch (err) {
        console.error(`Error sending expiry notification to student ${student._id}:`, err);
      }
    }
  } catch (error) {
    console.error('Error checking expiring subscriptions:', error);
  }
};

/**
 * Check and notify about expired subscriptions
 * Runs daily at 9:30 AM
 */
const checkExpiredSubscriptions = async () => {
  try {
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Find subscriptions that expired today
    const expiredPayments = await Payment.find({
      status: 'completed',
      subscriptionEndDate: {
        $gte: today,
        $lt: tomorrow
      }
    })
      .populate({
        path: 'studentId',
        select: 'name phone email fcmToken class board'
      })
      .populate({
        path: 'subscriptionPlanId',
        select: 'name type board classes classId duration',
        populate: {
          path: 'classId',
          select: 'name classCode'
        }
      });

    console.log(`Found ${expiredPayments.length} expired subscriptions`);

    for (const payment of expiredPayments) {
      if (!payment.studentId || !payment.subscriptionPlanId) continue;

      const student = payment.studentId;
      const plan = payment.subscriptionPlanId;

      // Create notification message
      const planType = plan.type === 'regular' ? 'class-based' : 'preparation';
      const planName = plan.type === 'regular' 
        ? `${plan.board} Class ${plan.classes?.join(', ') || ''}`
        : plan.classId?.name || 'Preparation Class';

      const notificationTitle = 'Subscription Expired';
      const notificationMessage = `Your ${planType} subscription for ${planName} has expired. Purchase a new plan to continue access.`;

      // Create notification in database
      try {
        await Notification.create({
          userId: student._id,
          userType: 'student',
          type: 'subscription_expired',
          title: notificationTitle,
          message: notificationMessage,
          data: {
            paymentId: payment._id,
            planId: plan._id,
            planType: plan.type,
            endDate: payment.subscriptionEndDate
          }
        });

        // Send push notification
        await notificationService.sendToUser(
          student._id,
          'student',
          {
            title: notificationTitle,
            body: notificationMessage
          },
          {
            type: 'subscription_expired',
            paymentId: payment._id.toString(),
            planId: plan._id.toString(),
            planType: plan.type
          }
        );
      } catch (err) {
        console.error(`Error sending expired notification to student ${student._id}:`, err);
      }
    }
  } catch (error) {
    console.error('Error checking expired subscriptions:', error);
  }
};

/**
 * Initialize subscription expiry scheduler
 */
const initializeSubscriptionExpiryScheduler = () => {
  // Check for expiring subscriptions daily at 9 AM
  cron.schedule('0 9 * * *', async () => {
    console.log('Running subscription expiry check (expiring soon)...');
    await checkExpiringSubscriptions();
  });

  // Check for expired subscriptions daily at 9:30 AM
  cron.schedule('30 9 * * *', async () => {
    console.log('Running subscription expiry check (expired)...');
    await checkExpiredSubscriptions();
  });

  console.log('✓ Subscription expiry scheduler initialized');
  console.log('  - Expiring subscriptions check: Daily at 9:00 AM');
  console.log('  - Expired subscriptions check: Daily at 9:30 AM');
};

module.exports = {
  initializeSubscriptionExpiryScheduler,
  checkExpiringSubscriptions,
  checkExpiredSubscriptions
};

