// Конфигурация JSONBin
const DB_CONFIG = {
    BIN_ID: 'YOUR_JSONBIN_ID', // Замените на ваш ID
    API_KEY: '$2a$10$YOUR_API_KEY', // Замените на ваш API ключ
    BASE_URL: 'https://api.jsonbin.io/v3/b'
};

// Эмуляция ролей и прав
const ROLES = {
    DEVELOPER: { emoji: '👑', color: '#FFD700', level: 100 },
    OVERSEER: { emoji: '🔱', color: '#FF6B6B', level: 90 },
    ALPHA: { emoji: '⚡', color: '#4ECDC4', level: 80 },
    MODER: { emoji: '🛡️', color: '#45B7D1', level: 70 },
    FULL: { emoji: '💎', color: '#96CEB4', level: 60 },
    LEGIT: { emoji: '🎭', color: '#FECA57', level: 50 },
    BASIC: { emoji: '🔓', color: '#54A0FF', level: 40 },
    LITE: { emoji: '⚡', color: '#5F27CD', level: 30 },
    TESTER: { emoji: '🧪', color: '#00D2D3', level: 20 },
    USER: { emoji: '👤', color: '#C8D6E5', level: 10 }
};

class Database {
    constructor() {
        this.cache = null;
        this.lastFetch = 0;
        this.CACHE_DURATION = 30000; // 30 секунд кэш
    }

    async fetchData() {
        // Проверяем кэш
        if (this.cache && Date.now() - this.lastFetch < this.CACHE_DURATION) {
            return this.cache;
        }

        try {
            const response = await fetch(`${DB_CONFIG.BASE_URL}/${DB_CONFIG.BIN_ID}/latest`, {
                headers: {
                    'X-Master-Key': DB_CONFIG.API_KEY,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) throw new Error('Ошибка загрузки данных');
            
            const data = await response.json();
            this.cache = data.record;
            this.lastFetch = Date.now();
            
            // Инициализируем данные если они пустые
            if (!this.cache.users || this.cache.users.length === 0) {
                await this.initializeData();
            }
            
            return this.cache;
        } catch (error) {
            console.error('Database error:', error);
            return this.getFallbackData();
        }
    }

    getFallbackData() {
        return {
            users: [{
                id: 1,
                username: 'user' + Math.random().toString(36).substr(2, 5),
                password: 'hashed_password',
                email: 'user@example.com',
                role: 'USER',
                subscription: 'none',
                key: null,
                balance: 0,
                createdAt: new Date().toISOString(),
                lastLogin: null,
                ip: '127.0.0.1'
            }],
            subscriptions: [],
            logs: [],
            settings: {
                siteName: 'RustMe Client',
                telegramSupport: '@dadepbabki',
                theme: 'blue',
                prices: {
                    basic: 99,
                    full: 199,
                    legit: 79,
                    lite: 89,
                    tester: 0
                }
            }
        };
    }

    async initializeData() {
        const initData = {
            users: [{
                id: 1,
                username: 'DeveloperAccount',
                password: 'pbkdf2_hashed_dimok2016', // В реальности должен быть хеш
                email: 'dev@rustme.com',
                role: 'DEVELOPER',
                subscription: 'forever',
                key: 'DEV-ROFTEK-FOREVER-2024',
                balance: 99999,
                createdAt: '2024-01-01T00:00:00.000Z',
                lastLogin: new Date().toISOString(),
                ip: '127.0.0.1',
                permissions: ['all']
            }],
            subscriptions: [],
            logs: [],
            settings: {
                siteName: 'RustMe Client',
                telegramSupport: '@dadepbabki',
                theme: 'blue',
                maintenance: false,
                registration: true,
                prices: {
                    basic: 99,
                    full: 199,
                    legit: 79,
                    lite: 89,
                    tester: 0
                }
            }
        };

        this.cache = initData;
        return initData;
    }

    async updateData(newData) {
        try {
            const response = await fetch(`${DB_CONFIG.BASE_URL}/${DB_CONFIG.BIN_ID}`, {
                method: 'PUT',
                headers: {
                    'X-Master-Key': DB_CONFIG.API_KEY,
                    'Content-Type': 'application/json',
                    'X-Bin-Versioning': 'false'
                },
                body: JSON.stringify(newData)
            });
            
            if (!response.ok) throw new Error('Ошибка обновления данных');
            
            this.cache = newData;
            this.lastFetch = Date.now();
            return true;
        } catch (error) {
            console.error('Update error:', error);
            return false;
        }
    }
}

// Создаем глобальный экземпляр базы данных
window.db = new Database();