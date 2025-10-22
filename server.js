require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const webpush = require('web-push');
const cron = require('node-cron');
const Task = require('./models/Task');
const User = require('./models/User');

// --- Cấu hình (Không đổi) ---
const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.static('public'));
app.use(express.json());
try {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT, process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
    console.log("✅ VAPID keys đã được cấu hình.");
} catch (error) {
    console.error("❌ LỖI CẤU HÌNH VAPID KEYS:", error);
}
app.use('/api/tasks', require('./routes/taskRoutes'));
app.use('/api/users', require('./routes/authRoutes'));
app.use('/api/push', require('./routes/pushRoutes'));
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('✅ Kết nối MongoDB thành công!');
        app.listen(PORT, () => console.log(`🚀 Server đang chạy tại Port: ${PORT}`));
    })
    .catch((err) => console.error('❌ Lỗi kết nối MongoDB:', err));

const REMINDER_MAP = {
    '5m': 5,
    '15m': 15,
    '30m': 30,
    '1h': 60,
    '2h': 120,
    '5h': 300,
};

// --- Tác vụ kiểm tra định kỳ (Cron Job)
cron.schedule('* * * * *', async () => {
    const now = new Date();
    console.log(`[${now.toISOString()}] Cron job: Bắt đầu kiểm tra...`);

    try {
        // 1. Tìm TẤT CẢ các nhiệm vụ chưa hoàn thành và còn hạn
        const allTasks = await Task.find({
            isCompleted: false,
            dueDate: { $gt: now }
        });

        console.log(` -> Tìm thấy ${allTasks.length} nhiệm vụ đang hoạt động.`);

        // 2. Lặp qua từng task và xử lý logic
        for (const task of allTasks) {
            const dueDate = new Date(task.dueDate);

            // 3. Lặp qua các mốc thời gian mà người dùng đã chọn
            for (const reminderKey of task.reminderTimes) {
                const minutesBefore = REMINDER_MAP[reminderKey];
                if (!minutesBefore) continue; // Bỏ qua nếu key không hợp lệ

                // 4. Tính toán thời điểm gửi thông báo
                const reminderTime = new Date(dueDate.getTime() - minutesBefore * 60 * 1000);

                // 5. Kiểm tra xem đã đến lúc gửi thông báo chưa (trong vòng 1 phút qua)
                const isDue = reminderTime <= now && reminderTime > new Date(now.getTime() - 60 * 1000);
                
                // 6. Kiểm tra xem đã gửi thông báo này bao giờ chưa
                const notifiedKey = `upcoming_${reminderKey}`; // vd: 'upcoming_15m'
                const hasNotified = task.notified.get(notifiedKey);

                if (isDue && !hasNotified) {
                    await sendNotificationForTask(task, 'upcoming', reminderKey, minutesBefore);
                }
            }

            // 7. Xử lý thông báo "Đã đến hạn" (như cũ)
            const isTaskDue = dueDate <= now && dueDate > new Date(now.getTime() - 60 * 1000);
            if (isTaskDue && !task.notified.get('due')) {
                await sendNotificationForTask(task, 'due');
            }
        }
    } catch (error) {
        console.error('❌ Lỗi nghiêm trọng trong cron job:', error);
    }
    console.log(`[${new Date().toISOString()}] Cron job: Kết thúc chu kỳ.`);
});
// Hàm trợ giúp để gửi thông báo và cập nhật DB
async function sendNotificationForTask(task, type, reminderKey = '', minutesBefore = 0) {
    const user = await User.findById(task.user);
    if (!user || !user.pushSubscription) return;

    let bodyText = '';
    let notifiedKey = '';

    if (type === 'upcoming') {
        bodyText = `Nhiệm vụ "${task.title}" sẽ hết hạn trong khoảng ${reminderKey.replace('m', ' phút').replace('h', ' tiếng')} nữa!`;
        notifiedKey = `upcoming_${reminderKey}`; // vd: 'upcoming_15m'
    } else { // type === 'due'
        bodyText = `Đã đến hạn hoàn thành nhiệm vụ "${task.title}"!`;
        notifiedKey = 'due';
    }

    const payload = JSON.stringify({ title: '🔔 Nhắc nhở nhiệm vụ!', body: bodyText });

    try {
        console.log(`   - Chuẩn bị gửi thông báo "${notifiedKey}" cho task: "${task.title}"...`);
        await webpush.sendNotification(user.pushSubscription, payload);
        console.log(`   - ✅ Gửi thành công!`);
        
        // Đánh dấu đã thông báo bằng cách cập nhật Map
        // Sử dụng $set để cập nhật một trường cụ thể trong Map
        await Task.findByIdAndUpdate(task._id, { $set: { [`notified.${notiedKey}`]: true } });

    } catch (error) {
        if (error.statusCode === 410) {
            console.log(`   - ❗ Subscription hết hạn cho user ${user.email}. Đang xóa...`);
            user.pushSubscription = null;
            await user.save();
        } else {
            console.error(`   - ❌ Lỗi khi gửi thông báo:`, error.body || error);
        }
    }
}