// Lấy các phần tử HTML từ form
const registerForm = document.getElementById('register-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');

// Thêm sự kiện 'submit' cho form
registerForm.addEventListener('submit', async (event) => {
  // Ngăn chặn hành vi mặc định của form là tải lại trang
  event.preventDefault();

  // Lấy giá trị email và mật khẩu người dùng nhập vào
  const email = emailInput.value;
  const password = passwordInput.value;

  // Kiểm tra cơ bản
  if (!email || !password) {
    alert('Vui lòng nhập đầy đủ email và mật khẩu.');
    return;
  }

  try {
    // Gửi yêu cầu POST đến API đăng ký
    const response = await fetch('/api/users/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      // Chuyển đổi dữ liệu JavaScript thành chuỗi JSON
      body: JSON.stringify({ email, password }),
    });

    // Lấy dữ liệu JSON từ phản hồi của server
    const data = await response.json();

    if (response.ok) {
      // Nếu đăng ký thành công (status code 201)
      alert('Đăng ký thành công! Bây giờ bạn có thể đăng nhập.');
      // Tự động chuyển hướng người dùng đến trang đăng nhập
      window.location.href = '/login.html';
    } else {
      // Nếu có lỗi từ server (email đã tồn tại, etc.)
      // Hiển thị thông báo lỗi mà server trả về
      alert(data.message);
    }
  } catch (error) {
    // Xử lý các lỗi liên quan đến mạng hoặc server không phản hồi
    console.error('Lỗi khi đăng ký:', error);
    alert('Đã có lỗi xảy ra. Vui lòng thử lại sau.');
  }
});