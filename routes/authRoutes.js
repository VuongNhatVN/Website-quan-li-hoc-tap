const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Nhập User model

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

    // 1. Tìm người dùng trong DB
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Email hoặc mật khẩu không đúng' });
    }

    // 2. So sánh mật khẩu
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Email hoặc mật khẩu không đúng' });
    }

    // 3. Tạo và cấp "giấy thông hành" (JWT)
    const payload = { user: { id: user.id } };
    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '1h' } // Token hết hạn sau 1 giờ
    );

    res.json({
      token,
      fullName: user.fullName
    });

  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

module.exports = router;