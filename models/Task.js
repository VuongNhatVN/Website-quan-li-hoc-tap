const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Tiêu đề là bắt buộc'],
  },
  dueDate: {
    type: Date,
    required: [true, 'Hạn chót là bắt buộc'],
  },
  isCompleted: {
    type: Boolean,
    default: false,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // MỚI: Mảng lưu các mốc thời gian nhắc nhở (vd: '5m', '15m', '1h')
  reminderTimes: {
    type: [String],
    default: []
  },
  // CẬP NHẬT: Dùng Map để lưu động trạng thái thông báo
  notified: {
    type: Map,
    of: Boolean,
    default: {}
  }
}, { timestamps: true });

module.exports = mongoose.model('Task', taskSchema);