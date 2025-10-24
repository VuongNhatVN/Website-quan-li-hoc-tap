const loginForm = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = emailInput.value;
  const password = passwordInput.value;

  try {
    const res = await fetch('/api/users/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (res.ok) {
      // Lưu token vào "ví" của trình duyệt (localStorage)
      localStorage.setItem('token', data.token);
      localStorage.setItem('fullName', data.fullName);
      localStorage.setItem('preferredReminders', JSON.stringify(data.preferredReminders || []));
      window.location.href = '/index.html';
    } else {
      alert(data.message);
    }
  } catch (err) {
    alert('Đã có lỗi xảy ra!');
  }
});