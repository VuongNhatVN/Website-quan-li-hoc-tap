// sw.js (Service Worker)

console.log('Service Worker đã được tải!');

// Lắng nghe sự kiện "push" từ server
self.addEventListener('push', e => {
    const data = e.data.json(); // Lấy dữ liệu server gửi
    console.log('Push received...');
    
    // Hiển thị thông báo
    self.registration.showNotification(data.title, {
        body: data.body,
        icon: 'https://cdn-icons-png.flaticon.com/512/3239/3239958.png'
    });
});