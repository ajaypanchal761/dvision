const Payment = require('../models/Payment');
const SubscriptionPlan = require('../models/SubscriptionPlan');

/**
 * Get all active subscriptions for a student
 * Checks both activeSubscriptions array and Payment records
 * @param {Object} student - Student document
 * @returns {Promise<Array>} Array of active subscriptions with populated plan details
 */
async function getActiveSubscriptions(student) {
  const now = new Date();
  const activeSubs = [];

  // Get from activeSubscriptions array (preferred source)
  if (student.activeSubscriptions && student.activeSubscriptions.length > 0) {
    const validSubs = student.activeSubscriptions.filter(sub => 
      new Date(sub.endDate) >= now
    );

    // Populate plan details
    for (const sub of validSubs) {
      const plan = await SubscriptionPlan.findById(sub.planId)
        .populate('classId', 'name description classCode')
        .select('name type board classes classId duration price originalPrice description features');
      
      if (plan) {
        activeSubs.push({
          _id: sub.paymentId,
          plan: plan,
          startDate: sub.startDate,
          endDate: sub.endDate,
          type: sub.type,
          board: sub.board,
          class: sub.class,
          classId: sub.classId,
          source: 'activeSubscriptions'
        });
      }
    }
  }

  // Also get from payments (for backward compatibility and to catch any missed)
  const activePayments = await Payment.find({
    studentId: student._id,
    status: 'completed',
    subscriptionEndDate: { $gte: now }
  })
    .populate({
      path: 'subscriptionPlanId',
      select: 'name type board classes classId duration price originalPrice description features',
      populate: {
        path: 'classId',
        select: 'name description classCode'
      }
    })
    .sort({ subscriptionEndDate: -1 });

  // Add payments that aren't already in activeSubscriptions
  for (const payment of activePayments) {
    const alreadyExists = activeSubs.some(sub => 
      sub._id.toString() === payment._id.toString()
    );
    
    if (!alreadyExists && payment.subscriptionPlanId) {
      activeSubs.push({
        _id: payment._id,
        plan: payment.subscriptionPlanId,
        startDate: payment.subscriptionStartDate,
        endDate: payment.subscriptionEndDate,
        type: payment.subscriptionPlanId.type,
        board: payment.subscriptionPlanId.board,
        class: payment.subscriptionPlanId.classes?.[0],
        classId: payment.subscriptionPlanId.classId,
        source: 'payment'
      });
    }
  }

  return activeSubs;
}

/**
 * Check if student has active subscription for regular class
 * @param {Object} student - Student document
 * @param {Array} activeSubs - Active subscriptions (from getActiveSubscriptions)
 * @returns {boolean}
 */
function hasActiveClassSubscription(student, activeSubs) {
  return activeSubs.some(sub => 
    sub.type === 'regular' && 
    sub.board === student.board && 
    sub.plan?.classes && 
    sub.plan.classes.includes(student.class)
  );
}

/**
 * Get preparation class IDs from active subscriptions
 * @param {Array} activeSubs - Active subscriptions (from getActiveSubscriptions)
 * @returns {Array} Array of preparation class IDs
 */
function getPreparationClassIds(activeSubs) {
  return activeSubs
    .filter(sub => sub.type === 'preparation' && sub.classId)
    .map(sub => sub.classId._id || sub.classId)
    .filter(Boolean);
}

module.exports = {
  getActiveSubscriptions,
  hasActiveClassSubscription,
  getPreparationClassIds
};

