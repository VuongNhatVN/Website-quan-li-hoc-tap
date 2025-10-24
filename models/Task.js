// models/Task.js
const mongoose = require('mongoose');

// bản thiết kế (Schema) cho một Task
const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Tiêu đề là bắt buộc'], // Bắt buộc phải có
  },
  description: {
    type: String,
    default: '', // Nếu không có thì giá trị mặc định là chuỗi rỗng
  },
  dueDate: {
    type: Date,
    required: [true, 'Hạn chót là bắt buộc'],
  },
  isCompleted: {
    type: Boolean,
    default: false, // Mặc định một task mới là chưa hoàn thành
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reminderTimes: {
    type: [String],
    default: []
  },
  // CẬP NHẬT: Dùng Map để lưu động trạng thái thông báo
  notified: {
    type: Map,
    of: Boolean,
    default: {}
  },
  color: {
    type: String,
    enum: ['Green', 'Yellow', 'Red', 'Blue', 'None'], // Chỉ cho phép các giá trị này
    default: 'None' // Mặc định không có màu
  }
}, { timestamps: true });
const Task = mongoose.model('Task', taskSchema);

module.exports = Task; // Xuất Model ra để các file khác có thể dùng