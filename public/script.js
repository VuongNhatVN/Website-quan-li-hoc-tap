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
    const userFullNameSpan = document.getElementById('user-fullname');

    // Xin chào người dùng
    const fullName = localStorage.getItem('fullName');
    if (fullName) {
        userFullNameSpan.textContent = `Xin chào, ${fullName}!`;
    }

    const API_URL = '/api/tasks';
    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];

  function updateTaskCount() {
      taskCount.textContent = tasks.length;
    }
    // Render tasks
    function renderTasks(){
      if (tasks.length === 0) {
        taskList.innerHTML = `
          <div class="text-center py-8 text-gray-500">
            <i data-feather="inbox" class="w-16 h-16 mx-auto mb-4 opacity-50"></i>
            <p>Chưa có nhiệm vụ nào. Hãy thêm nhiệm vụ đầu tiên của bạn!</p>
          </div>
        `;
        feather.replace();
        return;
      }
      const options = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' };
      const formattedDate = new Date(task.dueDate).toLocaleString('vi-VN', options);
      taskList.innerHTML = tasks.map((task, index) => `
        <div class="task-card bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <input type="checkbox" class="w-5 h-5 text-primary rounded focus:ring-primary" 
                     onchange="toggleTask(${index})" ${task.completed ? 'checked' : ''}>
              <div>
                <h3 class="font-semibold text-gray-800 ${task.completed ? 'line-through text-gray-400' : ''}">
                  ${task.title}
                </h3>
                <p class="text-sm text-gray-500">
                  <i data-feather="clock" class="w-3 h-3 inline mr-1"></i>
                  ${formattedDate}
                </p>
              </div>
            </div>
            <button onclick="deleteTask(${index})" class="text-gray-400 hover:text-red-500 transition-colors">
              <i data-feather="trash-2" class="w-4 h-4"></i>
            </button>
          </div>
        </div>
      `).join('');
      feather.replace();
      updateTaskCount();
    }

    const fetchTasks = async () => {
        try {
            const response = await fetch(API_URL, { headers: { 'Authorization': `Bearer ${token}` } });
            if (response.status === 401) {
                localStorage.removeItem('token');
                window.location.href = '/login.html';
                return;
            }
            const tasks = await response.json();
            renderTasks(tasks);
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
                const dueDateTime = new Date(`${taskDueDateInput}T${taskDueTimeInput}`);
        
        tasks.push({
          title,
          taskDueDateInput: dueDate.toISOString(),
          completed: false
        });
        localStorage.setItem('tasks', JSON.stringify(tasks));
        fetchTasks();
        taskForm.reset();
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
                    enableNotificationsBtn.innerHTML = '<i data-feather="bell" class="w-4 h-4"></i> Thông Báo Đã Bật';
                    enableNotificationsBtn.disabled = true;
                    feather.replace();
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
        new Notification('⏰ Quản lí nhiệm vụ - Đã Đến Hạn!', {
          body: `Nhiệm vụ: ${title}`,
          icon: '/static/favicon.ico'
        });
      modalTitle.textContent = title;
      modal.classList.remove('hidden');
      notificationSound.play();
    }

    function closeModal() {
        modal.classList.add('hidden');
    }

    closeModalBtn.addEventListener('click', closeModal);
    window.addEventListener('click', (event) => {
        if (event.target == taskModal) { closeModal(); }
    });

    function checkTasksForClientSideAlerts() {
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
    function startClientSideChecker() {
        // Xóa bộ đếm cũ nếu có để tránh chạy nhiều lần
        if (clientSideIntervalId) {
            clearInterval(clientSideIntervalId);
        }
        // Bắt đầu một bộ đếm mới
        clientSideIntervalId = setInterval(checkTasksForClientSideAlerts, 30000);
        console.log("Bộ đếm giờ cho Pop-up và Âm thanh đã được khởi động an toàn.");
    }
     VANTA.NET({
      el: "#vanta-bg",
      mouseControls: true,
      touchControls: true,
      gyroControls: false,
      minHeight: 200.00,
      minWidth: 200.00,
      scale: 1.00,
      scaleMobile: 1.00,
      color: 0x6366f1,
      backgroundColor: 0xf0f9ff,
      points: 12.00,
      maxDistance: 25.00,
      spacing: 18.00
    });
    
    // Initialize Feather Icons
    feather.replace();

    // Toggle task completion
    window.toggleTask = function(index) {
      tasks[index].completed = !tasks[index].completed;
      localStorage.setItem('tasks', JSON.stringify(tasks));
      renderTasks();
    };

    // Delete task
    window.deleteTask = function(index) {
      tasks.splice(index, 1);
      localStorage.setItem('tasks', JSON.stringify(tasks));
      renderTasks();
    };
    // === PHẦN CUỐI: KHỞI CHẠY BAN ĐẦU ===
    fetchTasks();
    initializePushNotifications();
    setInterval(checkTasksForClientSideAlerts, 30000); // Bắt đầu bộ đếm giờ của trình duyệt, kiểm tra mỗi 30 giây
});