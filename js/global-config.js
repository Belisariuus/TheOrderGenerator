// Глобальный менеджер конфигурации
class ConfigManager {
    constructor() {
        this.config = {
            SettingsOrder: {
                auditType: '',
                orderType: '',
                levelOrder: '',
                selectedTB: ''
            },
            Questionnaire: { },
            TeamAudit: { },
            ProcessesModule: { },
            AutomatedSystems: { },
            Generator: { }
        };

        this.listeners = [];
        this.saveStatus = new Map(); // для отслеживания сохранения каждого модуля
    }

    // Получить всю конфигурацию
    getConfig() {
        return this.config;
    }

    // Получить конфигурацию конкретного модуля
    getModuleConfig(moduleName) {
        if (!this.config[moduleName]) {
            this.config[moduleName] = {};
        }
        return this.config[moduleName];
    }

    // Обновить данные модуля (слияние)
    updateModuleConfig(moduleName, data) {
        if (!this.config[moduleName]) {
            this.config[moduleName] = {};
        }

        // Глубокое слияние объектов
        this.config[moduleName] = { ...this.config[moduleName], ...data };

        // Отмечаем, что модуль сохранил данные
        this.saveStatus.set(moduleName, true);

        // Уведомляем подписчиков об изменении
        this.notifyListeners(moduleName, this.config[moduleName]);

        console.log(`✓ Модуль ${moduleName} обновил конфигурацию:`, this.config[moduleName]);
        return this.config[moduleName];
    }

    // НОВЫЙ МЕТОД: Полная замена конфигурации модуля (без слияния)
    replaceModuleConfig(moduleName, data) {
        if (!this.config[moduleName]) {
            this.config[moduleName] = {};
        }

        // Полная замена, а не слияние
        this.config[moduleName] = { ...data };

        // Отмечаем, что модуль сохранил данные
        this.saveStatus.set(moduleName, true);

        // Уведомляем подписчиков об изменении
        this.notifyListeners(moduleName, this.config[moduleName]);

        console.log(`✓ Модуль ${moduleName} полностью заменен:`, this.config[moduleName]);
        return this.config[moduleName];
    }

    // Проверить, все ли модули сохранили данные
    isAllModulesSaved() {
        const requiredModules = ['SettingsOrder', 'Questionnaire', 'TeamAudit', 'ProcessesModule', 'AutomatedSystems'];
        return requiredModules.every(module => this.saveStatus.get(module) === true);
    }

    // Подписка на изменения
    subscribe(callback) {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(cb => cb !== callback);
        };
    }

    // Уведомить подписчиков
    notifyListeners(moduleName, data) {
        this.listeners.forEach(callback => {
            callback(moduleName, data, this.config);
        });
    }

    // Получить полную конфигурацию в формате JSON
    getFullConfigJSON() {
        return JSON.stringify(this.config, null, 2);
    }
    // Сохранить конфигурацию в sessionStorage (локальная сессия)
    saveToSessionStorage() {
        sessionStorage.setItem('appConfig', JSON.stringify(this.config));
        console.log('✓ Конфигурация сохранена в sessionStorage');
        return true;
    }

    // Загрузить конфигурацию из sessionStorage
    loadFromSessionStorage() {
        const saved = sessionStorage.getItem('appConfig');
        if (saved) {
            try {
                const loadedConfig = JSON.parse(saved);
                // Полная замена конфигурации с глубоким слиянием
                Object.keys(this.config).forEach(key => {
                    if (loadedConfig[key]) {
                        this.config[key] = { ...loadedConfig[key] };
                    }
                });
                // Восстанавливаем статус сохранения для всех модулей
                Object.keys(loadedConfig).forEach(moduleName => {
                    if (moduleName !== 'Generator') {
                        this.saveStatus.set(moduleName, true);
                    }
                });
                // Уведомляем подписчиков о восстановлении (для обновления UI)
                // Сначала уведомляем SettingsOrder чтобы другие модули могли отрендериться
                setTimeout(() => {
                    if (this.config.SettingsOrder && Object.keys(this.config.SettingsOrder).length > 0) {
                        this.notifyListeners('SettingsOrder', this.config.SettingsOrder, this.config);
                    }
                    // Затем уведомляем о полном восстановлении
                    setTimeout(() => {
                        this.notifyListeners('SessionRestore', null, this.config);
                    }, 50);
                }, 50);
                console.log('✓ Конфигурация загружена из sessionStorage:', this.config);
                return true;
            } catch (e) {
                console.error('Ошибка загрузки из sessionStorage:', e);
            }
        }
        return false;
    }

    // Экспорт конфигурации в JSON файл для скачивания
    exportConfigToFile() {
        const configJSON = JSON.stringify(this.config, null, 2);
        const blob = new Blob([configJSON], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        a.download = `config_${timestamp}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        console.log('✓ Конфигурация экспортирована в файл');
    }

    // Импорт конфигурации из JSON файла
    importConfigFromFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const importedConfig = JSON.parse(event.target.result);
                    
                    // Валидация структуры
                    if (!importedConfig || typeof importedConfig !== 'object') {
                        throw new Error('Неверный формат конфигурации');
                    }

                    // Полная замена конфигурации с сохранением структуры
                    Object.keys(this.config).forEach(key => {
                        if (importedConfig[key]) {
                            this.config[key] = { ...importedConfig[key] };
                        }
                    });

                    // Восстанавливаем статус сохранения для всех модулей
                    Object.keys(importedConfig).forEach(moduleName => {
                        if (moduleName !== 'Generator') {
                            this.saveStatus.set(moduleName, true);
                        }
                    });

                    // Сохраняем в sessionStorage
                    this.saveToSessionStorage();

                    // Уведомляем подписчиков - сначала SettingsOrder для рендеринга других модулей
                    setTimeout(() => {
                        if (this.config.SettingsOrder && Object.keys(this.config.SettingsOrder).length > 0) {
                            this.notifyListeners('SettingsOrder', this.config.SettingsOrder, this.config);
                        }
                        // Затем полное уведомление
                        setTimeout(() => {
                            this.notifyListeners('FileImport', null, this.config);
                        }, 50);
                    }, 50);
                    
                    console.log('✓ Конфигурация импортирована из файла');
                    resolve(this.config);
                } catch (e) {
                    console.error('Ошибка импорта конфигурации:', e);
                    reject(e);
                }
            };
            reader.onerror = () => reject(new Error('Ошибка чтения файла'));
            reader.readAsText(file);
        });
    }

    // Экспорт всех данных для отправки на сервер
    exportForServer() {
        return {
            timestamp: new Date().toISOString(),
            config: this.config,
            allModulesSaved: this.isAllModulesSaved()
        };
    }
}

// Создаем глобальный экземпляр
window.appConfigManager = new ConfigManager();

// Проверка корректности создания экземпляра (для отладки)
if (typeof window.appConfigManager.saveToSessionStorage !== 'function') {
    console.error('❗ КРИТИЧЕСКАЯ ОШИБКА: метод saveToSessionStorage не найден в appConfigManager');
    console.error('Доступные методы:', Object.getOwnPropertyNames(Object.getPrototypeOf(window.appConfigManager)));
} else {
    console.log('✓ ConfigManager инициализирован корректно');
}