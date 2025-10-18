const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email là bắt buộc'],
    unique: true, // Đảm bảo mỗi email chỉ được đăng ký một lần
    match: [/.+\@.+\..+/, 'Vui lòng nhập email hợp lệ'],
  },
  password: {
    type: String,
    required: [true, 'Mật khẩu là bắt buộc'],
  },
  pushSubscription: {
    type: Object,
    default: null
  },
}, { timestamps: true });
module.exports = mongoose.model('User', userSchema);