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
} catch (error) { console.error("❌ LỖI CẤU HÌNH VAPID KEYS:", error); }
app.use('/api/tasks', require('./routes/taskRoutes'));
app.use('/api/users', require('./routes/authRoutes'));
app.use('/api/push', require('./routes/pushRoutes'));
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('✅ Kết nối MongoDB thành công!');
        app.listen(PORT, () => console.log(`🚀 Server đang chạy tại Port: ${PORT}`));
    })
    .catch((err) => console.error('❌ Lỗi kết nối MongoDB:', err));

// --- Bảng tra cứu thời gian---
const REMINDER_MAP = { '5m': 5, '15m': 15, '30m': 30, '1h': 60, '2h': 120, '5h': 300 };

// --- Tác vụ kiểm tra định kỳ (Cron Job) - PHIÊN BẢN HOÀN CHỈNH ---
cron.schedule('* * * * *', async () => { // Chạy mỗi phút
    const now = new Date();
    console.log(`[${now.toISOString()}] Cron job: Bắt đầu kiểm tra...`);

    try {
        // Lấy tất cả task chưa hoàn thành (cả còn hạn và quá hạn một chút)
        const potentialTasks = await Task.find({
            isCompleted: false,
            // Lấy cả những task đã quá hạn gần đây để xử lý 'due' notification
            dueDate: { $gt: new Date(now.getTime() - 2 * 60 * 1000) } // Lấy task quá hạn trong 2 phút gần nhất
        }).populate('user', 'pushSubscription email'); // Lấy luôn thông tin user cần thiết

        console.log(` -> Tìm thấy ${potentialTasks.length} nhiệm vụ có khả năng cần thông báo.`);

        for (const task of potentialTasks) {
            const dueDate = new Date(task.dueDate);

            // --- Xử lý thông báo "Sắp đến hạn" ---
            // Chỉ xử lý nếu task còn hạn
            if (dueDate > now) {
                for (const reminderKey of task.reminderTimes) {
                    const minutesBefore = REMINDER_MAP[reminderKey];
                    if (!minutesBefore) continue;

                    const reminderTime = new Date(dueDate.getTime() - minutesBefore * 60 * 1000);
                    const notifiedKey = `upcoming_${reminderKey}`;
                    const hasNotified = task.notified.get(notifiedKey);
                    const isTimeToSend = reminderTime <= now && reminderTime > new Date(now.getTime() - 60 * 1000);

                    if (isTimeToSend && !hasNotified) {
                        await sendNotificationForTask(task, 'upcoming', reminderKey);
                    }
                }
            }

            // --- Xử lý thông báo "Đã đến hạn" ---
            const notifiedDueKey = 'due';
            const hasNotifiedDue = task.notified.get(notifiedDueKey);
            // Kiểm tra xem task đã đến hạn trong vòng 1 phút qua
            const isTaskDueNow = dueDate <= now && dueDate > new Date(now.getTime() - 60 * 1000);

            if (isTaskDueNow && !hasNotifiedDue) {
                await sendNotificationForTask(task, 'due');
            }
        }
    } catch (error) {
        console.error('❌ Lỗi nghiêm trọng trong cron job:', error);
    }
    console.log(`[${new Date().toISOString()}] Cron job: Kết thúc chu kỳ.`);
});


// --- Hàm Gửi Thông Báo (Không đổi so với lần sửa trước) ---
async function sendNotificationForTask(task, type, reminderKey = '') {
    const user = task.user;
    if (!user || !user.pushSubscription) return;

    let bodyText = '';
    let notifiedKey = '';

    if (type === 'upcoming') {
        let timeUnit = '';
        if (reminderKey.includes('m')) { timeUnit = reminderKey.replace('m', ' phút'); }
        else if (reminderKey.includes('h')) { timeUnit = reminderKey.replace('h', ' tiếng'); }
        bodyText = `Nhiệm vụ "${task.title}" sẽ hết hạn trong khoảng ${timeUnit} nữa!`;
        notifiedKey = `upcoming_${reminderKey}`;
    } else { // type === 'due'
        bodyText = `Đã đến hạn hoàn thành nhiệm vụ "${task.title}"!`;
        notifiedKey = 'due';
    }

    const payload = JSON.stringify({ title: '🔔 Nhắc nhở nhiệm vụ!', body: bodyText });

    try {
        console.log(`   - Chuẩn bị gửi thông báo "${notifiedKey}" cho task: "${task.title}" tới user ${user.email}...`);
        await webpush.sendNotification(user.pushSubscription, payload);
        console.log(`   - ✅ Gửi thành công!`);
        await Task.findByIdAndUpdate(task._id, { $set: { [`notified.${notifiedKey}`]: true } });
    } catch (error) {
        if (error.statusCode === 410 || error.statusCode === 404) {
            console.log(`   - ❗ Subscription hết hạn/không hợp lệ cho user ${user.email}. Đang xóa...`);
             await User.findByIdAndUpdate(user._id, { pushSubscription: null });
        } else {
            console.error(`   - ❌ Lỗi khi gửi thông báo (${error.statusCode}):`, error.body || error);
        }
    }
}