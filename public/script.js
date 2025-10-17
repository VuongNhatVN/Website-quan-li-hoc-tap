// === PHẦN 0: KIỂM TRA XÁC THỰC & LẤY TOKEN ===
const token = localStorage.getItem('token');
if (!token) {
  // Nếu không có token (chưa đăng nhập), đuổi về trang login
  window.location.href = '/login.html';
}
// === PHẦN 1: LẤY CÁC ĐỐI TƯỢNG HTML ===
const taskForm = document.getElementById('add-task-form');
const taskTitleInput = document.getElementById('task-title');
const taskDueDateInput = document.getElementById('task-due-date');
const taskList = document.getElementById('task-list');

// Địa chỉ API của backend
const API_URL = '/api/tasks';

// === PHẦN 2: HÀM HIỂN THỊ NHIỆM VỤ ===
const displayTasks = (tasks) => {
  taskList.innerHTML = ''; // Xóa sạch danh sách cũ trước khi cập nhật
  tasks.forEach(task => {
    // Tạo một thẻ <li> mới cho mỗi nhiệm vụ
    const taskItem = document.createElement('li');
    taskItem.classList.add('task-item');
    if (task.isCompleted) {
      taskItem.classList.add('completed');
    }

    // Đặt ID cho thẻ li để dễ dàng thao tác xóa/sửa
    taskItem.dataset.id = task._id;

    // Định dạng lại ngày tháng cho dễ đọc
    const formattedDate = new Date(task.dueDate).toLocaleDateString('vi-VN');

    // Cấu trúc HTML bên trong thẻ <li>
    taskItem.innerHTML = `
      <div class="task-info">
        <strong>${task.title}</strong>
        <p>Hạn chót: ${formattedDate}</p>
      </div>
      <div class="task-actions">
        <button class="complete-btn">Hoàn thành</button>
        <button class="delete-btn">Xóa</button>
      </div>
    `;

    taskList.appendChild(taskItem); // Thêm nhiệm vụ vào danh sách
  });
};
// === PHẦN 3: HÀM LẤY DỮ LIỆU TỪ BACKEND (CÓ GỬI KÈM TOKEN) ===
const fetchTasks = async () => {
  try {
    const response = await fetch(API_URL, {
      headers: {
        'Authorization': `Bearer ${token}` // Gửi token trong header
      }
    });

    if (response.status === 401) { // Token không hợp lệ hoặc hết hạn
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
  event.preventDefault(); // Ngăn form gửi đi theo cách truyền thống

  const title = taskTitleInput.value;
  const dueDate = taskDueDateInput.value;

  if (!title || !dueDate) {
    alert('Vui lòng nhập đầy đủ thông tin!');
    return;
  }

  try {
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` // Gửi token trong header
        },
        body: JSON.stringify({ title, dueDate }),
        });

    if (response.ok) {
      taskTitleInput.value = ''; // Xóa nội dung trong input
      taskDueDateInput.value = '';
      fetchTasks(); // Tải lại danh sách nhiệm vụ
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
  const taskItem = target.closest('.task-item'); // Tìm thẻ <li> cha gần nhất
  if (!taskItem) return;

  const taskId = taskItem.dataset.id;

  // Xử lý nút Xóa
  if (target.classList.contains('delete-btn')) {
    try {
      const response = await fetch(`${API_URL}/${taskId}`, { 
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
      if (response.ok) {
        fetchTasks(); // Tải lại danh sách
      } else {
        alert('Xóa thất bại!');
      }
    } catch (error) {
      console.error('Lỗi khi xóa nhiệm vụ:', error);
    }
  }

  // Xử lý nút Hoàn thành
  if (target.classList.contains('complete-btn')) {
    try {
        // Lấy trạng thái hiện tại và đảo ngược nó
        const isCompleted = !taskItem.classList.contains('completed');
        const response = await fetch(`${API_URL}/${taskId}`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}`},
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isCompleted: isCompleted })
        });
        if (response.ok) {
            fetchTasks(); // Tải lại danh sách
        } else {
            alert('Cập nhật thất bại!');
        }
    } catch (error) {
        console.error('Lỗi khi cập nhật nhiệm vụ:', error);
    }
  }
});

const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('token'); // Xóa "giấy thông hành"
        window.location.href = '/login.html'; // Về trang đăng nhập
    });
}
// === PHẦN 6: TẢI DANH SÁCH NHIỆM VỤ KHI TRANG ĐƯỢC MỞ ===
document.addEventListener('DOMContentLoaded', fetchTasks);