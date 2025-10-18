document.addEventListener('DOMContentLoaded', () => {
    // === PHẦN 1: KHỞI TẠO VÀ LẤY CÁC PHẦN TỬ HTML ===
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login.html';
        return; // Dừng thực thi nếu chưa đăng nhập
    }

    // Lấy các phần tử HTML
    const taskForm = document.getElementById('add-task-form');
    const taskTitleInput = document.getElementById('task-title');
    const taskDueDateInput = document.getElementById('task-due-date');
    const taskDueTimeInput = document.getElementById('task-due-time');
    const taskList = document.getElementById('task-list');
    const logoutBtn = document.getElementById('logout-btn');
    const enableNotificationsBtn = document.getElementById('enable-notifications-btn');

    const API_URL = '/api/tasks';
    let localTasks = []; // Biến toàn cục để lưu trữ danh sách nhiệm vụ

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

    // === PHẦN 3: CÁC HÀM XỬ LÝ SỰ KIỆN (FORM, CLICK, ...) ===
    taskForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const title = taskTitleInput.value;
        const date = taskDueDateInput.value;
        const time = taskDueTimeInput.value;
        if (!title || !date || !time) return alert('Vui lòng nhập đầy đủ thông tin!');
        const dueDate = new Date(`${date}T${time}`);
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ title, dueDate: dueDate.toISOString() }),
            });
            if (response.ok) {
                taskForm.reset();
                fetchTasks();
            } else {
                alert('Thêm nhiệm vụ thất bại!');
            }
        } catch (error) {
            console.error('Lỗi khi thêm nhiệm vụ:', error);
        }
    });

    taskList.addEventListener('click', async (event) => {
        const target = event.target;
        const taskItem = target.closest('.task-item');
        if (!taskItem) return;
        const taskId = taskItem.dataset.id;
        const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

        if (target.classList.contains('delete-btn')) {
            try {
                const response = await fetch(`${API_URL}/${taskId}`, { method: 'DELETE', headers });
                if (response.ok) fetchTasks(); else alert('Xóa thất bại!');
            } catch (error) { console.error('Lỗi khi xóa:', error); }
        }
        if (target.classList.contains('complete-btn')) {
            try {
                const isCompleted = !taskItem.classList.contains('completed');
                const response = await fetch(`${API_URL}/${taskId}`, { method: 'PATCH', headers, body: JSON.stringify({ isCompleted }) });
                if (response.ok) fetchTasks(); else alert('Cập nhật thất bại!');
            } catch (error) { console.error('Lỗi khi cập nhật:', error); }
        }
    });

    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('token');
        window.location.href = '/login.html';
    });

    // === PHẦN 4: LOGIC PUSH NOTIFICATIONS (Gửi thông báo khi đã đóng web) ===
    function urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) { outputArray[i] = rawData.charCodeAt(i); }
        return outputArray;
    }

    async function subscribeUserToPush() {
        try {
            const swRegistration = await navigator.serviceWorker.register('/sw.js');
            const response = await fetch('/api/push/vapid-public-key');
            const vapidPublicKey = await response.text();
            const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);
            const subscription = await swRegistration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: convertedVapidKey
            });
            await fetch('/api/push/subscribe', {
                method: 'POST',
                body: JSON.stringify(subscription),
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
            });
            enableNotificationsBtn.textContent = 'Thông báo đã bật ✅';
            enableNotificationsBtn.disabled = true;
        } catch (error) {
            console.error('Lỗi khi đăng ký push notification:', error);
            enableNotificationsBtn.textContent = 'Lỗi! Thử lại 🚫';
            enableNotificationsBtn.disabled = false;
        }
    }

    function initializePushNotifications() {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            enableNotificationsBtn.textContent = 'Trình duyệt không hỗ trợ 🚫';
            enableNotificationsBtn.disabled = true;
            return;
        }
        navigator.serviceWorker.ready.then(reg => {
            reg.pushManager.getSubscription().then(subscription => {
                if (subscription) {
                    enableNotificationsBtn.textContent = 'Thông báo đã bật ✅';
                    enableNotificationsBtn.disabled = true;
                } else {
                    enableNotificationsBtn.textContent = 'Bật thông báo 🔔';
                    enableNotificationsBtn.disabled = false;
                }
            });
        });
    }

    enableNotificationsBtn.addEventListener('click', () => { subscribeUserToPush(); });

    // === PHẦN 5: POP-UP VÀ ÂM THANH TRÊN WEB (Chỉ hoạt động khi đang mở web) ===
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
                console.log(`Client-side: Task "${task.title}" đã đến hạn! Hiển thị pop-up.`);
                notificationSound.play().catch(e => console.error("Lỗi phát âm thanh:", e));
                openModal(task.title);
                clientSideCheckedTasks.push(task._id);
            }
        });
    }

    // === PHẦN CUỐI: KHỞI CHẠY BAN ĐẦU ===
    fetchTasks();
    initializePushNotifications();
    setInterval(checkTasksForClientSideAlerts, 30000); // Bắt đầu bộ đếm giờ của trình duyệt, kiểm tra mỗi 30 giây
});