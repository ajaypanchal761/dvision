const mongoose = require('mongoose');

const teacherAttendanceSchema = new mongoose.Schema(
  {
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher',
      required: true,
    },
    // Store date as start-of-day (00:00 local time) for uniqueness
    date: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['present', 'absent'],
      default: 'present',
    },
  },
  {
    timestamps: true,
  }
);

// One record per teacher per date
teacherAttendanceSchema.index({ teacher: 1, date: 1 }, { unique: true });
teacherAttendanceSchema.index({ date: 1 });

module.exports = mongoose.model('TeacherAttendance', teacherAttendanceSchema);


