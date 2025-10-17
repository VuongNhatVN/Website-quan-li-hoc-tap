const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
  // 1. Lấy token từ header
  const token = req.header('Authorization')?.split(' ')[1]; // Lấy phần token sau "Bearer "

  // 2. Kiểm tra nếu không có token
  if (!token) {
    return res.status(401).json({ message: 'Không có token, truy cập bị từ chối' });
  }

  // 3. Xác thực token
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.user; // Gắn thông tin người dùng vào request
    next(); // Cho phép đi tiếp
  } catch (err) {
    res.status(401).json({ message: 'Token không hợp lệ' });
  }
};