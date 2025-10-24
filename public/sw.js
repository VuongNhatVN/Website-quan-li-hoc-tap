
console.log('Service Worker đã được tải!');

self.addEventListener('push', event => {
    console.log('[Service Worker] Push Received.');
    let data = {};
    try {
        data = event.data.json(); // Lấy dữ liệu từ payload
    } catch (e) {
        console.error('Lỗi parse push data:', e);
        // Xử lý mặc định nếu không parse được JSON
        data = {
            title: 'Thông báo mới',
            body: event.data.text() || 'Bạn có một thông báo mới.'
        };
    }

    const title = data.title || 'Nhắc nhở Nhiệm vụ';
    const options = {
        body: data.body || 'Bạn có nhiệm vụ cần chú ý.',
        icon: '/htn-logo.png', // Đường dẫn tới icon
        badge: '/htn-logo.png', // Icon nhỏ trên thanh trạng thái (Android)
        tag: data.tag || 'task-reminder', // Sử dụng tag để nhóm thông báo
        renotify: true, // Cho phép thông báo lại nếu tag giống nhau
        data: data.data || {} // Dữ liệu kèm theo để xử lý khi click
    };
    // Hiển thị thông báo
    event.waitUntil(self.registration.showNotification(title, options));
});

// (Thêm event listener 'notificationclick' nếu bạn muốn xử lý khi người dùng click vào thông báo)
self.addEventListener('notificationclick', event => {
    console.log('[Service Worker] Notification click Received.');
    event.notification.close(); // Đóng thông báo
    const taskId = event.notification.data ? event.notification.data.taskId : null;
    let urlToOpen = '/';
    if (taskId) {
        console.log("Clicked notification for task:", taskId);
    }

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                if (client.url === self.location.origin + urlToOpen && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});