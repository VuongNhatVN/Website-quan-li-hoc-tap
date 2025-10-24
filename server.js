require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const webpush = require('web-push');
const cron = require('node-cron');
const Task = require('./models/Task');
const User = require('./models/User');

const vapidKeys = {
    publicKey: process.env.VAPID_PUBLIC_KEY,
    privateKey: process.env.VAPID_PRIVATE_KEY
};
webpush.setVapidDetails(
    'mailto:vuonggame1217@gmail.com',
    vapidKeys.publicKey,
    vapidKeys.privateKey
);

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
    console.log('Đang kiểm tra nhiệm vụ cần nhắc nhở...');
    try {
        const now = new Date();
        // Tìm các task chưa hoàn thành và chưa được nhắc nhở lần cuối (thêm cờ để tránh spam)
        // Giả sử bạn có một trường 'lastRemindedAt' trong Task schema
        const tasksToRemind = await Task.find({
            completed: false,
            dueDate: { $gte: now } // Chỉ nhắc cho task chưa quá hạn (hoặc tùy logic của bạn)
            // Thêm điều kiện lọc để tránh nhắc lại quá nhanh nếu cần
            // Ví dụ: $or: [{ lastRemindedAt: null }, { lastRemindedAt: { $lt: someTimeAgo } }]
        }).populate('user', 'reminderTimes pushSubscription'); // Lấy thông tin user liên quan

        for (const task of tasksToRemind) {
            if (!task.user || !task.user.pushSubscription || !task.user.reminderTimes) {
                continue; // Bỏ qua nếu không có thông tin user hoặc push subscription hoặc reminderTimes
            }

            const dueDate = new Date(task.dueDate);
            const timeDiffMinutes = Math.round((dueDate - now) / (1000 * 60)); // Thời gian còn lại (phút)

            // Lấy danh sách thời gian nhắc nhở của user, sắp xếp giảm dần để xử lý mốc lớn nhất trước
            const userReminderTimes = [...task.user.reminderTimes].sort((a, b) => b - a);

            for (const remindBeforeMinutes of userReminderTimes) {
                // Kiểm tra xem có khớp với mốc thời gian nhắc nhở không (với sai số nhỏ, ví dụ 1 phút)
                if (timeDiffMinutes >= remindBeforeMinutes -1 && timeDiffMinutes <= remindBeforeMinutes + 1) {
                    // Kiểm tra xem đã nhắc cho mốc này gần đây chưa (cần trường lastRemindedAt)
                    // Ví dụ: if (!task.lastRemindedAt || task.lastRemindedAt < now - khoảng thời gian tối thiểu) {
                        console.log(`Gửi nhắc nhở cho task "${task.name}" (${remindBeforeMinutes} phút trước hạn)`);
                        sendReminderNotification(task.user.pushSubscription, task, timeDiffMinutes);

                        // Cập nhật thời gian nhắc nhở cuối cùng cho task (quan trọng để tránh spam)
                        // await Task.findByIdAndUpdate(task._id, { lastRemindedAt: now });

                        break; // Chỉ gửi 1 nhắc nhở mỗi lần kiểm tra (cho mốc lớn nhất khớp)
                    // }
                }
            }
        }
    } catch (error) {
        console.error('Lỗi khi kiểm tra nhắc nhở:', error);
    }
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
function sendReminderNotification(subscription, task, minutesRemaining) {
    const payload = JSON.stringify({
        title: `Nhắc nhở: ${task.name}`,
        body: `Nhiệm vụ sắp đến hạn. ${formatTimeRemaining(minutesRemaining)}`,
        tag: `task-reminder-${task._id}`, // Tag để nhóm thông báo nếu cần
        data: { taskId: task._id } // Dữ liệu kèm theo nếu cần
    });

    webpush.sendNotification(subscription, payload)
        .catch(error => console.error('Lỗi gửi push notification:', error));
}

// Hàm định dạng thời gian còn lại
function formatTimeRemaining(minutes) {
    if (minutes <= 0) {
        return "Đã đến hạn!";
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    let remaining = 'Còn lại ';
    if (hours > 0) {
        remaining += `${hours} giờ `;
    }
    if (mins > 0) {
        remaining += `${mins} phút`;
    }
    return remaining.trim() + '.';
}