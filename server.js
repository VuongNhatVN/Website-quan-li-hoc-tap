// server.js
require('dotenv').config(); // Nạp các biến môi trường từ file .env
const express = require('express');
const mongoose = require('mongoose'); // Thêm mongoose

const app = express();
const PORT = process.env.PORT || 3000;
const taskRoutes = require('./routes/taskRoutes');
const authRoutes = require('./routes/authRoutes');

app.use(express.json());
app.use(express.static('public'));

// Định nghĩa route gốc
app.get('/', (req, res) => {
  res.send('Server đã sẵn sàng!');
});

// Bất kỳ yêu cầu nào tới /api/tasks, hãy để taskRoutes xử lý
app.use('/api/tasks', taskRoutes);
app.use('/api/users', authRoutes);

// Kết nối tới MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Kết nối thành công tới MongoDB!');
    // Chỉ sau khi kết nối DB thành công, chúng ta mới chạy server
    app.listen(PORT, () => {
      console.log(`Server đang chạy tại http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Lỗi kết nối MongoDB:', err);
  });
// Chú ý: Di chuyển app.listen vào trong .then()
