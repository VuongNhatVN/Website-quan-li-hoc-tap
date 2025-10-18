document.addEventListener('DOMContentLoaded', () => {
    // === PHẦN 0 & 1: LẤY TOKEN VÀ CÁC PHẦN TỬ HTML ===
    const token = localStorage.getItem('token');
    if (!token) { window.location.href = '/login.html'; return; }

    const taskForm = document.getElementById('add-task-form');
    // ... các biến const khác không đổi ...
    const logoutBtn = document.getElementById('logout-btn');
    const enableNotificationsBtn = document.getElementById('enable-notifications-btn'); // Nút mới
    const taskModal = document.getElementById('task-due-modal');
    // ... các biến const modal khác không đổi ...
    
    const API_URL = '/api/tasks';
    let localTasks = [];
    let notificationIntervalId = null; // Biến để giữ ID của bộ đếm giờ

    // === CÁC HÀM TỪ PHẦN 2 ĐẾN 6 KHÔNG THAY ĐỔI ===
    // displayTasks, fetchTasks, event listener cho form, taskList, v.v...
    // Em hãy copy và dán đầy đủ các hàm này từ file cũ của mình vào đây.
    // ...

    // === PHẦN 7: LOGIC THÔNG BÁO & MODAL (ĐÃ CẬP NHẬT) ===
    function openModal(taskTitle) { /* ... code không đổi ... */ }
    function closeModal() { /* ... code không đổi ... */ }
    closeModalBtn.addEventListener('click', closeModal);
    window.addEventListener('click', (event) => { /* ... code không đổi ... */ });

    function checkTasksForNotification() { /* ... code không đổi ... */ }

    // CẬP NHẬT: Hàm khởi tạo, chỉ chạy bộ đếm nếu đã có quyền
    function initializeNotifications() {
        console.log('Kiểm tra quyền thông báo...');
        // Nếu đã có quyền, bật bộ đếm giờ ngay lập tức
        if (Notification.permission === 'granted') {
            console.log('Đã có quyền! Bắt đầu kiểm tra nhiệm vụ.');
            enableNotificationsBtn.textContent = 'Thông báo đã bật ✅';
            enableNotificationsBtn.disabled = true;
            // Xóa bộ đếm cũ nếu có và tạo bộ đếm mới
            if (notificationIntervalId) clearInterval(notificationIntervalId);
            notificationIntervalId = setInterval(checkTasksForNotification, 60000);
        } else if (Notification.permission === 'denied') {
            console.log('Quyền thông báo đã bị chặn.');
            enableNotificationsBtn.textContent = 'Thông báo đã bị chặn 🚫';
            enableNotificationsBtn.disabled = true;
        } else {
            console.log('Chưa có quyền, đang chờ người dùng nhấn nút.');
        }
    }
    
    // CẬP NHẬT: Thêm sự kiện click cho nút "Bật thông báo"
    enableNotificationsBtn.addEventListener('click', () => {
        // Hỏi xin quyền khi người dùng nhấn nút
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                console.log('Người dùng đã cấp quyền!');
                // Sau khi có quyền, gọi lại hàm khởi tạo để bật bộ đếm
                initializeNotifications(); 
            } else {
                console.log('Người dùng không cấp quyền.');
            }
        });
    });

    // === PHẦN CUỐI: KHỞI CHẠY BAN ĐẦU ===
    fetchTasks();
    initializeNotifications(); // Gọi hàm này để kiểm tra trạng thái quyền hiện tại
});

// CÁC HÀM HỖ TRỢ BÊN NGOÀI (Không đổi)
function showNotification(taskTitle, type) { /* ... */ }
function markAsNotified(taskId, type) { /* ... */ }
function hasBeenNotified(taskId, type) { /* ... */ }