const express = require('express');
const router = express.Router();
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');

// Route 1: Cung cấp VAPID Public Key cho frontend
router.get('/vapid-public-key', (req, res) => {
    res.send(process.env.VAPID_PUBLIC_KEY);
});

// Route 2: Nhận và lưu subscription của người dùng
router.post('/subscribe', authMiddleware, async (req, res) => { // Thêm authMiddleware
  const subscription = req.body;

  try {
    // Tìm và cập nhật user đang đăng nhập
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id, // Lấy user ID từ middleware
      { pushSubscription: subscription },
      { new: true }
    );

    if (!updatedUser) {
        return res.status(404).json({ message: 'Không tìm thấy người dùng.' });
    }

    console.log('Đã lưu subscription cho user:', updatedUser.username);
    res.status(201).json({});

    // Gửi thông báo chào mừng (tùy chọn)
    const payload = JSON.stringify({ title: 'Đăng ký thông báo thành công!', body: 'Bạn sẽ nhận được nhắc nhở nhiệm vụ.' });
    webpush.sendNotification(subscription, payload).catch(error => console.error('Lỗi gửi thông báo chào mừng:', error));

  } catch (error) {
    console.error('Lỗi lưu subscription:', error);
    res.status(500).json({ message: 'Lỗi máy chủ khi lưu subscription.' });
  }
});

module.exports = router;