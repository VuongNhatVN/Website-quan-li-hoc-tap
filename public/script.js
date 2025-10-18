document.addEventListener('DOMContentLoaded', () => {
    // === PHẦN 1: KHỞI TẠO VÀ LẤY CÁC PHẦN TỬ HTML ===
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login.html';
        return;
    }

    const taskForm = document.getElementById('add-task-form');
    const taskTitleInput = document.getElementById('task-title');
    const taskDueDateInput = document.getElementById('task-due-date');
    const taskDueTimeInput = document.getElementById('task-due-time');
    const taskList = document.getElementById('task-list');
    const logoutBtn = document.getElementById('logout-btn');
    const enableNotificationsBtn = document.getElementById('enable-notifications-btn');

    const API_URL = '/api/tasks';
    let localTasks = [];

    // === PHẦN 2: CÁC HÀM HIỂN THỊ VÀ LẤY DỮ LIỆU ===
    const displayTasks = (tasks) => {
        localTasks = tasks;
        taskList.innerHTML = '';
        tasks.forEach(task => {
            const taskItem = document.createElement('li');
            taskItem.classList.add('task-item');
            if (task.isCompleted) {
                taskItem.classList.add('completed');
            }
            taskItem.dataset.id = task._id;
            const options = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' };
            const formattedDate = new Date(task.dueDate).toLocaleString('vi-VN', options);
            taskItem.innerHTML = `
                <div class="task-info">
                    <strong>${task.title}</strong>
                    <p>Hạn chót: ${formattedDate}</p>
                </div>
                <div class="task-actions">
                    <button class="complete-btn">${task.isCompleted ? 'Hoàn tác' : 'Hoàn thành'}</button>
                    <button class="delete-btn">Xóa</button>
                </div>
            `;
            taskList.appendChild(taskItem);
        });
    };

    const fetchTasks = async () => {
        try {
            const response = await fetch(API_URL, { headers: { 'Authorization': `Bearer ${token}` } });
            if (response.status === 401) {
                localStorage.removeItem('token');
                window.location.href = '/login.html';
                return;
            }
            const tasks = await response.json();
            displayTasks(tasks);
        } catch (error) {
            console.error('Lỗi khi tải nhiệm vụ:', error);
        }
    };

    // === PHẦN 3: CÁC HÀM XỬ LÝ SỰ KIỆN ===
    taskForm.addEventListener('submit', async (event) => { /* ... code không đổi ... */ });
    taskList.addEventListener('click', async (event) => { /* ... code không đổi ... */ });
    logoutBtn.addEventListener('click', () => { /* ... code không đổi ... */ });

    // === PHẦN 4: LOGIC PUSH NOTIFICATIONS ===
    function urlBase64ToUint8Array(base64String) { /* ... code không đổi ... */ }
    async function subscribeUserToPush() { /* ... code không đổi ... */ }
    function initializePushNotifications() { /* ... code không đổi ... */ }
    enableNotificationsBtn.addEventListener('click', () => { subscribeUserToPush(); });

    // === PHẦN 5: POP-UP VÀ ÂM THANH TRÊN WEB ===
    const notificationSound = document.getElementById('notification-sound');
    const taskModal = document.getElementById('task-due-modal');
    const modalTaskTitle = document.getElementById('modal-task-title');
    const closeModalBtn = document.querySelector('.close-btn');
    let clientSideCheckedTasks = [];

    function openModal(taskTitle) {
        modalTaskTitle.textContent = `"${taskTitle}"`;
        taskModal.style.display = 'flex';
    }

    function closeModal() {
        taskModal.style.display = 'none';
    }

    closeModalBtn.addEventListener('click', closeModal);
    window.addEventListener('click', (event) => {
        if (event.target == taskModal) { closeModal(); }
    });

    // SỬA LỖI: Thêm "cổng bảo vệ" vào đây
    function checkTasksForClientSideAlerts() {
        // Nếu không có nhiệm vụ nào, dừng lại ngay lập tức
        if (localTasks.length === 0) {
            return;
        }

        const now = new Date();
        const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);

        localTasks.forEach(task => {
            if (task.isCompleted || clientSideCheckedTasks.includes(task._id)) return;
            const dueDate = new Date(task.dueDate);
            if (isNaN(dueDate.getTime())) return;
            if (dueDate <= now && dueDate > oneMinuteAgo) {
                notificationSound.play().catch(e => console.error("Lỗi phát âm thanh:", e));
                openModal(task.title);
                clientSideCheckedTasks.push(task._id);
            }
        });
    }

    // === PHẦN CUỐI: KHỞI CHẠY BAN ĐẦU ===
    fetchTasks();
    initializePushNotifications();
    setInterval(checkTasksForClientSideAlerts, 30000);
});