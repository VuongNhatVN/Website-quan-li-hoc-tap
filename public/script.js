// === PHẦN 0 & 1 (Không đổi) ===
const token = localStorage.getItem('token');
if (!token) { window.location.href = '/login.html'; }

const taskForm = document.getElementById('add-task-form');
const taskTitleInput = document.getElementById('task-title');
// ... (các biến const khác không đổi) ...
const logoutBtn = document.getElementById('logout-btn');

// MỚI: Lấy các phần tử của Modal
const taskModal = document.getElementById('task-due-modal');
const modalTaskTitle = document.getElementById('modal-task-title');
const closeModalBtn = document.querySelector('.close-btn');

const API_URL = '/api/tasks';
let localTasks = [];

// === PHẦN 2, 3, 4, 5, 6 (Không đổi) ===
// displayTasks, fetchTasks, các event listener cho form, taskList, logoutBtn
// Em hãy copy và dán các hàm không đổi từ file cũ của mình vào đây.
// ...

// MỚI: ==========================================================
// === PHẦN 7: LOGIC THÔNG BÁO & MODAL ==========================
// ==========================================================

// MỚI: Hàm để mở và đóng Modal
function openModal(taskTitle) {
    modalTaskTitle.textContent = `"${taskTitle}"`;
    taskModal.style.display = 'flex'; // Hiện modal
}

function closeModal() {
    taskModal.style.display = 'none'; // Ẩn modal
}

// MỚI: Thêm sự kiện để đóng modal
closeModalBtn.addEventListener('click', closeModal);
window.addEventListener('click', (event) => {
    if (event.target == taskModal) { // Nếu người dùng click ra ngoài vùng nội dung
        closeModal();
    }
});


// Hàm hiển thị thông báo trình duyệt (không đổi)
function showNotification(taskTitle, type) { /* ... code không đổi ... */ }

// Hệ thống ghi nhớ trạng thái thông báo (không đổi)
function markAsNotified(taskId, type) { /* ... code không đổi ... */ }
function hasBeenNotified(taskId, type) { /* ... code không đổi ... */ }

// CẬP NHẬT: Hàm kiểm tra nhiệm vụ sẽ gọi thêm hàm mở Modal
function checkTasksForNotification() {
    const now = new Date();
    const fifteenMinutesFromNow = new Date(now.getTime() + 15 * 60 * 1000);
    const oneMinuteAgo = new Date(now.getTime());

    localTasks.forEach(task => {
        if (task.isCompleted) return;

        const dueDate = new Date(task.dueDate);

        // 1. Kiểm tra thông báo "Sắp đến hạn" (trước 15 phút)
        if (dueDate > now && dueDate <= fifteenMinutesFromNow) {
            if (!hasBeenNotified(task._id, 'upcoming')) {
                showNotification(task.title, 'upcoming');
                markAsNotified(task._id, 'upcoming');
            }
        }

        // 2. Kiểm tra thông báo "Đã đến hạn"
        if (dueDate <= now && dueDate > oneMinuteAgo) {
            if (!hasBeenNotified(task._id, 'due')) {
                // Gửi thông báo trình duyệt như cũ
                showNotification(task.title, 'due');
                // MỞ CỬA SỔ POP-UP TRÊN TRANG WEB
                openModal(task.title);
                // Ghi nhớ đã thông báo
                markAsNotified(task._id, 'due');
            }
        }
    });
}

// Hàm khởi tạo tính năng thông báo (không đổi)
function initializeNotifications() { /* ... code không đổi ... */ }

// === PHẦN CUỐI: Tải nhiệm vụ và khởi tạo thông báo ===
document.addEventListener('DOMContentLoaded', () => {
    fetchTasks();
    initializeNotifications();
});