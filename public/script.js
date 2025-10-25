document.addEventListener('DOMContentLoaded', () => {
    // === PHẦN 1: KHỞI TẠO VÀ LẤY CÁC PHẦN TỬ HTML ===
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login.html';
        return;
    }

    // Lấy các phần tử HTML (ID đều khớp với file HTML mới)
    const taskForm = document.getElementById('add-task-form');
    const taskTitleInput = document.getElementById('task-title');
    const taskDueDateInput = document.getElementById('task-due-date');
    const taskDueTimeInput = document.getElementById('task-due-time');
    const taskList = document.getElementById('task-list');
    const taskCount = document.getElementById('task-count');
    const userFullNameSpan = document.getElementById('user-fullname');
    const logoutBtn = document.getElementById('logout-btn');
    const enableNotificationsBtn = document.getElementById('enable-notifications-btn');
    const reminderOptions = document.getElementById('reminder-options');

    const API_URL = '/api/tasks';
    let localTasks = [];
    let clientSideIntervalId = null;

    // === PHẦN 2: HIỂN THỊ HỌ TÊN NGƯỜI DÙNG ===
    const fullName = localStorage.getItem('fullName');
    if (fullName) {
        userFullNameSpan.textContent = `Chào, ${fullName}!`;
    }

    // === PHẦN 3: HÀM HIỂN THỊ TASK ===
    const displayTasks = (tasks) => {
        localTasks = tasks;
        const uncompletedTasks = tasks.filter(task => !task.isCompleted);
        taskCount.textContent = uncompletedTasks.length;
        taskList.innerHTML = '';

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

        tasks.forEach(task => {
            const taskItem = document.createElement('div');

            // Xác định class màu sắc
            let colorClass = 'border-l-4 border-transparent'; // Mặc định trong suốt
            switch (task.color) {
                case 'Green': colorClass = 'border-l-4 border-green-500'; break;
                case 'Yellow': colorClass = 'border-l-4 border-yellow-500'; break;
                case 'Red': colorClass = 'border-l-4 border-red-500'; break;
                case 'Blue': colorClass = 'border-l-4 border-blue-500'; break;
            }

            // Gán class cho task item
            taskItem.className = `task-card bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all task-item ${colorClass}`;
            taskItem.dataset.id = task._id; // Gắn ID của MongoDB

            // Thêm class 'completed' nếu task đã hoàn thành (DÙNG CHO LOGIC CLICK)
            if (task.isCompleted) {
                taskItem.classList.add('completed');
            }

            const options = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' };
            const formattedDate = new Date(task.dueDate).toLocaleString('vi-VN', options);

            // Cấu trúc HTML bên trong
            taskItem.innerHTML = `
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3 flex-grow min-w-0">
                  <input type="checkbox" class="w-5 h-5 text-primary rounded focus:ring-primary complete-btn flex-shrink-0"
                         ${task.isCompleted ? 'checked' : ''} aria-label="Đánh dấu hoàn thành"> <div class="min-w-0">
                    <h3 class="font-semibold text-gray-800 truncate ${task.isCompleted ? 'line-through text-gray-400' : ''}">
                      ${task.title}
                    </h3>
                    <p class="text-sm text-gray-500">
                      <i data-feather="clock" class="w-3 h-3 inline mr-1"></i>
                      ${formattedDate}
                    </p>
                  </div>
                </div>
                <button class="text-gray-400 hover:text-red-500 transition-colors delete-btn flex-shrink-0 ml-2" aria-label="Xóa nhiệm vụ"> <i data-feather="trash-2" class="w-4 h-4"></i>
                </button>
              </div>
            `;
            taskList.appendChild(taskItem);
        });

        feather.replace(); // Kích hoạt lại icons sau khi thêm HTML
    };

    // === PHẦN 4: HÀM LẤY DỮ LIỆU ===
    const fetchTasks = async () => {
        try {
            const response = await fetch(API_URL, { headers: { 'Authorization': `Bearer ${token}` } });
            if (response.status === 401) { localStorage.clear(); window.location.href = '/login.html'; return; }
            const tasks = await response.json();
            displayTasks(tasks);
            startClientSideChecker();
        } catch (error) { console.error('Lỗi khi tải nhiệm vụ:', error); }
    };

    // === PHẦN 5: CÁC HÀM XỬ LÝ SỰ KIỆN (FORM, CLICK, ...) ===
    taskForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const title = taskTitleInput.value;
        const date = taskDueDateInput.value;
        const time = taskDueTimeInput.value;
        if (!title || !date || !time) return alert('Vui lòng nhập đầy đủ thông tin!');
        const dueDate = new Date(`${date}T${time}`);
        const reminderCheckboxes = document.querySelectorAll('#reminder-options input[name="reminder"]:checked');
        const reminderTimes = Array.from(reminderCheckboxes).map(checkbox => checkbox.value);
        const selectedColorRadio = document.querySelector('#color-options input[name="taskColor"]:checked');
        const color = selectedColorRadio ? selectedColorRadio.value : 'None';
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ title, dueDate: dueDate.toISOString(), color, reminderTimes }),
            });
            if (response.ok) {
                taskTitleInput.value = '';
                taskDueDateInput.value = '';
                taskDueTimeInput.value = '';
                fetchTasks(); // Tải lại danh sách
            } else {
                alert('Thêm nhiệm vụ thất bại!');
            }
        } catch (error) {
            console.error('Lỗi khi thêm nhiệm vụ:', error);
        }
    });

    // Listener này giờ sẽ tìm class 'delete-btn' và 'complete-btn' bên trong 'task-item'
    taskList.addEventListener('click', async (event) => {
        const target = event.target;
        const taskItem = target.closest('.task-item');
        if (!taskItem) return;

        const taskId = taskItem.dataset.id;
        const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

        if (target.closest('.delete-btn')) { // Xử lý khi nhấn nút rác
            try {
                const response = await fetch(`${API_URL}/${taskId}`, { method: 'DELETE', headers });
                if (response.ok) fetchTasks(); else alert('Xóa thất bại!');
            } catch (error) { console.error('Lỗi khi xóa:', error); }
        }

        if (target.matches('.complete-btn') && target.type === 'checkbox') {
            try {
                // Trạng thái mới sẽ là trạng thái hiện tại của checkbox (true nếu checked, false nếu không)
                const isCompleted = target.checked;

                const response = await fetch(`${API_URL}/${taskId}`, {
                    method: 'PATCH',
                    headers,
                    body: JSON.stringify({ isCompleted: isCompleted }) // Gửi trạng thái mới lên server
                });

                if (response.ok) {
                    // Cập nhật giao diện ngay lập tức thay vì fetch lại toàn bộ (tùy chọn để mượt hơn)
                    taskItem.classList.toggle('completed', isCompleted); // Thêm/xóa class 'completed'
                    const titleElement = taskItem.querySelector('h3');
                    if (titleElement) {
                        titleElement.classList.toggle('line-through', isCompleted);
                        titleElement.classList.toggle('text-gray-400', isCompleted);
                    }
                    // Cập nhật lại bộ đếm số task chưa hoàn thành
                    const currentTasks = localTasks.map(t => t._id === taskId ? {...t, isCompleted: isCompleted} : t);
                    const uncompletedCount = currentTasks.filter(t => !t.isCompleted).length;
                    taskCount.textContent = uncompletedCount;
                    localTasks = currentTasks; // Cập nhật lại localTasks

                    // fetchTasks(); // Hoặc bạn có thể fetch lại như cũ nếu muốn đơn giản hơn
                } else {
                    alert('Cập nhật thất bại!');
                    // Hoàn tác lại trạng thái checkbox nếu server báo lỗi
                    target.checked = !isCompleted;
                }
            } catch (error) {
                console.error('Lỗi khi cập nhật nhiệm vụ:', error);
                target.checked = !target.checked; // Hoàn tác nếu có lỗi mạng
            }
        }
    });

    logoutBtn.addEventListener('click', () => {
        localStorage.clear(); // Xóa hết token và fullName
        window.location.href = '/login.html';
    });

    // === PHẦN 6: LOGIC PUSH NOTIFICATIONS ===
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
            enableNotificationsBtn.innerHTML = '<i data-feather="bell" class="w-4 h-4"></i> Thông Báo Đã Bật';
            feather.replace();
            enableNotificationsBtn.disabled = true;
        } catch (error) {
            console.error('Lỗi khi đăng ký push notification:', error);
            enableNotificationsBtn.textContent = 'Lỗi! Có vẻ trình duyệt đã bị chặn thông báo 🚫';
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
                    feather.replace();
                    enableNotificationsBtn.disabled = true;
                }
            });
        });
    }

    enableNotificationsBtn.addEventListener('click', () => { subscribeUserToPush(); });

    // === PHẦN 7: POP-UP VÀ ÂM THANH TRÊN WEB ===
    const notificationSound = document.getElementById('notification-sound');
    const taskModal = document.getElementById('task-due-modal');
    const modalTaskTitle = document.getElementById('modal-task-title');
    // Lấy cả 2 nút đóng (chữ X và nút "Đã hiểu")
    const closeModalBtns = document.querySelectorAll('.close-btn');
    let clientSideCheckedTasks = [];

    function openModal(taskTitle) {
        modalTaskTitle.textContent = `"${taskTitle}"`;
        taskModal.classList.remove('hidden'); // Dùng class 'hidden' của Tailwind
    }

    function closeModal() {
        taskModal.classList.add('hidden'); // Dùng class 'hidden' của Tailwind
    }

    closeModalBtns.forEach(btn => btn.addEventListener('click', closeModal)); // Gắn sự kiện cho cả 2 nút
    window.addEventListener('click', (event) => {
        if (event.target == taskModal) { closeModal(); }
    });

    function checkTasksForClientSideAlerts() {
        if (localTasks.length === 0) return;
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

    function startClientSideChecker() {
        if (clientSideIntervalId) { clearInterval(clientSideIntervalId); }
        clientSideIntervalId = setInterval(checkTasksForClientSideAlerts, 30000);
        console.log("Bộ đếm giờ cho Pop-up và Âm thanh đã được khởi động an toàn.");
    }

    // === PHẦN 8: LƯU VÀ TẢI CÀI ĐẶT NHẮC NHỞ (CẬP NHẬT) ===
    async function saveReminderSettings() {
        const reminderCheckboxes = document.querySelectorAll('#reminder-options input[name="reminder"]:checked');
        const reminderTimes = Array.from(reminderCheckboxes).map(checkbox => checkbox.value);
        
        // Cập nhật localStorage để giao diện phản hồi ngay lập tức
        localStorage.setItem('preferredReminders', JSON.stringify(reminderTimes));

        // Gửi lên server để lưu vào DB
        try {
            await fetch('/api/users/preferences', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ preferredReminders: reminderTimes })
            });
            console.log('Đã lưu cài đặt lên server.');
        } catch (error) { console.error('Lỗi khi lưu cài đặt lên server:', error); }
    }

    function loadReminderSettings() {
        // Tải từ localStorage (đã được lưu khi đăng nhập hoặc khi thay đổi)
        const preferredReminders = JSON.parse(localStorage.getItem('preferredReminders') || '[]'); // Lấy từ LS, mặc định mảng rỗng
        
        if (Array.isArray(preferredReminders)) {
            const allCheckboxes = document.querySelectorAll('#reminder-options input[name="reminder"]');
            allCheckboxes.forEach(checkbox => {
                checkbox.checked = preferredReminders.includes(checkbox.value); // Tick dựa trên dữ liệu đã tải
            });
        }
    }

    reminderOptions.addEventListener('change', saveReminderSettings);

    // === PHẦN CUỐI: KHỞI CHẠY BAN ĐẦU ===
    loadReminderSettings();
    fetchTasks();
    initializePushNotifications();
    subscribeUserToPush();
    feather.replace();
});