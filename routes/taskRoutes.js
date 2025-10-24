const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const authMiddleware = require('../middleware/authMiddleware');

// Áp dụng middleware cho tất cả các route bên dưới
router.use(authMiddleware);

// GET: Lấy tất cả nhiệm vụ CỦA NGƯỜI DÙNG HIỆN TẠI
router.get('/', async (req, res) => {
    try {
        const tasks = await Task.find({ user: req.user.id }).sort({ dueDate: 1 });
        res.json(tasks);
    } catch (err) {
        res.status(500).send('Lỗi Server');
    }
});

// POST: Tạo nhiệm vụ mới
router.post('/', async (req, res) => {
    const { title, dueDate, reminderTimes, color } = req.body;
    if (!dueDate || isNaN(new Date(dueDate).getTime())) {
        return res.status(400).json({ message: 'Ngày hết hạn không hợp lệ.' });
    }
    try {
        const newTask = new Task({
            title,
            dueDate: new Date(dueDate), // Đảm bảo lưu dưới dạng Date
            reminderTimes,
            color,
            user: req.user.id,
            notified: new Map() // Khởi tạo Map rỗng
        });
        const savedTask = await newTask.save();
        res.status(201).json(savedTask);
    } catch (error) {
        console.error("Lỗi khi tạo task:", error); // Thêm log lỗi chi tiết
        res.status(400).json({ message: error.message || 'Không thể tạo nhiệm vụ.' });
    }
});

// PATCH: Cập nhật một nhiệm vụ
router.patch('/:id', async (req, res) => {
    try {
        let task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ message: 'Không tìm thấy nhiệm vụ' });

        // KIỂM TRA QUYỀN SỞ HỮU
        if (task.user.toString() !== req.user.id) {
            return res.status(401).json({ message: 'Không có quyền thực hiện hành động này' });
        }

        const updatedTask = await Task.findByIdAndUpdate(
            req.params.id,
            req.body.color,
            req.body,
            { new: true }
        );
        res.json(updatedTask);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// DELETE: Xóa một nhiệm vụ
router.delete('/:id', async (req, res) => {
    try {
        let task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ message: 'Không tìm thấy nhiệm vụ' });

        // KIỂM TRA QUYỀN SỞ HỮU
        if (task.user.toString() !== req.user.id) {
            return res.status(401).json({ message: 'Không có quyền thực hiện hành động này' });
        }
        
        await Task.findByIdAndDelete(req.params.id);
        res.json({ message: 'Đã xóa nhiệm vụ thành công' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;