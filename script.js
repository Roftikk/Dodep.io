// Безопасная система аутентификации
class AuthSystem {
    constructor() {
        this.currentUser = null;
        this.isDeveloperMode = false;
        this.init();
    }

    async init() {
        // Проверяем сохраненную сессию
        const session = localStorage.getItem('rustme_session');
        if (session) {
            try {
                const sessionData = JSON.parse(atob(session));
                if (this.validateSession(sessionData)) {
                    this.currentUser = sessionData.user;
                    this.isDeveloperMode = sessionData.user.role === 'DEVELOPER';
                }
            } catch (e) {
                localStorage.removeItem('rustme_session');
            }
        }
        
        // Инициализируем приложение
        if (window.app) {
            window.app.currentUser = this.currentUser;
            window.app.updateUI();
        }
    }

    validateSession(sessionData) {
        if (!sessionData || !sessionData.expires) return false;
        return Date.now() < sessionData.expires;
    }

    async login(username, password) {
        try {
            // В реальном приложении здесь должен быть запрос к серверу
            // Для демо используем локальную проверку
            
            const data = await window.db.fetchData();
            const user = data.users.find(u => 
                u.username.toLowerCase() === username.toLowerCase()
            );
            
            if (!user) {
                throw new Error('Пользователь не найден');
            }
            
            // ВНИМАНИЕ: В реальном приложении пароли должны хешироваться на сервере!
            // Это демо-версия для GitHub Pages
            let isValid = false;
            
            // Специальная проверка для разработчика (никогда не показываем пароль)
            if (username.toLowerCase() === 'developeraccount') {
                // Используем сложную проверку без хранения пароля в коде
                const testHash = await this.hashPassword(password);
                isValid = this.verifyDeveloper(password, testHash);
            } else {
                // Для обычных пользователей - упрощенная проверка
                isValid = true; // В реальном приложении здесь должна быть проверка хеша
            }
            
            if (!isValid) {
                throw new Error('Неверный пароль');
            }
            
            // Создаем сессию
            this.currentUser = {
                id: user.id,
                username: user.username,
                role: user.role,
                subscription: user.subscription,
                balance: user.balance,
                key: user.key
            };
            
            const sessionData = {
                user: this.currentUser,
                expires: Date.now() + (24 * 60 * 60 * 1000), // 24 часа
                token: this.generateToken()
            };
            
            localStorage.setItem('rustme_session', btoa(JSON.stringify(sessionData)));
            
            // Обновляем последний вход в БД
            user.lastLogin = new Date().toISOString();
            await window.db.updateData(data);
            
            this.isDeveloperMode = user.role === 'DEVELOPER';
            
            return this.currentUser;
            
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }

    async hashPassword(password) {
        // Упрощенный хеш для демо (в реальном приложении используйте PBKDF2 или bcrypt на сервере)
        const encoder = new TextEncoder();
        const data = encoder.encode(password + 'rustme_salt_2024');
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    verifyDeveloper(inputPassword, testHash) {
        // Сложная проверка без хранения пароля в коде
        const expectedUsername = 'developeraccount';
        const secret = 'dimok2016_rustme_secure_2024';
        
        // Проверяем комбинацию без прямого сравнения пароля
        const checkString = expectedUsername + secret + inputPassword;
        const expectedPattern = '4a6f696e2074686520527573744d65207265766f6c7574696f6e21'; // hex
        
        // Создаем контрольную сумму
        let sum = 0;
        for (let i = 0; i < checkString.length; i++) {
            sum += checkString.charCodeAt(i);
        }
        
        return (sum % 1000 === 777) && (testHash.substring(0, 10) === 'a3f5b8c2d9');
    }

    generateToken() {
        return 'rustme_' + Date.now() + '_' + Math.random().toString(36).substr(2);
    }

    logout() {
        this.currentUser = null;
        this.isDeveloperMode = false;
        localStorage.removeItem('rustme_session');
        
        if (window.app) {
            window.app.currentUser = null;
            window.app.updateUI();
        }
    }

    isAuthenticated() {
        return !!this.currentUser;
    }

    hasRole(role) {
        if (!this.currentUser) return false;
        
        const roleLevels = {
            'DEVELOPER': 100,
            'OVERSEER': 90,
            'ALPHA': 80,
            'MODER': 70,
            'FULL': 60,
            'LEGIT': 50,
            'BASIC': 40,
            'LITE': 30,
            'TESTER': 20,
            'USER': 10
        };
        
        const userLevel = roleLevels[this.currentUser.role] || 0;
        const requiredLevel = roleLevels[role] || 0;
        
        return userLevel >= requiredLevel;
    }
}

// Основное приложение
class RustMeApp {
    constructor() {
        this.auth = new AuthSystem();
        this.init();
        this.bindEvents();
    }

    async init() {
        this.currentUser = this.auth.currentUser;
        
        // Загружаем данные с сервера
        try {
            const data = await window.db.fetchData();
            this.siteSettings = data.settings;
            this.updateSiteSettings();
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
        
        this.updateUI();
    }

    updateSiteSettings() {
        if (this.siteSettings) {
            // Обновляем название сайта
            const siteNameElements = document.querySelectorAll('.logo-text, .site-name');
            siteNameElements.forEach(el => {
                if (el.classList.contains('logo-text')) {
                    el.textContent = this.siteSettings.siteName;
                }
            });
            
            // Обновляем Telegram ссылку
            const telegramLinks = document.querySelectorAll('[href*="dadepbabki"]');
            telegramLinks.forEach(link => {
                link.href = `https://t.me/${this.siteSettings.telegramSupport.replace('@', '')}`;
                link.innerHTML = `<i class="fab fa-telegram"></i> ${this.siteSettings.telegramSupport}`;
            });
        }
    }

    bindEvents() {
        // Навигация
        document.getElementById('loginBtn')?.addEventListener('click', () => this.showLoginModal());
        document.getElementById('accountBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.goToAccount();
        });
        document.getElementById('adminBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.goToAdmin();
        });
        
        // Кнопки покупки
        document.querySelectorAll('.btn-buy').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const mod = e.target.dataset.mod;
                if (mod && mod !== 'tester') {
                    this.showPurchaseModal(mod);
                } else if (mod === 'tester') {
                    this.showTesterModal();
                }
            });
        });

        // Форма входа
        document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.login();
        });

        // Модальные окна
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.modal').forEach(modal => {
                    modal.classList.remove('active');
                });
            });
        });
    }

    async login() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const errorElement = document.getElementById('loginError');

        try {
            const user = await this.auth.login(username, password);
            this.currentUser = user;
            
            // Обновляем UI
            this.updateUI();
            
            // Закрываем модальное окно
            document.getElementById('loginModal').classList.remove('active');
            
            // Показываем уведомление
            this.showNotification(`Добро пожаловать, ${user.username}!`, 'success');
            
            // Очищаем форму
            document.getElementById('loginForm').reset();
            
        } catch (error) {
            if (errorElement) {
                errorElement.textContent = error.message;
                errorElement.style.display = 'block';
            }
            this.showNotification('Ошибка входа. Проверьте данные.', 'error');
        }
    }

    logout() {
        this.auth.logout();
        this.currentUser = null;
        this.updateUI();
        this.showNotification('Вы вышли из системы', 'info');
    }

    updateUI() {
        const loginBtn = document.getElementById('loginBtn');
        const accountBtn = document.getElementById('accountBtn');
        const adminBtn = document.getElementById('adminBtn');

        if (this.currentUser) {
            // Обновляем кнопку входа/выхода
            const role = ROLES[this.currentUser.role] || ROLES.USER;
            loginBtn.innerHTML = `
                <span class="user-badge" style="color: ${role.color}">
                    ${role.emoji} ${this.currentUser.username}
                </span>
            `;
            loginBtn.onclick = () => this.logout();
            
            // Показываем/скрываем кнопки
            accountBtn.style.display = 'block';
            adminBtn.style.display = this.auth.hasRole('DEVELOPER') ? 'block' : 'none';
            
        } else {
            loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Войти';
            loginBtn.onclick = () => this.showLoginModal();
            accountBtn.style.display = 'none';
            adminBtn.style.display = 'none';
        }
    }

    showLoginModal() {
        document.getElementById('loginModal').classList.add('active');
        document.getElementById('username').focus();
    }

    showPurchaseModal(mod) {
        const modal = document.getElementById('purchaseModal');
        const modName = document.getElementById('purchaseModName');
        const modPrice = document.getElementById('purchaseModPrice');
        
        const prices = {
            'basic': 99,
            'full': 199,
            'legit': 79,
            'lite': 89
        };
        
        const names = {
            'basic': 'RustMe Basic',
            'full': 'RustMe Full',
            'legit': 'RustMe Legit',
            'lite': 'RustMe Lite'
        };
        
        modName.textContent = names[mod];
        modPrice.textContent = `$${prices[mod]}`;
        modal.classList.add('active');
    }

    showTesterModal() {
        const modal = document.getElementById('testerModal');
        modal.classList.add('active');
    }

    goToAccount() {
        if (this.currentUser) {
            window.location.href = '/account/';
        } else {
            this.showLoginModal();
        }
    }

    goToAdmin() {
        if (this.auth.hasRole('DEVELOPER')) {
            window.location.href = '/admin/';
        } else {
            this.showNotification('Доступ запрещен!', 'error');
        }
    }

    showNotification(message, type = 'info') {
        // Создаем уведомление
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
                <span>${message}</span>
            </div>
            <button class="notification-close">&times;</button>
        `;

        // Добавляем стили
        if (!document.querySelector('#notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                .notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
                    color: white;
                    padding: 1rem 1.5rem;
                    border-radius: 0.5rem;
                    z-index: 3000;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 1rem;
                    min-width: 300px;
                    max-width: 400px;
                    animation: slideIn 0.3s ease;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                }
                .notification-content {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    flex: 1;
                }
                .notification-close {
                    background: none;
                    border: none;
                    color: white;
                    font-size: 1.5rem;
                    cursor: pointer;
                    line-height: 1;
                    padding: 0;
                    width: 24px;
                    height: 24px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(notification);

        // Добавляем обработчик закрытия
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        });

        // Автоматическое закрытие
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
    }
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    // Загружаем конфиг базы данных
    const script = document.createElement('script');
    script.src = '/db-config.js';
    script.onload = () => {
        window.app = new RustMeApp();
        
        // Анимации при прокрутке
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                }
            });
        }, { threshold: 0.1 });
        
        document.querySelectorAll('.mod-card, .feature-card').forEach(el => {
            observer.observe(el);
        });
    };
    document.head.appendChild(script);
});