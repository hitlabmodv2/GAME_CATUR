
// Konfigurasi Website - File ini untuk mengatur icon dan nama website
const WebConfig = {
    // Icon website (favicon)
    iconUrl: 'https://files.catbox.moe/9cq0yk.jpg',
    
    // Nama website
    siteName: 'Game Catur Koboy',
    
    // Deskripsi website
    siteDescription: 'Permainan catur bergaya koboi dengan AI bot yang menantang!'
};

// Function untuk mengaplikasikan konfigurasi
function applyWebConfig() {
    // Set title
    document.title = WebConfig.siteName;
    
    // Set favicon
    let favicon = document.querySelector('link[rel="icon"]');
    if (!favicon) {
        favicon = document.createElement('link');
        favicon.rel = 'icon';
        document.head.appendChild(favicon);
    }
    favicon.href = WebConfig.iconUrl;
    
    // Set meta description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.name = 'description';
        document.head.appendChild(metaDesc);
    }
    metaDesc.content = WebConfig.siteDescription;
    
    // Update welcome title if exists
    const welcomeTitle = document.querySelector('.welcome-title');
    if (welcomeTitle) {
        welcomeTitle.textContent = ` ${WebConfig.siteName.toUpperCase()}`;
    }
    
    // Update game title if exists
    const gameTitle = document.querySelector('.game-title');
    if (gameTitle) {
        gameTitle.textContent = ` ${WebConfig.siteName.toUpperCase()}`;
    }
}

// Export untuk digunakan di file lain
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { WebConfig, applyWebConfig };
}
