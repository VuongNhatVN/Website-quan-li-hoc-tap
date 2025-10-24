const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');

// === ĐĂNG KÝ (REGISTER) ===
router.post('/register', async (req, res) => {
  try {
    const { fullName, email, password, confirmPassword } = req.body;
    //0. Kiểm tra nhập lại mật khẩu
    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Mật khẩu nhập lại không khớp' });
    }

    // 1. Kiểm tra người dùng đã tồn tại chưa
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'Email đã được sử dụng' });
    }

    // 2. Băm mật khẩu
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 3. Tạo người dùng mới và lưu vào DB
    user = new User({ fullName, email, password: hashedPassword });
    await user.save();

    res.status(201).json({ message: 'Đăng ký thành công!' });

  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// === ĐĂNG NHẬP (LOGIN) ===
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Email hoặc mật khẩu không đúng' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Email hoặc mật khẩu không đúng' });
    }
    const payload = { user: { id: user.id } };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

    // Gửi cả token, fullName, và cài đặt nhắc nhở đã lưu
    res.json({
      token,
      fullName: user.fullName,
      preferredReminders: user.preferredReminders // Gửi cài đặt về
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});
// === LƯU ===
router.put('/preferences', authMiddleware, async (req, res) => {
  try {
    const { preferredReminders } = req.body;
    // Validate đầu vào là một mảng string
    if (!Array.isArray(preferredReminders) || !preferredReminders.every(item => typeof item === 'string')) {
         return res.status(400).json({ message: 'Dữ liệu cài đặt không hợp lệ.' });
    }
    await User.findByIdAndUpdate(req.user.id, { preferredReminders });
    res.status(200).json({ message: 'Cài đặt đã được lưu.' });
  } catch (error) {
    console.error('Lỗi lưu cài đặt:', error);
    res.status(500).json({ message: 'Lỗi server khi lưu cài đặt.' });
  }
});

module.exports = router;