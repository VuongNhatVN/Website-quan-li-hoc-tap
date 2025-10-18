// === PHẦN 0: KIỂM TRA XÁC THỰC & LẤY TOKEN ===
const token = localStorage.getItem('token');
if (!token) {
    window.location.href = '/login.html';
}

// === PHẦN 1: LẤY CÁC ĐỐI TƯỢNG HTML ===
const taskForm = document.getElementById('add-task-form');
const taskTitleInput = document.getElementById('task-title');
const taskDueDateInput = document.getElementById('task-due-date');
const taskDueTimeInput = document.getElementById('task-due-time'); // Input mới
const taskList = document.getElementById('task-list');
const logoutBtn = document.getElementById('logout-btn');

const API_URL = '/api/tasks';

// === PHẦN 2: HÀM HIỂN THỊ NHIỆM VỤ ===
const displayTasks = (tasks) => {
    taskList.innerHTML = ''; // Xóa sạch danh sách cũ
    tasks.forEach(task => {
        const taskItem = document.createElement('li');
        taskItem.classList.add('task-item');
        if (task.isCompleted) {
            taskItem.classList.add('completed');
        }
        taskItem.dataset.id = task._id;

        // CẬP NHẬT: Định dạng lại ngày và giờ cho dễ đọc
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
        const response = await fetch(API_URL, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.status === 401) {
            localStorage.removeItem('token');
            window.location.href = '/login.html';
            return;
        }
        const tasks = await response.json();
        displayTasks(tasks);
    } catch (error) {
        console.error('Lỗi khi tải danh sách nhiệm vụ:', error);
    }
};

// === PHẦN 4: HÀM THÊM NHIỆM VỤ MỚI ===
taskForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const title = taskTitleInput.value;
    const date = taskDueDateInput.value;
    const time = taskDueTimeInput.value; // Lấy giá trị giờ

    if (!title || !date || !time) {
        return alert('Vui lòng nhập đầy đủ thông tin!');
    }

    // CẬP NHẬT: Kết hợp ngày và giờ thành một đối tượng Date hoàn chỉnh
    const dueDate = new Date(`${date}T${time}`);

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ title, dueDate: dueDate.toISOString() }),
        });
        if (response.ok) {
            taskForm.reset(); // Xóa sạch form
            fetchTasks();
        } else {
            alert('Thêm nhiệm vụ thất bại!');
        }
    } catch (error) {
        console.error('Lỗi khi thêm nhiệm vụ:', error);
    }
});

// === PHẦN 5: HÀM XÓA VÀ CẬP NHẬT NHIỆM VỤ ===
taskList.addEventListener('click', async (event) => {
    const target = event.target;
    const taskItem = target.closest('.task-item');
    if (!taskItem) return;

    const taskId = taskItem.dataset.id;

    // Xử lý nút Xóa
    if (target.classList.contains('delete-btn')) {
        try {
            const response = await fetch(`${API_URL}/${taskId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` } // Gửi token
            });
            if (response.ok) fetchTasks();
            else alert('Xóa thất bại!');
        } catch (error) {
            console.error('Lỗi khi xóa nhiệm vụ:', error);
        }
    }

    // Xử lý nút Hoàn thành
    if (target.classList.contains('complete-btn')) {
        try {
            const isCompleted = !taskItem.classList.contains('completed');
            // ***** SỬA LỖI Ở ĐÂY *****
            // Thêm Authorization header vào yêu cầu PATCH
            const response = await fetch(`${API_URL}/${taskId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ isCompleted: isCompleted })
            });
            if (response.ok) fetchTasks();
            else alert('Cập nhật thất bại!');
        } catch (error) {
            console.error('Lỗi khi cập nhật nhiệm vụ:', error);
        }
    }
});

// === PHẦN 6: ĐĂNG XUẤT & TẢI NHIỆM VỤ BAN ĐẦU ===
logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('token');
    window.location.href = '/login.html';
});

document.addEventListener('DOMContentLoaded', fetchTasks);