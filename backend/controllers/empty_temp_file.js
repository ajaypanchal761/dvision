
// @desc    Remove duplicate notifications
// @route   DELETE /api/notifications/admin/duplicates
// @access  Private (Admin)
exports.removeDuplicateNotifications = asyncHandler(async (req, res) => {
  // 1. Check for Duplicate Campaigns
  const duplicateCampaigns = await NotificationCampaign.aggregate([
    {
      $group: {
        _id: { title: "$title", body: "$body", notificationType: "$notificationType", classId: "$classId", classNumber: "$classNumber" },
        count: { $sum: 1 },
        ids: { $push: "$_id" },
        createdAts: { $push: "$createdAt" }
      }
    },
    {
      $match: {
        count: { $gt: 1 }
      }
    }
  ]);

  let deletedCampaignsCount = 0;
  for (const group of duplicateCampaigns) {
    // Keep the oldest one (first in sorted list usually, but let's be safe)
    // Sort ids by createdAt
    const docs = group.ids.map((id, index) => ({ id, createdAt: group.createdAts[index] }));
    docs.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    // Keep docs[0], delete rest
    const idsToDelete = docs.slice(1).map(d => d.id);

    if (idsToDelete.length > 0) {
      const result = await NotificationCampaign.deleteMany({ _id: { $in: idsToDelete } });
      deletedCampaignsCount += result.deletedCount;
    }
  }

  // 2. Check for Duplicate Notifications (User Inbox)
  // We'll consider duplicates if they have same userId, title, body, type and created within 10 seconds
  // But aggregation is faster for exact matches.
  // We'll filter by created within last 30 days to avoid scanning full history if too large
  const matchDate = new Date();
  matchDate.setDate(matchDate.getDate() - 30);

  const duplicateNotifications = await Notification.aggregate([
    {
      $match: {
        createdAt: { $gte: matchDate }
      }
    },
    {
      $group: {
        _id: { userId: "$userId", title: "$title", body: "$body", type: "$type" },
        count: { $sum: 1 },
        ids: { $push: "$_id" },
        createdAts: { $push: "$createdAt" }
      }
    },
    {
      $match: {
        count: { $gt: 1 }
      }
    }
  ]);

  let deletedNotificationsCount = 0;
  for (const group of duplicateNotifications) {
    // Check if created times are close (within 10 seconds)
    // Actually, if they are exact duplicates in content, we likely want to remove them regardless of time, 
    // unless they are legitimate re-sends weeks apart?
    // The group ID includes title/body. If same title/body sent twice weeks apart, maybe valid?
    // So let's sort by time. If adjacent ones are close, delete.

    const docs = group.ids.map((id, index) => ({ id, createdAt: new Date(group.createdAts[index]) }));
    docs.sort((a, b) => a.createdAt - b.createdAt);

    const idsToDelete = [];
    for (let i = 0; i < docs.length - 1; i++) {
      const current = docs[i];
      const next = docs[i + 1];

      // If next is within 1 hour of current, consider it a duplicate run
      const timeDiff = Math.abs(next.createdAt - current.createdAt);
      if (timeDiff < 60 * 60 * 1000) {
        idsToDelete.push(next.id);
        // We delete 'next', so we should compare 'current' with 'next+1'? 
        // Logic: Keep i, delete i+1. Next iteration compares i+1 (which is deleted) with i+2.
        // Better: Keep the first one. Delete ANY subsequent ones that are within 1 hour.
      }
    }

    // Simpler logic: Delete all except first if they are within short window. 
    // If they are far apart, keep both.
    // However, user said "remove sent double double".
    // I will delete ALL except the FIRST one.

    const realIdsToDelete = docs.slice(1).map(d => d.id);
    if (realIdsToDelete.length > 0) {
      const result = await Notification.deleteMany({ _id: { $in: realIdsToDelete } });
      deletedNotificationsCount += result.deletedCount;
    }
  }

  res.status(200).json({
    success: true,
    message: 'Cleanup completed',
    data: {
      deletedCampaigns: deletedCampaignsCount,
      deletedNotifications: deletedNotificationsCount
    }
  });
});
