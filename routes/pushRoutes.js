const express = require('express');
const router = express.Router();
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');

// Route 1: Cung cấp VAPID Public Key cho frontend
router.get('/vapid-public-key', (req, res) => {
    res.send(process.env.VAPID_PUBLIC_KEY);
});

// Route 2: Nhận và lưu subscription của người dùng
router.post('/subscribe', authMiddleware, async (req, res) => {
    const subscription = req.body;
    try {
        await User.findByIdAndUpdate(req.user.id, { pushSubscription: subscription });
        res.status(201).json({ message: 'Đăng ký nhận thông báo thành công!' });
    } catch (error) {
        console.error('Lỗi khi lưu subscription:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
});

module.exports = router;