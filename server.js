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

// --- Tác vụ kiểm tra định kỳ (Cron Job) - PHIÊN BẢN HOÀN CHỈNH ---
cron.schedule('* * * * *', async () => {
    const now = new Date();
    console.log(`[${now.toISOString()}] Cron job: Bắt đầu kiểm tra...`);

    // --- GỬI THÔNG BÁO "SẮP ĐẾN HẠN" (15 PHÚT) ---
    const fifteenMinutesFromNow = new Date(now.getTime() + 15 * 60 * 1000);
    try {
        const upcomingTasks = await Task.find({
            isCompleted: false,
            dueDate: { $gte: now, $lte: fifteenMinutesFromNow },
            'notified.upcoming': { $ne: true }
        });
        if (upcomingTasks.length > 0) console.log(` -> Tìm thấy ${upcomingTasks.length} nhiệm vụ SẮP đến hạn.`);
        for (const task of upcomingTasks) {
            await sendNotificationForTask(task, 'upcoming');
        }
    } catch (error) {
        console.error('❌ Lỗi khi kiểm tra nhiệm vụ sắp đến hạn:', error);
    }

    // --- GỬI THÔNG BÁO "ĐÃ ĐẾN HẠN" (TRONG 1 PHÚT VỪA QUA) ---
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
    try {
        const dueTasks = await Task.find({
            isCompleted: false,
            dueDate: { $lte: now, $gt: oneMinuteAgo },
            'notified.due': { $ne: true }
        });
        if (dueTasks.length > 0) console.log(` -> Tìm thấy ${dueTasks.length} nhiệm vụ VỪA đến hạn.`);
        for (const task of dueTasks) {
            await sendNotificationForTask(task, 'due');
        }
    } catch (error) {
        console.error('❌ Lỗi khi kiểm tra nhiệm vụ đã đến hạn:', error);
    }
    console.log(`[${new Date().toISOString()}] Cron job: Kết thúc chu kỳ.`);
});

// Hàm trợ giúp để gửi thông báo và cập nhật DB
async function sendNotificationForTask(task, type) {
    const user = await User.findById(task.user);
    if (!user || !user.pushSubscription) return;

    let bodyText = '';
    if (type === 'upcoming') {
        bodyText = `Nhiệm vụ "${task.title}" sẽ hết hạn trong vòng 15 phút nữa!`;
    } else { // type === 'due'
        bodyText = `Đã đến hạn hoàn thành nhiệm vụ "${task.title}"!`;
    }

    const payload = JSON.stringify({ title: '🔔 Nhắc nhở nhiệm vụ!', body: bodyText });

    try {
        console.log(`   - Chuẩn bị gửi thông báo "${type}" cho task: "${task.title}"...`);
        await webpush.sendNotification(user.pushSubscription, payload);
        console.log(`   - ✅ Gửi thành công!`);
        
        // Đánh dấu đã thông báo để không gửi lại
        task.notified[type] = true;
        await Task.findByIdAndUpdate(task._id, { notified: task.notified });

    } catch (error) {
        if (error.statusCode === 410) { // Subscription hết hạn
            console.log(`   - ❗ Subscription hết hạn cho user ${user.email}. Đang xóa...`);
            user.pushSubscription = null;
            await user.save();
        } else {
            console.error(`   - ❌ Lỗi khi gửi thông báo:`, error.body || error);
        }
    }
}