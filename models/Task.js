// models/Task.js
const mongoose = require('mongoose');

// Đây là bản thiết kế (Schema) cho một Task
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
  user: { // <-- THÊM TRƯỜNG NÀY
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  notified: {
    type: Object,
    default: { upcoming: false, due: false }
  }
}, { timestamps: true }); // Tự động thêm 2 trường createdAt và updatedAt
// "Biên dịch" bản thiết kế thành một Model (Mô hình)
// Model này là thứ chúng ta sẽ dùng để tương tác với collection "tasks" trong DB
const Task = mongoose.model('Task', taskSchema);

module.exports = Task; // Xuất Model ra để các file khác có thể dùng