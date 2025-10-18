// server.js
require('dotenv').config(); // Nạp các biến môi trường từ file .env
const express = require('express');
const mongoose = require('mongoose'); // Thêm mongoose
const webpush = require('web-push');
const cron = require('node-cron');
const Task = require('./models/Task');
const User = require('./models/User');

const app = express();
const PORT = process.env.PORT || 3000;
const taskRoutes = require('./routes/taskRoutes');
const authRoutes = require('./routes/authRoutes');

cron.schedule('* * * * *', async () => {
    console.log(`[${new Date().toLocaleTimeString()}] Cron job: Đang kiểm tra các nhiệm vụ...`);
    
    try {
        const now = new Date();
        // Tìm các nhiệm vụ sắp đến hạn trong 15 phút tới
        const upcomingTasks = await Task.find({
            isCompleted: false,
            dueDate: { $lte: new Date(now.getTime() + 15 * 60 * 1000), $gt: now }
        });

        for (const task of upcomingTasks) {
            const user = await User.findById(task.user);
            if (user && user.pushSubscription) {
                const payload = JSON.stringify({
                    title: '🔔 Nhắc nhở nhiệm vụ!',
                    body: `Nhiệm vụ "${task.title}" còn ${minutesLeft} nữa sẽ hết hạn.`
                });
                
                // Gửi thông báo
                await webpush.sendNotification(user.pushSubscription, payload);
                console.log(`Đã gửi thông báo cho task: ${task.title}`);
            }
        }
    } catch (error) {
        console.error('Lỗi trong cron job:', error);
    }
});

webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
);
const pushRoutes = require('./routes/pushRoutes');
app.use('/api/push', pushRoutes);

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
