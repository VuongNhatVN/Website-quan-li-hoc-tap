require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const webpush = require('web-push');
const cron = require('node-cron');
const Task = require('./models/Task');
const User = require('./models/User');

// --- Cấu hình Express ---
const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.static('public'));
app.use(express.json());

// --- Cấu hình Web Push ---
try {
    webpush.setVapidDetails(
        process.env.VAPID_SUBJECT,
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    );
    console.log("✅ VAPID keys đã được cấu hình thành công.");
} catch (error) {
    console.error("❌ LỖI NGHIÊM TRỌNG: Không thể cấu hình VAPID keys. Hãy kiểm tra file .env và các biến môi trường trên Render.", error);
}

// --- Routes ---
app.use('/api/tasks', require('./routes/taskRoutes'));
app.use('/api/users', require('./routes/authRoutes'));
app.use('/api/push', require('./routes/pushRoutes'));

// --- Kết nối DB và khởi chạy Server ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('✅ Kết nối thành công tới MongoDB!');
        app.listen(PORT, () => console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`));
    })
    .catch((err) => console.error('❌ Lỗi kết nối MongoDB:', err));

// --- Tác vụ kiểm tra định kỳ (Cron Job) ---
cron.schedule('* * * * *', async () => {
    console.log(`[${new Date().toLocaleTimeString()}] Cron job: Bắt đầu kiểm tra các nhiệm vụ...`);
    
    try {
        const now = new Date();
        const fifteenMinutesFromNow = new Date(now.getTime() + 15 * 60 * 1000);

        const tasksToNotify = await Task.find({
            isCompleted: false,
            dueDate: { $lte: fifteenMinutesFromNow, $gt: now }, // Tìm task trong 15 phút tới
            'notified.upcoming': { $ne: true } // Chỉ lấy những task chưa được thông báo "sắp đến hạn"
        });

        console.log(`-> Tìm thấy ${tasksToNotify.length} nhiệm vụ sắp đến hạn cần thông báo.`);

        for (const task of tasksToNotify) {
            const user = await User.findById(task.user);
            if (user && user.pushSubscription) {
                const payload = JSON.stringify({
                    title: '🔔 Nhắc nhở nhiệm vụ!',
                    body: `Nhiệm vụ "${task.title}" sẽ hết hạn trong vòng 15 phút nữa!`
                });
                
                try {
                    console.log(`   - Đang chuẩn bị gửi thông báo cho task: "${task.title}"...`);
                    await webpush.sendNotification(user.pushSubscription, payload);
                    console.log(`   - ✅ Đã gửi thông báo thành công!`);

                    // Đánh dấu là đã thông báo để không gửi lại
                    task.notified = { ...task.notified, upcoming: true };
                    await task.save();

                } catch (error) {
                    // Nếu subscription hết hạn (lỗi 410), xóa nó đi
                    if (error.statusCode === 410) {
                        console.log(`   - ❗ Subscription cho user ${user.email} đã hết hạn. Đang xóa...`);
                        user.pushSubscription = null;
                        await user.save();
                    } else {
                        console.error(`   - ❌ Lỗi khi gửi thông báo cho task "${task.title}":`, error.body || error);
                    }
                }
            }
        }
    } catch (error) {
        console.error('❌ Lỗi nghiêm trọng trong cron job:', error);
    }
    console.log(`[${new Date().toLocaleTimeString()}] Cron job: Kết thúc chu kỳ kiểm tra.`);
});

// Thêm một trường 'notified' vào Task model để theo dõi
// Mở file models/Task.js và thêm vào schema:
// notified: { type: Object, default: { upcoming: false, due: false } }