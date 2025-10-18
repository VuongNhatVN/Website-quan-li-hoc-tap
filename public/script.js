document.addEventListener('DOMContentLoaded', () => {
    // === PHẦN 0: KIỂM TRA XÁC THỰC & LẤY TOKEN ===
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login.html';
        return; // Dừng thực thi nếu chưa đăng nhập
    }

    // === PHẦN 1: LẤY CÁC ĐỐI TƯỢNG HTML ===
    // Chuyển toàn bộ vào trong DOMContentLoaded
    const taskForm = document.getElementById('add-task-form');
    const taskTitleInput = document.getElementById('task-title');
    const taskDueDateInput = document.getElementById('task-due-date');
    const taskDueTimeInput = document.getElementById('task-due-time');
    const taskList = document.getElementById('task-list');
    const logoutBtn = document.getElementById('logout-btn');
    const taskModal = document.getElementById('task-due-modal');
    const modalTaskTitle = document.getElementById('modal-task-title');
    const closeModalBtn = document.querySelector('.close-btn');

    const API_URL = '/api/tasks';
    let localTasks = [];

    // === PHẦN 2: HÀM HIỂN THỊ NHIỆM VỤ ===
    const displayTasks = (tasks) => {
        localTasks = tasks;
        taskList.innerHTML = '';
        tasks.forEach(task => {
            const taskItem = document.createElement('li');
            taskItem.classList.add('task-item');
            if (task.isCompleted) { taskItem.classList.add('completed'); }
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

    // === PHẦN 3: HÀM LẤY DỮ LIỆU TỪ BACKEND ===
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
        } catch (error) { console.error('Lỗi khi tải danh sách nhiệm vụ:', error); }
    };

    // === PHẦN 4: HÀM THÊM NHIỆM VỤ MỚI ===
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
            } else { alert('Thêm nhiệm vụ thất bại!'); }
        } catch (error) { console.error('Lỗi khi thêm nhiệm vụ:', error); }
    });

    // === PHẦN 5: HÀM XÓA VÀ CẬP NHẬT NHIỆM VỤ ===
    taskList.addEventListener('click', async (event) => {
        const target = event.target;
        const taskItem = target.closest('.task-item');
        if (!taskItem) return;
        const taskId = taskItem.dataset.id;
        if (target.classList.contains('delete-btn')) {
            try {
                const response = await fetch(`${API_URL}/${taskId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
                if (response.ok) fetchTasks(); else alert('Xóa thất bại!');
            } catch (error) { console.error('Lỗi khi xóa nhiệm vụ:', error); }
        }
        if (target.classList.contains('complete-btn')) {
            try {
                const isCompleted = !taskItem.classList.contains('completed');
                const response = await fetch(`${API_URL}/${taskId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ isCompleted: isCompleted })
                });
                if (response.ok) fetchTasks(); else alert('Cập nhật thất bại!');
            } catch (error) { console.error('Lỗi khi cập nhật nhiệm vụ:', error); }
        }
    });

    // === PHẦN 6: ĐĂNG XUẤT ===
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('token');
        window.location.href = '/login.html';
    });
    
    // === PHẦN 7: LOGIC THÔNG BÁO & MODAL ===
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

    function showNotification(taskTitle, type) { /* ... */ }
    function markAsNotified(taskId, type) { /* ... */ }
    function hasBeenNotified(taskId, type) { /* ... */ }
    function checkTasksForNotification() {
        const now = new Date();
        const fifteenMinutesFromNow = new Date(now.getTime() + 15 * 60 * 1000);
        const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
        localTasks.forEach(task => {
            if (task.isCompleted) return;
            const dueDate = new Date(task.dueDate);
            if (dueDate > now && dueDate <= fifteenMinutesFromNow) {
                if (!hasBeenNotified(task._id, 'upcoming')) {
                    showNotification(task.title, 'upcoming');
                    markAsNotified(task._id, 'upcoming');
                }
            }
            if (dueDate <= now && dueDate > oneMinuteAgo) {
                if (!hasBeenNotified(task._id, 'due')) {
                    showNotification(task.title, 'due');
                    openModal(task.title);
                    markAsNotified(task._id, 'due');
                }
            }
        });
    }

    function initializeNotifications() {
        if (!("Notification" in window)) { console.log("Trình duyệt không hỗ trợ thông báo."); }
        else if (Notification.permission === "granted") { setInterval(checkTasksForNotification, 60000); }
        else if (Notification.permission !== "denied") {
            Notification.requestPermission().then(permission => {
                if (permission === "granted") { setInterval(checkTasksForNotification, 60000); }
            });
        }
    }
    
    // === PHẦN CUỐI: KHỞI CHẠY BAN ĐẦU ===
    fetchTasks();
    initializeNotifications();
});

// CÁC HÀM HỖ TRỢ CHO THÔNG BÁO (để bên ngoài cho gọn)
function showNotification(taskTitle, type) {
    let bodyText = '';
    if (type === 'upcoming') { bodyText = `Nhiệm vụ "${taskTitle}" sẽ hết hạn trong 15 phút nữa!`; }
    else if (type === 'due') { bodyText = `Đã đến hạn hoàn thành nhiệm vụ "${taskTitle}"!`; }
    const notification = new Notification('🔔 Nhắc nhở nhiệm vụ!', {
        body: bodyText,
        icon: 'https://cdn-icons-png.flaticon.com/512/3239/3239958.png'
    });
}

function markAsNotified(taskId, type) {
    const notifiedTasks = JSON.parse(localStorage.getItem('notifiedTasks')) || {};
    if (!notifiedTasks[taskId]) { notifiedTasks[taskId] = []; }
    notifiedTasks[taskId].push(type);
    localStorage.setItem('notifiedTasks', JSON.stringify(notifiedTasks));
}

function hasBeenNotified(taskId, type) {
    const notifiedTasks = JSON.parse(localStorage.getItem('notifiedTasks')) || {};
    return notifiedTasks[taskId] && notifiedTasks[taskId].includes(type);
}