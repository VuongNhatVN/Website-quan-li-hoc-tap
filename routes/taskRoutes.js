// routes/taskRoutes.js
const express = require('express');
const router = express.Router();
const Task = require('../models/Task'); // Nhập Model Task vào
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

// 1. GET: Lấy tất cả các nhiệm vụ
router.get('/', async (req, res) => {
  try {
    // Chỉ tìm các task có user ID khớp với ID của người dùng đã đăng nhập
    const tasks = await Task.find({ user: req.user.id }).sort({ dueDate: 1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).send('Lỗi Server');
  }
});

// 2. POST: Tạo một nhiệm vụ mới
router.post('/', async (req, res) => {
  const newTask = new Task({
        title: req.body.title,
        description: req.body.description,
        dueDate: req.body.dueDate,
        user: req.user.id // <-- Gắn ID người dùng vào nhiệm vụ mới
    });

  try {
    const savedTask = await newTask.save();
    res.status(201).json(savedTask);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});
// 3.
router.get('/:id', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Không tìm thấy nhiệm vụ' }); // 404 Not Found
    res.status(200).json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 4. PATCH: Cập nhật một nhiệm vụ (thường dùng để sửa một vài thông tin) 🔄
router.patch('/:id', async (req, res) => {
  try {
    const updatedTask = await Task.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true } // { new: true } để trả về task sau khi đã cập nhật
    );
    if (!updatedTask) return res.status(404).json({ message: 'Không tìm thấy nhiệm vụ' });
    res.status(200).json(updatedTask);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// 5. DELETE: Xóa một nhiệm vụ 🗑️
router.delete('/:id', async (req, res) => {
  try {
    const deletedTask = await Task.findByIdAndDelete(req.params.id);
    if (!deletedTask) return res.status(404).json({ message: 'Không tìm thấy nhiệm vụ' });
    res.status(200).json({ message: 'Đã xóa nhiệm vụ thành công' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;