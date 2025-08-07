
// Update Notification System
const UpdateNotification = {
    // Konfigurasi update terbaru
    updates: [
        {
            id: 'v2.1.0',
            title: '🎉 Update Besar v2.1.0!',
            content: `
                <div class="update-highlights">
                    <h4>🚀 Fitur Baru:</h4>
                    <ul>
                        <li>✨ Sistem Tournament Multi-Round</li>
                        <li>🤖 Bot AI dengan 7 Level Kesulitan</li>
                        <li>📊 Statistik Tangkapan Real-time</li>
                        <li>🎮 Mode Bot vs Bot yang Ditingkatkan</li>
                        <li>📜 Log Permainan dengan Download</li>
                    </ul>
                    <h4>🔧 Perbaikan:</h4>
                    <ul>
                        <li>🐛 Perbaikan algoritma catur internasional</li>
                        <li>⚡ Optimasi kecepatan permainan</li>
                        <li>🎨 Desain UI yang lebih responsif</li>
                        <li>🏆 Sistem penilaian yang akurat</li>
                    </ul>
                </div>
            `,
            date: '07-08-2025',
            priority: 'high', // high, medium, low
            showOnce: false // true untuk tampil sekali saja
        },
        {
            id: 'v2.0.5',
            title: '🔧 Perbaikan Minor v2.0.5',
            content: `
                <div class="update-minor">
                    <p>🎯 Perbaikan stabilitas bot vs bot mode</p>
                    <p>⚡ Optimasi performa untuk mobile</p>
                    <p>🎨 Perbaikan tampilan log permainan</p>
                </div>
            `,
            date: '2024-01-10',
            priority: 'medium',
            showOnce: true
        }
    ],

    // Pengaturan tampilan
    settings: {
        position: 'bottom-right', // top-left, top-right, bottom-left, bottom-right
        autoShow: true, // Tampil otomatis saat load
        autoHideDelay: 0, // 0 = tidak auto hide, nilai dalam ms
        showLatestOnly: true, // Hanya tampilkan update terbaru
        enableSound: false, // Suara notifikasi (belum implementasi)
        theme: 'western' // western, modern, minimal
    },

    // Internal state
    isInitialized: false,
    currentNotification: null,

    // Inisialisasi sistem
    init() {
        if (this.isInitialized) return;
        
        console.log('🔔 Initializing Update Notification System...');
        
        // Buat container notifikasi
        this.createNotificationContainer();
        
        // Load pengaturan dari localStorage
        this.loadUserSettings();
        
        // Tampilkan notifikasi jika diperlukan
        if (this.settings.autoShow) {
            setTimeout(() => {
                this.showLatestUpdate();
            }, 1500); // Delay 1.5 detik setelah halaman load
        }
        
        this.isInitialized = true;
        console.log('✅ Update Notification System ready!');
    },

    // Buat container notifikasi
    createNotificationContainer() {
        const container = document.createElement('div');
        container.id = 'updateNotificationContainer';
        container.className = `update-notification-container ${this.settings.position} ${this.settings.theme}`;
        container.innerHTML = `
            <div class="update-notification hidden" id="updateNotification">
                <div class="update-header">
                    <div class="update-icon">🔔</div>
                    <div class="update-title-area">
                        <h4 class="update-title" id="updateTitle">Update Available</h4>
                        <div class="update-date" id="updateDate">Today</div>
                    </div>
                    <div class="update-controls">
                        <button class="update-minimize" id="updateMinimize" title="Minimize">−</button>
                        <button class="update-close" id="updateClose" title="Close">&times;</button>
                    </div>
                </div>
                <div class="update-content" id="updateContent">
                    <p>Loading update information...</p>
                </div>
                <div class="update-footer">
                    <button class="update-btn secondary" id="updateRemindLater">🕐 Ingatkan Nanti</button>
                    <button class="update-btn primary" id="updateGotIt">✅ Mengerti</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(container);
        
        // Setup event listeners
        this.setupEventListeners();
    },

    // Setup event listeners
    setupEventListeners() {
        const notification = document.getElementById('updateNotification');
        const closeBtn = document.getElementById('updateClose');
        const minimizeBtn = document.getElementById('updateMinimize');
        const remindBtn = document.getElementById('updateRemindLater');
        const gotItBtn = document.getElementById('updateGotIt');

        // Close notification
        closeBtn?.addEventListener('click', () => {
            this.hideNotification();
        });

        // Minimize/expand notification
        minimizeBtn?.addEventListener('click', () => {
            this.toggleMinimize();
        });

        // Remind later (hide for 24 hours)
        remindBtn?.addEventListener('click', () => {
            this.remindLater();
        });

        // Got it (don't show this update again)
        gotItBtn?.addEventListener('click', () => {
            this.markAsRead();
        });

        // Drag functionality for repositioning
        this.makeDraggable(notification);
    },

    // Tampilkan update terbaru
    showLatestUpdate() {
        const latestUpdate = this.getLatestUnreadUpdate();
        if (latestUpdate) {
            this.showUpdate(latestUpdate);
        }
    },

    // Dapatkan update terbaru yang belum dibaca
    getLatestUnreadUpdate() {
        const readUpdates = this.getReadUpdates();
        const remindLaterUpdates = this.getRemindLaterUpdates();
        
        for (const update of this.updates) {
            // Skip jika sudah dibaca dan showOnce = true
            if (update.showOnce && readUpdates.includes(update.id)) {
                continue;
            }
            
            // Skip jika sedang dalam remind later
            if (remindLaterUpdates[update.id] && 
                Date.now() < remindLaterUpdates[update.id]) {
                continue;
            }
            
            return update;
        }
        
        return null;
    },

    // Tampilkan update tertentu
    showUpdate(update) {
        const notification = document.getElementById('updateNotification');
        const title = document.getElementById('updateTitle');
        const content = document.getElementById('updateContent');
        const date = document.getElementById('updateDate');

        if (!notification || !title || !content || !date) {
            console.error('Update notification elements not found');
            return;
        }

        // Set content
        title.textContent = update.title;
        content.innerHTML = update.content;
        date.textContent = this.formatDate(update.date);

        // Set priority styling
        notification.className = `update-notification ${update.priority}`;

        // Show notification
        notification.classList.remove('hidden');
        
        // Add entrance animation
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);

        // Auto hide if configured
        if (this.settings.autoHideDelay > 0) {
            setTimeout(() => {
                this.hideNotification();
            }, this.settings.autoHideDelay);
        }

        this.currentNotification = update;
        console.log(`📢 Showing update: ${update.title}`);
    },

    // Sembunyikan notifikasi
    hideNotification() {
        const notification = document.getElementById('updateNotification');
        if (notification) {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.classList.add('hidden');
            }, 300);
        }
    },

    // Toggle minimize
    toggleMinimize() {
        const notification = document.getElementById('updateNotification');
        const content = document.getElementById('updateContent');
        const footer = document.querySelector('.update-footer');
        const minimizeBtn = document.getElementById('updateMinimize');
        
        if (notification?.classList.contains('minimized')) {
            // Expand
            notification.classList.remove('minimized');
            content.style.display = 'block';
            footer.style.display = 'flex';
            minimizeBtn.textContent = '−';
            minimizeBtn.title = 'Minimize';
        } else {
            // Minimize
            notification?.classList.add('minimized');
            content.style.display = 'none';
            footer.style.display = 'none';
            minimizeBtn.textContent = '+';
            minimizeBtn.title = 'Expand';
        }
    },

    // Ingatkan nanti (24 jam)
    remindLater() {
        if (!this.currentNotification) return;
        
        const remindTime = Date.now() + (24 * 60 * 60 * 1000); // 24 jam
        const remindLaterData = this.getRemindLaterUpdates();
        remindLaterData[this.currentNotification.id] = remindTime;
        
        localStorage.setItem('updateRemindLater', JSON.stringify(remindLaterData));
        
        this.hideNotification();
        this.showToast('🕐 Update akan diingatkan dalam 24 jam');
    },

    // Tandai sebagai sudah dibaca
    markAsRead() {
        if (!this.currentNotification) return;
        
        const readUpdates = this.getReadUpdates();
        if (!readUpdates.includes(this.currentNotification.id)) {
            readUpdates.push(this.currentNotification.id);
            localStorage.setItem('updateReadList', JSON.stringify(readUpdates));
        }
        
        this.hideNotification();
        this.showToast('✅ Update ditandai sebagai sudah dibaca');
    },

    // Helper functions
    getReadUpdates() {
        const stored = localStorage.getItem('updateReadList');
        return stored ? JSON.parse(stored) : [];
    },

    getRemindLaterUpdates() {
        const stored = localStorage.getItem('updateRemindLater');
        return stored ? JSON.parse(stored) : {};
    },

    loadUserSettings() {
        const stored = localStorage.getItem('updateNotificationSettings');
        if (stored) {
            const userSettings = JSON.parse(stored);
            this.settings = { ...this.settings, ...userSettings };
        }
    },

    saveUserSettings() {
        localStorage.setItem('updateNotificationSettings', 
            JSON.stringify(this.settings));
    },

    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return 'Hari ini';
        if (diffDays === 1) return 'Kemarin';
        if (diffDays < 7) return `${diffDays} hari lalu`;
        
        return date.toLocaleDateString('id-ID', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    },

    // Buat notifikasi bisa di-drag
    makeDraggable(element) {
        let isDragging = false;
        let currentX;
        let currentY;
        let initialX;
        let initialY;
        let xOffset = 0;
        let yOffset = 0;

        const header = element.querySelector('.update-header');
        
        header.addEventListener('mousedown', dragStart);
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', dragEnd);

        function dragStart(e) {
            if (e.target.closest('.update-controls')) return;
            
            initialX = e.clientX - xOffset;
            initialY = e.clientY - yOffset;

            if (e.target === header || header.contains(e.target)) {
                isDragging = true;
                element.style.transition = 'none';
            }
        }

        function drag(e) {
            if (isDragging) {
                e.preventDefault();
                
                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;

                xOffset = currentX;
                yOffset = currentY;

                element.style.transform = `translate(${currentX}px, ${currentY}px)`;
            }
        }

        function dragEnd() {
            if (isDragging) {
                isDragging = false;
                element.style.transition = '';
            }
        }
    },

    // Tampilkan toast message
    showToast(message, duration = 3000) {
        const existingToast = document.querySelector('.update-toast');
        if (existingToast) {
            existingToast.remove();
        }

        const toast = document.createElement('div');
        toast.className = 'update-toast';
        toast.textContent = message;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('show');
        }, 100);

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, duration);
    },

    // Public methods untuk kontrol manual
    showManualUpdate(updateId) {
        const update = this.updates.find(u => u.id === updateId);
        if (update) {
            this.showUpdate(update);
        }
    },

    addNewUpdate(updateData) {
        this.updates.unshift(updateData);
        console.log('✅ New update added:', updateData.title);
    },

    clearAllReadStatus() {
        localStorage.removeItem('updateReadList');
        localStorage.removeItem('updateRemindLater');
        this.showToast('🔄 Status baca update direset');
    }
};

// Auto-initialize saat halaman load
document.addEventListener('DOMContentLoaded', () => {
    UpdateNotification.init();
});

// Export untuk penggunaan global
window.UpdateNotification = UpdateNotification;
