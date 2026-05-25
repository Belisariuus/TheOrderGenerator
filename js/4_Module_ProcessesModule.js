export default class Module4 {
    constructor(configManager) {
        this.configManager = configManager;
        this.container = null;
        this.processes = [];
        this.clientPaths = [];
        this.MODULE_KEY = 'ProcessesModule';
        this.currentScenario = null;
        this.needProcessesFlag = false;
        this.changeProcessesFlag = false;

        // Данные для интерфейса
        this.selectedProcessesForInclude = new Set();
        this.selectedPathsForInclude = new Set();
        this.selectedProcessesForExclude = new Set();
        this.selectedPathsForExclude = new Set();

        this.includeItems = []; // Элементы для включения
        this.excludeItems = []; // Элементы для исключения
        this.linkedPathsMap = new Map();
        this.linkedProcessesMap = new Map();

        // Пагинация
        this.currentIncludeProcessPage = 1;
        this.currentIncludePathPage = 1;
        this.currentExcludeProcessPage = 1;
        this.currentExcludePathPage = 1;
        this.itemsPerPage = 8;
        this.includeProcessSearchTerm = '';
        this.includePathSearchTerm = '';
        this.excludeProcessSearchTerm = '';
        this.excludePathSearchTerm = '';

        this.createContainer();
        this.loadDataFromJSON();

        // Подписываемся на изменения
        this.configManager.subscribe((moduleName, data, fullConfig) => {
            if (moduleName === 'SettingsOrder') {
                this.updateScenario(data, fullConfig, false);
            }
            if (moduleName === 'Questionnaire') {
                this.updateScenario(this.configManager.getConfig().SettingsOrder, fullConfig, false);
            }
            // Обработка восстановления сессии или импорта файла
            if (moduleName === 'SessionRestore' || moduleName === 'FileImport') {
                const settingsOrderConfig = fullConfig.SettingsOrder;
                if (settingsOrderConfig && Object.keys(settingsOrderConfig).length > 0) {
                    setTimeout(() => {
                        this.updateScenario(settingsOrderConfig, fullConfig, true);
                        setTimeout(() => {
                            this.loadSavedData();
                        }, 150);
                    }, 100);
                }
            }
        });

        const existingConfig = this.configManager.getConfig().SettingsOrder;
        if (existingConfig && Object.keys(existingConfig).length > 0) {
            this.updateScenario(existingConfig, this.configManager.getConfig(), false);
        }
    }

    createContainer() {
        this.container = document.createElement('div');
        this.container.className = 'form-section';
        this.container.id = 'module4-container';
        this.container.innerHTML = `
            <h2>4. Процессы и клиентские пути</h2>
            <p class="info-message">⏳ Загрузка данных...</p>
        `;
    }

    async loadDataFromJSON() {
        try {
            const response = await fetch('./data/processes.json');
            if (!response.ok) throw new Error('JSON файл не найден');
            const data = await response.json();
            this.processes = data.processes;
            this.clientPaths = data.clientPaths;
            this.buildLinkedMaps();
            console.log('Загружены процессы и КП:', this.processes.length, this.clientPaths.length);
        } catch (error) {
            console.error('Ошибка загрузки JSON:', error);
            this.processes = this.getMockProcesses();
            this.clientPaths = this.getMockPaths();
            this.buildLinkedMaps();
        }

        if (this.currentScenario) {
            this.renderForm();
            
            // Загружаем данные с небольшой задержкой после рендеринга формы
            setTimeout(() => {
                this.loadSavedData();
            }, 50);
        }
    }

    buildLinkedMaps() {
        this.processes.forEach(process => {
            const kpList = this.clientPaths.filter(kp => process.linkedKP.includes(kp.code));
            this.linkedPathsMap.set(process.code, kpList);
        });

        this.clientPaths.forEach(kp => {
            const processList = this.processes.filter(p => kp.linkedProcesses.includes(p.code));
            this.linkedProcessesMap.set(kp.code, processList);
        });
    }

    getMockProcesses() {
        return [
            { code: "П01", name: "Процесс 1", ownerDepartment: "Отдел 1", linkedKP: ["КП01", "КП03"] },
            { code: "П02", name: "Процесс 2", ownerDepartment: "Отдел 2", linkedKP: ["КП02"] },
            { code: "П03", name: "Процесс 3", ownerDepartment: "Отдел 3", linkedKP: [] }
        ];
    }

    getMockPaths() {
        return [
            { code: "КП01", name: "Клиентский путь 1", ownerDepartment: "Отдел 1", linkedProcesses: ["П01"] },
            { code: "КП02", name: "Клиентский путь 2", ownerDepartment: "Отдел 2", linkedProcesses: ["П02", "П03"] },
            { code: "КП03", name: "Клиентский путь 3", ownerDepartment: "Отдел 1", linkedProcesses: ["П01"] }
        ];
    }

    updateScenario(module1Config, fullConfig, isRestore = false) {
        if (!module1Config) return;

        const orderType = module1Config.orderType || module1Config.modificationType;
        const questionnaireConfig = fullConfig?.Questionnaire || {};

        this.needProcessesFlag = questionnaireConfig.needProcesses || false;
        this.changeProcessesFlag = questionnaireConfig.changeProcesses || false;

        let scenario = null;

        if (orderType === 'new' && this.needProcessesFlag) {
            scenario = 'new';
        } else if (orderType === 'change' && this.changeProcessesFlag) {
            scenario = 'change';
        } else if ((orderType === 'new' && !this.needProcessesFlag) ||
                   (orderType === 'change' && !this.changeProcessesFlag)) {
            scenario = 'not_needed';
        }

        console.log('Модуль 4: смена сценария:', this.currentScenario, '->', scenario, 'isRestore:', isRestore);

        if (this.currentScenario !== scenario) {
            this.currentScenario = scenario;
            
            // При восстановлении НЕ очищаем данные - они будут загружены из конфига
            if (!isRestore) {
                this.clearModuleData();
            }
            
            this.renderForm();
            
            // Загружаем данные с небольшой задержкой после рендеринга формы
            setTimeout(() => {
                this.loadSavedData();
            }, 50);
        } else if (isRestore && this.container && this.container.innerHTML.trim() !== '') {
            // Если сценарий не изменился, но это восстановление - просто загружаем данные
            setTimeout(() => {
                this.loadSavedData();
            }, 50);
        }
    }

    clearModuleData() {
        let emptyData = {};

        if (this.currentScenario === 'new') {
            emptyData = { items: [] };
        } else if (this.currentScenario === 'change') {
            emptyData = { include: [], exclude: [] };
        }

        this.configManager.replaceModuleConfig(this.MODULE_KEY, emptyData);
        console.log('Данные модуля 4 очищены:', emptyData);

        if (this.currentScenario === 'change') {
            this.includeItems = [];
            this.excludeItems = [];
        } else {
            this.includeItems = [];
            this.excludeItems = [];
        }

        this.selectedProcessesForInclude.clear();
        this.selectedPathsForInclude.clear();
        this.selectedProcessesForExclude.clear();
        this.selectedPathsForExclude.clear();
    }

    renderForm() {
        if (!this.container) return;

        if (this.currentScenario === 'not_needed') {
            this.container.innerHTML = `
                <h2>4. Процессы и клиентские пути</h2>
                <div class="info-message" style="background: #fff3cd; border: 1px solid #ffc107;">
                    ⚠️ Процессы и клиентские пути не требуются
                </div>
            `;
            return;
        }

        if (this.currentScenario === 'change') {
            this.renderChangeForm();
        } else {
            this.renderMainForm();
        }
    }

    renderMainForm() {
        this.container.innerHTML = `
            <h2>4. Процессы и клиентские пути</h2>

            <div class="processes-container">
                <div class="processes-list-panel">
                    <h3>Процессы</h3>
                    <input type="text" id="searchProcesses" class="search-input" placeholder="Поиск..." value="${this.includeProcessSearchTerm}">
                    <div id="processesList" class="items-list">
                        ${this.renderProcessesList()}
                    </div>
                    <div id="processesPagination" class="pagination"></div>
                </div>

                <div class="paths-list-panel">
                    <h3>Клиентские пути</h3>
                    <input type="text" id="searchPaths" class="search-input" placeholder="Поиск..." value="${this.includePathSearchTerm}">
                    <div id="pathsList" class="items-list">
                        ${this.renderPathsList()}
                    </div>
                    <div id="pathsPagination" class="pagination"></div>
                </div>
            </div>

            <div class="selection-info">
                <p>💡 <strong>Подсказка:</strong> Кликните на элемент для одиночного выбора. Зажмите <strong>Ctrl</strong> для множественного выбора.</p>
            </div>

            <div class="button-container">
                <button id="addSelectedBtn" class="btn">➕ Добавить выбранное</button>
                <button id="clearSelectionBtn" class="btn btn-secondary">🗑 Очистить выделение</button>
            </div>

            <div class="selected-items-section">
                <h3>Добавленные элементы (${this.includeItems.length})</h3>
                <div class="table-wrapper">
                    <table id="selectedItemsTable" class="selected-items-table">
                        <thead>
                            <tr>
                                <th>Код процесса</th>
                                <th>Название процесса</th>
                                <th>Подразделение-владелец процесса</th>
                                <th>Код КП</th>
                                <th>Название КП</th>
                                <th>Подразделение-владелец КП</th>
                                <th>Действия</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.renderIncludeItems()}
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="button-container">
                <button id="saveProcessesBtn" class="btn">💾 Сохранить</button>
            </div>
        `;

        this.attachMainEvents();
        this.renderPagination();
    }

    renderChangeForm() {
        this.container.innerHTML = `
            <h2>4. Изменение процессов и клиентских путей</h2>

            <div class="change-section">
                <h3 style="color: #4CAF50;">📥 Включить в состав</h3>
                <div class="processes-container">
                    <div class="processes-list-panel">
                        <h4>Процессы для включения</h4>
                        <input type="text" id="searchIncludeProcesses" class="search-input" placeholder="Поиск..." value="${this.includeProcessSearchTerm}">
                        <div id="includeProcessesList" class="items-list">
                            ${this.renderProcessesListForInclude()}
                        </div>
                        <div id="includeProcessesPagination" class="pagination"></div>
                    </div>
                    <div class="paths-list-panel">
                        <h4>Клиентские пути для включения</h4>
                        <input type="text" id="searchIncludePaths" class="search-input" placeholder="Поиск..." value="${this.includePathSearchTerm}">
                        <div id="includePathsList" class="items-list">
                            ${this.renderPathsListForInclude()}
                        </div>
                        <div id="includePathsPagination" class="pagination"></div>
                    </div>
                </div>
                <div class="button-container">
                    <button id="addIncludeBtn" class="btn btn-success">➕ Добавить выбранное для включения</button>
                    <button id="clearIncludeSelectionBtn" class="btn btn-secondary">🗑 Очистить выделение</button>
                </div>
            </div>

            <div class="change-section" style="border-left-color: #dc3545;">
                <h3 style="color: #dc3545;">📤 Исключить из состава</h3>
                <div class="processes-container">
                    <div class="processes-list-panel">
                        <h4>Процессы для исключения</h4>
                        <input type="text" id="searchExcludeProcesses" class="search-input" placeholder="Поиск..." value="${this.excludeProcessSearchTerm}">
                        <div id="excludeProcessesList" class="items-list">
                            ${this.renderProcessesListForExclude()}
                        </div>
                        <div id="excludeProcessesPagination" class="pagination"></div>
                    </div>
                    <div class="paths-list-panel">
                        <h4>Клиентские пути для исключения</h4>
                        <input type="text" id="searchExcludePaths" class="search-input" placeholder="Поиск..." value="${this.excludePathSearchTerm}">
                        <div id="excludePathsList" class="items-list">
                            ${this.renderPathsListForExclude()}
                        </div>
                        <div id="excludePathsPagination" class="pagination"></div>
                    </div>
                </div>
                <div class="button-container">
                    <button id="addExcludeBtn" class="btn btn-danger">➖ Добавить выбранное для исключения</button>
                    <button id="clearExcludeSelectionBtn" class="btn btn-secondary">🗑 Очистить выделение</button>
                </div>
            </div>

            <div class="selected-items-section">
                <h3>Изменения (${this.includeItems.length + this.excludeItems.length})</h3>
                <div class="table-wrapper">
                    <table id="changeItemsTable" class="selected-items-table">
                        <thead>
                            <tr>
                                <th>Изменение</th>
                                <th>Код процесса</th>
                                <th>Название процесса</th>
                                <th>Подразделение-владелец процесса</th>
                                <th>Код КП</th>
                                <th>Название КП</th>
                                <th>Подразделение-владелец КП</th>
                                <th>Действия</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.renderChangeItems()}
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="button-container">
                <button id="saveChangesBtn" class="btn">💾 Сохранить изменения</button>
            </div>
        `;

        this.attachChangeEvents();
        this.renderChangePagination();
    }

    renderProcessesList() {
        let filtered = [...this.processes];
        if (this.includeProcessSearchTerm) {
            const term = this.includeProcessSearchTerm.toLowerCase();
            filtered = filtered.filter(p =>
                p.code.toLowerCase().includes(term) ||
                p.name.toLowerCase().includes(term) ||
                p.ownerDepartment.toLowerCase().includes(term)
            );
        }

        const start = (this.currentIncludeProcessPage - 1) * this.itemsPerPage;
        const end = start + this.itemsPerPage;
        const paginated = filtered.slice(start, end);

        if (paginated.length === 0) return '<div class="empty-message">Нет данных</div>';

        return paginated.map(process => `
            <div class="item ${this.selectedProcessesForInclude.has(process.code) ? 'selected' : ''}"
                 data-type="process" data-code="${process.code}">
                <div class="item-code"><strong>${process.code}</strong></div>
                <div class="item-name">${process.name}</div>
                <div class="item-department">👥 ${process.ownerDepartment}</div>
            </div>
        `).join('');
    }

    renderPathsList() {
        let filtered = [...this.clientPaths];
        if (this.includePathSearchTerm) {
            const term = this.includePathSearchTerm.toLowerCase();
            filtered = filtered.filter(p =>
                p.code.toLowerCase().includes(term) ||
                p.name.toLowerCase().includes(term) ||
                p.ownerDepartment.toLowerCase().includes(term)
            );
        }

        const start = (this.currentIncludePathPage - 1) * this.itemsPerPage;
        const end = start + this.itemsPerPage;
        const paginated = filtered.slice(start, end);

        if (paginated.length === 0) return '<div class="empty-message">Нет данных</div>';

        return paginated.map(path => `
            <div class="item ${this.selectedPathsForInclude.has(path.code) ? 'selected' : ''}"
                 data-type="path" data-code="${path.code}">
                <div class="item-code"><strong>${path.code}</strong></div>
                <div class="item-name">${path.name}</div>
                <div class="item-department">👥 ${path.ownerDepartment}</div>
            </div>
        `).join('');
    }

    renderProcessesListForInclude() {
        let filtered = [...this.processes];
        if (this.includeProcessSearchTerm) {
            const term = this.includeProcessSearchTerm.toLowerCase();
            filtered = filtered.filter(p =>
                p.code.toLowerCase().includes(term) ||
                p.name.toLowerCase().includes(term) ||
                p.ownerDepartment.toLowerCase().includes(term)
            );
        }

        const start = (this.currentIncludeProcessPage - 1) * this.itemsPerPage;
        const end = start + this.itemsPerPage;
        const paginated = filtered.slice(start, end);

        if (paginated.length === 0) return '<div class="empty-message">Нет данных</div>';

        return paginated.map(process => `
            <div class="item ${this.selectedProcessesForInclude.has(process.code) ? 'selected' : ''}"
                 data-type="process" data-code="${process.code}">
                <div class="item-code"><strong>${process.code}</strong></div>
                <div class="item-name">${process.name}</div>
                <div class="item-department">👥 ${process.ownerDepartment}</div>
            </div>
        `).join('');
    }

    renderPathsListForInclude() {
        let filtered = [...this.clientPaths];
        if (this.includePathSearchTerm) {
            const term = this.includePathSearchTerm.toLowerCase();
            filtered = filtered.filter(p =>
                p.code.toLowerCase().includes(term) ||
                p.name.toLowerCase().includes(term) ||
                p.ownerDepartment.toLowerCase().includes(term)
            );
        }

        const start = (this.currentIncludePathPage - 1) * this.itemsPerPage;
        const end = start + this.itemsPerPage;
        const paginated = filtered.slice(start, end);

        if (paginated.length === 0) return '<div class="empty-message">Нет данных</div>';

        return paginated.map(path => `
            <div class="item ${this.selectedPathsForInclude.has(path.code) ? 'selected' : ''}"
                 data-type="path" data-code="${path.code}">
                <div class="item-code"><strong>${path.code}</strong></div>
                <div class="item-name">${path.name}</div>
                <div class="item-department">👥 ${path.ownerDepartment}</div>
            </div>
        `).join('');
    }

    renderProcessesListForExclude() {
        let filtered = [...this.processes];
        if (this.excludeProcessSearchTerm) {
            const term = this.excludeProcessSearchTerm.toLowerCase();
            filtered = filtered.filter(p =>
                p.code.toLowerCase().includes(term) ||
                p.name.toLowerCase().includes(term) ||
                p.ownerDepartment.toLowerCase().includes(term)
            );
        }

        const start = (this.currentExcludeProcessPage - 1) * this.itemsPerPage;
        const end = start + this.itemsPerPage;
        const paginated = filtered.slice(start, end);

        if (paginated.length === 0) return '<div class="empty-message">Нет данных</div>';

        return paginated.map(process => `
            <div class="item ${this.selectedProcessesForExclude.has(process.code) ? 'selected' : ''}"
                 data-type="process" data-code="${process.code}">
                <div class="item-code"><strong>${process.code}</strong></div>
                <div class="item-name">${process.name}</div>
                <div class="item-department">👥 ${process.ownerDepartment}</div>
            </div>
        `).join('');
    }

    renderPathsListForExclude() {
        let filtered = [...this.clientPaths];
        if (this.excludePathSearchTerm) {
            const term = this.excludePathSearchTerm.toLowerCase();
            filtered = filtered.filter(p =>
                p.code.toLowerCase().includes(term) ||
                p.name.toLowerCase().includes(term) ||
                p.ownerDepartment.toLowerCase().includes(term)
            );
        }

        const start = (this.currentExcludePathPage - 1) * this.itemsPerPage;
        const end = start + this.itemsPerPage;
        const paginated = filtered.slice(start, end);

        if (paginated.length === 0) return '<div class="empty-message">Нет данных</div>';

        return paginated.map(path => `
            <div class="item ${this.selectedPathsForExclude.has(path.code) ? 'selected' : ''}"
                 data-type="path" data-code="${path.code}">
                <div class="item-code"><strong>${path.code}</strong></div>
                <div class="item-name">${path.name}</div>
                <div class="item-department">👥 ${path.ownerDepartment}</div>
            </div>
        `).join('');
    }

    renderIncludeItems() {
        if (this.includeItems.length === 0) {
            return '<tr><td colspan="7" style="text-align: center;">Нет добавленных элементов</td></tr>';
        }

        return this.includeItems.map((item, index) => `
            <tr data-index="${index}" data-type="include">
                <td>${item.processCode || '—'}</td>
                <td>${item.processName || '—'}</td>
                <td>${item.processOwnerDepartment || '—'}</td>
                <td>${item.pathCode || '—'}</td>
                <td>${item.pathName || '—'}</td>
                <td>${item.pathOwnerDepartment || '—'}</td>
                <td><button class="btn-remove" data-index="${index}" data-type="include">🗑 Удалить</button></td>
            </tr>
        `).join('');
    }

    renderChangeItems() {
        if (this.includeItems.length === 0 && this.excludeItems.length === 0) {
            return '<tr><td colspan="8" style="text-align: center;">Нет изменений</td></tr>';
        }

        let html = '';

        this.includeItems.forEach((item, index) => {
            html += `
                <tr data-index="${index}" data-type="include">
                    <td style="color: #4CAF50; font-weight: bold;">📥 Включение</td>
                    <td>${item.processCode || '—'}</td>
                    <td>${item.processName || '—'}</td>
                    <td>${item.processOwnerDepartment || '—'}</td>
                    <td>${item.pathCode || '—'}</td>
                    <td>${item.pathName || '—'}</td>
                    <td>${item.pathOwnerDepartment || '—'}</td>
                    <td><button class="btn-remove" data-index="${index}" data-type="include">🗑 Удалить</button></td>
                </tr>
            `;
        });

        this.excludeItems.forEach((item, index) => {
            html += `
                <tr data-index="${index}" data-type="exclude">
                    <td style="color: #dc3545; font-weight: bold;">📤 Исключение</td>
                    <td>${item.processCode || '—'}</td>
                    <td>${item.processName || '—'}</td>
                    <td>${item.processOwnerDepartment || '—'}</td>
                    <td>${item.pathCode || '—'}</td>
                    <td>${item.pathName || '—'}</td>
                    <td>${item.pathOwnerDepartment || '—'}</td>
                    <td><button class="btn-remove" data-index="${index}" data-type="exclude">🗑 Удалить</button></td>
                </tr>
            `;
        });

        return html;
    }

    attachMainEvents() {
        const searchProcesses = this.container.querySelector('#searchProcesses');
        if (searchProcesses) {
            searchProcesses.addEventListener('input', (e) => {
                this.includeProcessSearchTerm = e.target.value;
                this.currentIncludeProcessPage = 1;
                this.updateProcessesList();
                this.renderPagination();
            });
        }

        const searchPaths = this.container.querySelector('#searchPaths');
        if (searchPaths) {
            searchPaths.addEventListener('input', (e) => {
                this.includePathSearchTerm = e.target.value;
                this.currentIncludePathPage = 1;
                this.updatePathsList();
                this.renderPagination();
            });
        }

        this.attachItemClickEvents();

        const addBtn = this.container.querySelector('#addSelectedBtn');
        if (addBtn) addBtn.addEventListener('click', () => this.addSelectedItems());

        const clearBtn = this.container.querySelector('#clearSelectionBtn');
        if (clearBtn) clearBtn.addEventListener('click', () => this.clearSelection());

        const saveBtn = this.container.querySelector('#saveProcessesBtn');
        if (saveBtn) saveBtn.addEventListener('click', () => this.saveConfig());
    }

    attachChangeEvents() {
        // Включение
        const searchIncludeProcesses = this.container.querySelector('#searchIncludeProcesses');
        if (searchIncludeProcesses) {
            searchIncludeProcesses.addEventListener('input', (e) => {
                this.includeProcessSearchTerm = e.target.value;
                this.currentIncludeProcessPage = 1;
                this.updateIncludeProcessesList();
                this.renderChangePagination();
            });
        }

        const searchIncludePaths = this.container.querySelector('#searchIncludePaths');
        if (searchIncludePaths) {
            searchIncludePaths.addEventListener('input', (e) => {
                this.includePathSearchTerm = e.target.value;
                this.currentIncludePathPage = 1;
                this.updateIncludePathsList();
                this.renderChangePagination();
            });
        }

        // Исключение
        const searchExcludeProcesses = this.container.querySelector('#searchExcludeProcesses');
        if (searchExcludeProcesses) {
            searchExcludeProcesses.addEventListener('input', (e) => {
                this.excludeProcessSearchTerm = e.target.value;
                this.currentExcludeProcessPage = 1;
                this.updateExcludeProcessesList();
                this.renderChangePagination();
            });
        }

        const searchExcludePaths = this.container.querySelector('#searchExcludePaths');
        if (searchExcludePaths) {
            searchExcludePaths.addEventListener('input', (e) => {
                this.excludePathSearchTerm = e.target.value;
                this.currentExcludePathPage = 1;
                this.updateExcludePathsList();
                this.renderChangePagination();
            });
        }

        this.attachChangeItemClickEvents();

        const addIncludeBtn = this.container.querySelector('#addIncludeBtn');
        if (addIncludeBtn) addIncludeBtn.addEventListener('click', () => this.addIncludeItems());

        const addExcludeBtn = this.container.querySelector('#addExcludeBtn');
        if (addExcludeBtn) addExcludeBtn.addEventListener('click', () => this.addExcludeItems());

        const clearIncludeBtn = this.container.querySelector('#clearIncludeSelectionBtn');
        if (clearIncludeBtn) clearIncludeBtn.addEventListener('click', () => this.clearIncludeSelection());

        const clearExcludeBtn = this.container.querySelector('#clearExcludeSelectionBtn');
        if (clearExcludeBtn) clearExcludeBtn.addEventListener('click', () => this.clearExcludeSelection());

        const saveBtn = this.container.querySelector('#saveChangesBtn');
        if (saveBtn) saveBtn.addEventListener('click', () => this.saveChangeConfig());

        // Обработчики удаления
        const removeBtns = this.container.querySelectorAll('.btn-remove');
        removeBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(btn.dataset.index);
                const type = btn.dataset.type;
                if (type === 'include') {
                    this.includeItems.splice(index, 1);
                } else {
                    this.excludeItems.splice(index, 1);
                }
                this.updateChangeItemsTable();
                this.saveChangeConfig();
            });
        });
    }

    attachItemClickEvents() {
        const processItems = this.container.querySelectorAll('#processesList .item');
        processItems.forEach(item => {
            item.removeEventListener('click', this.processClickHandler);
            item.addEventListener('click', this.processClickHandler.bind(this));
        });

        const pathItems = this.container.querySelectorAll('#pathsList .item');
        pathItems.forEach(item => {
            item.removeEventListener('click', this.pathClickHandler);
            item.addEventListener('click', this.pathClickHandler.bind(this));
        });
    }

    attachChangeItemClickEvents() {
        // Для включения
        const includeProcessItems = this.container.querySelectorAll('#includeProcessesList .item');
        includeProcessItems.forEach(item => {
            item.removeEventListener('click', this.includeProcessClickHandler);
            item.addEventListener('click', this.includeProcessClickHandler.bind(this));
        });

        const includePathItems = this.container.querySelectorAll('#includePathsList .item');
        includePathItems.forEach(item => {
            item.removeEventListener('click', this.includePathClickHandler);
            item.addEventListener('click', this.includePathClickHandler.bind(this));
        });

        // Для исключения
        const excludeProcessItems = this.container.querySelectorAll('#excludeProcessesList .item');
        excludeProcessItems.forEach(item => {
            item.removeEventListener('click', this.excludeProcessClickHandler);
            item.addEventListener('click', this.excludeProcessClickHandler.bind(this));
        });

        const excludePathItems = this.container.querySelectorAll('#excludePathsList .item');
        excludePathItems.forEach(item => {
            item.removeEventListener('click', this.excludePathClickHandler);
            item.addEventListener('click', this.excludePathClickHandler.bind(this));
        });
    }

    processClickHandler(e) {
        const item = e.currentTarget;
        const code = item.dataset.code;
        const isCtrlPressed = e.ctrlKey;

        if (!isCtrlPressed) {
            this.selectedProcessesForInclude.clear();
            this.selectedProcessesForInclude.add(code);
        } else {
            if (this.selectedProcessesForInclude.has(code)) {
                this.selectedProcessesForInclude.delete(code);
            } else {
                this.selectedProcessesForInclude.add(code);
            }
        }
        this.updateProcessesHighlight();
    }

    pathClickHandler(e) {
        const item = e.currentTarget;
        const code = item.dataset.code;
        const isCtrlPressed = e.ctrlKey;

        if (!isCtrlPressed) {
            this.selectedPathsForInclude.clear();
            this.selectedPathsForInclude.add(code);
        } else {
            if (this.selectedPathsForInclude.has(code)) {
                this.selectedPathsForInclude.delete(code);
            } else {
                this.selectedPathsForInclude.add(code);
            }
        }
        this.updatePathsHighlight();
    }

    includeProcessClickHandler(e) {
        const item = e.currentTarget;
        const code = item.dataset.code;
        const isCtrlPressed = e.ctrlKey;

        if (!isCtrlPressed) {
            this.selectedProcessesForInclude.clear();
            this.selectedProcessesForInclude.add(code);
        } else {
            if (this.selectedProcessesForInclude.has(code)) {
                this.selectedProcessesForInclude.delete(code);
            } else {
                this.selectedProcessesForInclude.add(code);
            }
        }
        this.updateIncludeProcessesHighlight();
    }

    includePathClickHandler(e) {
        const item = e.currentTarget;
        const code = item.dataset.code;
        const isCtrlPressed = e.ctrlKey;

        if (!isCtrlPressed) {
            this.selectedPathsForInclude.clear();
            this.selectedPathsForInclude.add(code);
        } else {
            if (this.selectedPathsForInclude.has(code)) {
                this.selectedPathsForInclude.delete(code);
            } else {
                this.selectedPathsForInclude.add(code);
            }
        }
        this.updateIncludePathsHighlight();
    }

    excludeProcessClickHandler(e) {
        const item = e.currentTarget;
        const code = item.dataset.code;
        const isCtrlPressed = e.ctrlKey;

        if (!isCtrlPressed) {
            this.selectedProcessesForExclude.clear();
            this.selectedProcessesForExclude.add(code);
        } else {
            if (this.selectedProcessesForExclude.has(code)) {
                this.selectedProcessesForExclude.delete(code);
            } else {
                this.selectedProcessesForExclude.add(code);
            }
        }
        this.updateExcludeProcessesHighlight();
    }

    excludePathClickHandler(e) {
        const item = e.currentTarget;
        const code = item.dataset.code;
        const isCtrlPressed = e.ctrlKey;

        if (!isCtrlPressed) {
            this.selectedPathsForExclude.clear();
            this.selectedPathsForExclude.add(code);
        } else {
            if (this.selectedPathsForExclude.has(code)) {
                this.selectedPathsForExclude.delete(code);
            } else {
                this.selectedPathsForExclude.add(code);
            }
        }
        this.updateExcludePathsHighlight();
    }

    updateProcessesHighlight() {
        const processItems = this.container.querySelectorAll('#processesList .item');
        processItems.forEach(item => {
            const code = item.dataset.code;
            if (this.selectedProcessesForInclude.has(code)) {
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
        });
    }

    updatePathsHighlight() {
        const pathItems = this.container.querySelectorAll('#pathsList .item');
        pathItems.forEach(item => {
            const code = item.dataset.code;
            if (this.selectedPathsForInclude.has(code)) {
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
        });
    }

    updateIncludeProcessesHighlight() {
        const processItems = this.container.querySelectorAll('#includeProcessesList .item');
        processItems.forEach(item => {
            const code = item.dataset.code;
            if (this.selectedProcessesForInclude.has(code)) {
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
        });
    }

    updateIncludePathsHighlight() {
        const pathItems = this.container.querySelectorAll('#includePathsList .item');
        pathItems.forEach(item => {
            const code = item.dataset.code;
            if (this.selectedPathsForInclude.has(code)) {
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
        });
    }

    updateExcludeProcessesHighlight() {
        const processItems = this.container.querySelectorAll('#excludeProcessesList .item');
        processItems.forEach(item => {
            const code = item.dataset.code;
            if (this.selectedProcessesForExclude.has(code)) {
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
        });
    }

    updateExcludePathsHighlight() {
        const pathItems = this.container.querySelectorAll('#excludePathsList .item');
        pathItems.forEach(item => {
            const code = item.dataset.code;
            if (this.selectedPathsForExclude.has(code)) {
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
        });
    }

    addSelectedItems() {
        const processCodes = Array.from(this.selectedProcessesForInclude);
        const pathCodes = Array.from(this.selectedPathsForInclude);

        if (processCodes.length === 0 && pathCodes.length === 0) {
            this.showNotification('Ничего не выбрано для добавления', 'warning');
            return;
        }

        const newItems = [];

        processCodes.forEach(procCode => {
            const process = this.processes.find(p => p.code === procCode);
            if (!process) return;

            if (pathCodes.length > 0) {
                pathCodes.forEach(pathCode => {
                    const path = this.clientPaths.find(p => p.code === pathCode);
                    if (!path) return;

                    const exists = this.includeItems.some(item =>
                        item.processCode === procCode && item.pathCode === pathCode
                    );

                    if (!exists) {
                        newItems.push({
                            processCode: procCode,
                            processName: process.name,
                            processOwnerDepartment: process.ownerDepartment,
                            pathCode: pathCode,
                            pathName: path.name,
                            pathOwnerDepartment: path.ownerDepartment
                        });
                    }
                });
            } else {
                const exists = this.includeItems.some(item =>
                    item.processCode === procCode && !item.pathCode
                );

                if (!exists) {
                    newItems.push({
                        processCode: procCode,
                        processName: process.name,
                        processOwnerDepartment: process.ownerDepartment,
                        pathCode: null,
                        pathName: null,
                        pathOwnerDepartment: null
                    });
                }
            }
        });

        if (processCodes.length === 0 && pathCodes.length > 0) {
            pathCodes.forEach(pathCode => {
                const path = this.clientPaths.find(p => p.code === pathCode);
                if (!path) return;

                const exists = this.includeItems.some(item =>
                    !item.processCode && item.pathCode === pathCode
                );

                if (!exists) {
                    newItems.push({
                        processCode: null,
                        processName: null,
                        processOwnerDepartment: null,
                        pathCode: pathCode,
                        pathName: path.name,
                        pathOwnerDepartment: path.ownerDepartment
                    });
                }
            });
        }

        if (newItems.length === 0) {
            this.showNotification('Выбранные элементы уже добавлены', 'warning');
            return;
        }

        this.includeItems.push(...newItems);
        this.selectedProcessesForInclude.clear();
        this.selectedPathsForInclude.clear();
        this.updateProcessesHighlight();
        this.updatePathsHighlight();
        this.updateIncludeItemsTable();
        this.saveConfig();
        this.showNotification(`Добавлено ${newItems.length} элементов`, 'success');
    }

    addIncludeItems() {
        const processCodes = Array.from(this.selectedProcessesForInclude);
        const pathCodes = Array.from(this.selectedPathsForInclude);

        if (processCodes.length === 0 && pathCodes.length === 0) {
            this.showNotification('Ничего не выбрано для включения', 'warning');
            return;
        }

        const newItems = [];

        processCodes.forEach(procCode => {
            const process = this.processes.find(p => p.code === procCode);
            if (!process) return;

            if (pathCodes.length > 0) {
                pathCodes.forEach(pathCode => {
                    const path = this.clientPaths.find(p => p.code === pathCode);
                    if (!path) return;

                    const exists = this.includeItems.some(item =>
                        item.processCode === procCode && item.pathCode === pathCode
                    );

                    if (!exists) {
                        newItems.push({
                            processCode: procCode,
                            processName: process.name,
                            processOwnerDepartment: process.ownerDepartment,
                            pathCode: pathCode,
                            pathName: path.name,
                            pathOwnerDepartment: path.ownerDepartment
                        });
                    }
                });
            } else {
                const exists = this.includeItems.some(item =>
                    item.processCode === procCode && !item.pathCode
                );

                if (!exists) {
                    newItems.push({
                        processCode: procCode,
                        processName: process.name,
                        processOwnerDepartment: process.ownerDepartment,
                        pathCode: null,
                        pathName: null,
                        pathOwnerDepartment: null
                    });
                }
            }
        });

        if (processCodes.length === 0 && pathCodes.length > 0) {
            pathCodes.forEach(pathCode => {
                const path = this.clientPaths.find(p => p.code === pathCode);
                if (!path) return;

                const exists = this.includeItems.some(item =>
                    !item.processCode && item.pathCode === pathCode
                );

                if (!exists) {
                    newItems.push({
                        processCode: null,
                        processName: null,
                        processOwnerDepartment: null,
                        pathCode: pathCode,
                        pathName: path.name,
                        pathOwnerDepartment: path.ownerDepartment
                    });
                }
            });
        }

        if (newItems.length === 0) {
            this.showNotification('Выбранные элементы уже добавлены для включения', 'warning');
            return;
        }

        this.includeItems.push(...newItems);
        this.selectedProcessesForInclude.clear();
        this.selectedPathsForInclude.clear();
        this.updateIncludeProcessesHighlight();
        this.updateIncludePathsHighlight();
        this.updateChangeItemsTable();
        this.saveChangeConfig();
        this.showNotification(`Добавлено ${newItems.length} элементов для включения`, 'success');
    }

    addExcludeItems() {
        const processCodes = Array.from(this.selectedProcessesForExclude);
        const pathCodes = Array.from(this.selectedPathsForExclude);

        if (processCodes.length === 0 && pathCodes.length === 0) {
            this.showNotification('Ничего не выбрано для исключения', 'warning');
            return;
        }

        const newItems = [];

        processCodes.forEach(procCode => {
            const process = this.processes.find(p => p.code === procCode);
            if (!process) return;

            if (pathCodes.length > 0) {
                pathCodes.forEach(pathCode => {
                    const path = this.clientPaths.find(p => p.code === pathCode);
                    if (!path) return;

                    const exists = this.excludeItems.some(item =>
                        item.processCode === procCode && item.pathCode === pathCode
                    );

                    if (!exists) {
                        newItems.push({
                            processCode: procCode,
                            processName: process.name,
                            processOwnerDepartment: process.ownerDepartment,
                            pathCode: pathCode,
                            pathName: path.name,
                            pathOwnerDepartment: path.ownerDepartment
                        });
                    }
                });
            } else {
                const exists = this.excludeItems.some(item =>
                    item.processCode === procCode && !item.pathCode
                );

                if (!exists) {
                    newItems.push({
                        processCode: procCode,
                        processName: process.name,
                        processOwnerDepartment: process.ownerDepartment,
                        pathCode: null,
                        pathName: null,
                        pathOwnerDepartment: null
                    });
                }
            }
        });

        if (processCodes.length === 0 && pathCodes.length > 0) {
            pathCodes.forEach(pathCode => {
                const path = this.clientPaths.find(p => p.code === pathCode);
                if (!path) return;

                const exists = this.excludeItems.some(item =>
                    !item.processCode && item.pathCode === pathCode
                );

                if (!exists) {
                    newItems.push({
                        processCode: null,
                        processName: null,
                        processOwnerDepartment: null,
                        pathCode: pathCode,
                        pathName: path.name,
                        pathOwnerDepartment: path.ownerDepartment
                    });
                }
            });
        }

        if (newItems.length === 0) {
            this.showNotification('Выбранные элементы уже добавлены для исключения', 'warning');
            return;
        }

        this.excludeItems.push(...newItems);
        this.selectedProcessesForExclude.clear();
        this.selectedPathsForExclude.clear();
        this.updateExcludeProcessesHighlight();
        this.updateExcludePathsHighlight();
        this.updateChangeItemsTable();
        this.saveChangeConfig();
        this.showNotification(`Добавлено ${newItems.length} элементов для исключения`, 'success');
    }

    clearSelection() {
        this.selectedProcessesForInclude.clear();
        this.selectedPathsForInclude.clear();
        this.updateProcessesHighlight();
        this.updatePathsHighlight();
        this.showNotification('Выделение очищено', 'info');
    }

    clearIncludeSelection() {
        this.selectedProcessesForInclude.clear();
        this.selectedPathsForInclude.clear();
        this.updateIncludeProcessesHighlight();
        this.updateIncludePathsHighlight();
        this.showNotification('Выделение для включения очищено', 'info');
    }

    clearExcludeSelection() {
        this.selectedProcessesForExclude.clear();
        this.selectedPathsForExclude.clear();
        this.updateExcludeProcessesHighlight();
        this.updateExcludePathsHighlight();
        this.showNotification('Выделение для исключения очищено', 'info');
    }

    updateProcessesList() {
        const processesList = this.container.querySelector('#processesList');
        if (processesList) {
            processesList.innerHTML = this.renderProcessesList();
            this.attachItemClickEvents();
            this.updateProcessesHighlight();
        }
    }

    updatePathsList() {
        const pathsList = this.container.querySelector('#pathsList');
        if (pathsList) {
            pathsList.innerHTML = this.renderPathsList();
            this.attachItemClickEvents();
            this.updatePathsHighlight();
        }
    }

    updateIncludeProcessesList() {
        const processesList = this.container.querySelector('#includeProcessesList');
        if (processesList) {
            processesList.innerHTML = this.renderProcessesListForInclude();
            this.attachChangeItemClickEvents();
            this.updateIncludeProcessesHighlight();
        }
    }

    updateIncludePathsList() {
        const pathsList = this.container.querySelector('#includePathsList');
        if (pathsList) {
            pathsList.innerHTML = this.renderPathsListForInclude();
            this.attachChangeItemClickEvents();
            this.updateIncludePathsHighlight();
        }
    }

    updateExcludeProcessesList() {
        const processesList = this.container.querySelector('#excludeProcessesList');
        if (processesList) {
            processesList.innerHTML = this.renderProcessesListForExclude();
            this.attachChangeItemClickEvents();
            this.updateExcludeProcessesHighlight();
        }
    }

    updateExcludePathsList() {
        const pathsList = this.container.querySelector('#excludePathsList');
        if (pathsList) {
            pathsList.innerHTML = this.renderPathsListForExclude();
            this.attachChangeItemClickEvents();
            this.updateExcludePathsHighlight();
        }
    }

    renderPagination() {
        let filteredProcesses = [...this.processes];
        if (this.includeProcessSearchTerm) {
            const term = this.includeProcessSearchTerm.toLowerCase();
            filteredProcesses = filteredProcesses.filter(p =>
                p.code.toLowerCase().includes(term) ||
                p.name.toLowerCase().includes(term) ||
                p.ownerDepartment.toLowerCase().includes(term)
            );
        }
        const processTotalPages = Math.ceil(filteredProcesses.length / this.itemsPerPage);
        const processPagination = this.container.querySelector('#processesPagination');
        if (processPagination && processTotalPages > 1) {
            processPagination.innerHTML = this.renderPaginationButtons(this.currentIncludeProcessPage, processTotalPages, 'processes');
            this.attachPaginationEvents();
        } else if (processPagination) {
            processPagination.innerHTML = '';
        }

        let filteredPaths = [...this.clientPaths];
        if (this.includePathSearchTerm) {
            const term = this.includePathSearchTerm.toLowerCase();
            filteredPaths = filteredPaths.filter(p =>
                p.code.toLowerCase().includes(term) ||
                p.name.toLowerCase().includes(term) ||
                p.ownerDepartment.toLowerCase().includes(term)
            );
        }
        const pathTotalPages = Math.ceil(filteredPaths.length / this.itemsPerPage);
        const pathPagination = this.container.querySelector('#pathsPagination');
        if (pathPagination && pathTotalPages > 1) {
            pathPagination.innerHTML = this.renderPaginationButtons(this.currentIncludePathPage, pathTotalPages, 'paths');
            this.attachPaginationEvents();
        } else if (pathPagination) {
            pathPagination.innerHTML = '';
        }
    }

    renderChangePagination() {
        // Пагинация для включения процессов
        let filteredIncludeProcesses = [...this.processes];
        if (this.includeProcessSearchTerm) {
            const term = this.includeProcessSearchTerm.toLowerCase();
            filteredIncludeProcesses = filteredIncludeProcesses.filter(p =>
                p.code.toLowerCase().includes(term) ||
                p.name.toLowerCase().includes(term) ||
                p.ownerDepartment.toLowerCase().includes(term)
            );
        }
        const includeProcessTotalPages = Math.ceil(filteredIncludeProcesses.length / this.itemsPerPage);
        const includeProcessPagination = this.container.querySelector('#includeProcessesPagination');
        if (includeProcessPagination && includeProcessTotalPages > 1) {
            includeProcessPagination.innerHTML = this.renderPaginationButtons(this.currentIncludeProcessPage, includeProcessTotalPages, 'includeProcesses');
            this.attachChangePaginationEvents();
        } else if (includeProcessPagination) {
            includeProcessPagination.innerHTML = '';
        }

        // Пагинация для включения КП
        let filteredIncludePaths = [...this.clientPaths];
        if (this.includePathSearchTerm) {
            const term = this.includePathSearchTerm.toLowerCase();
            filteredIncludePaths = filteredIncludePaths.filter(p =>
                p.code.toLowerCase().includes(term) ||
                p.name.toLowerCase().includes(term) ||
                p.ownerDepartment.toLowerCase().includes(term)
            );
        }
        const includePathTotalPages = Math.ceil(filteredIncludePaths.length / this.itemsPerPage);
        const includePathPagination = this.container.querySelector('#includePathsPagination');
        if (includePathPagination && includePathTotalPages > 1) {
            includePathPagination.innerHTML = this.renderPaginationButtons(this.currentIncludePathPage, includePathTotalPages, 'includePaths');
            this.attachChangePaginationEvents();
        } else if (includePathPagination) {
            includePathPagination.innerHTML = '';
        }

        // Пагинация для исключения процессов
        let filteredExcludeProcesses = [...this.processes];
        if (this.excludeProcessSearchTerm) {
            const term = this.excludeProcessSearchTerm.toLowerCase();
            filteredExcludeProcesses = filteredExcludeProcesses.filter(p =>
                p.code.toLowerCase().includes(term) ||
                p.name.toLowerCase().includes(term) ||
                p.ownerDepartment.toLowerCase().includes(term)
            );
        }
        const excludeProcessTotalPages = Math.ceil(filteredExcludeProcesses.length / this.itemsPerPage);
        const excludeProcessPagination = this.container.querySelector('#excludeProcessesPagination');
        if (excludeProcessPagination && excludeProcessTotalPages > 1) {
            excludeProcessPagination.innerHTML = this.renderPaginationButtons(this.currentExcludeProcessPage, excludeProcessTotalPages, 'excludeProcesses');
            this.attachChangePaginationEvents();
        } else if (excludeProcessPagination) {
            excludeProcessPagination.innerHTML = '';
        }

        // Пагинация для исключения КП
        let filteredExcludePaths = [...this.clientPaths];
        if (this.excludePathSearchTerm) {
            const term = this.excludePathSearchTerm.toLowerCase();
            filteredExcludePaths = filteredExcludePaths.filter(p =>
                p.code.toLowerCase().includes(term) ||
                p.name.toLowerCase().includes(term) ||
                p.ownerDepartment.toLowerCase().includes(term)
            );
        }
        const excludePathTotalPages = Math.ceil(filteredExcludePaths.length / this.itemsPerPage);
        const excludePathPagination = this.container.querySelector('#excludePathsPagination');
        if (excludePathPagination && excludePathTotalPages > 1) {
            excludePathPagination.innerHTML = this.renderPaginationButtons(this.currentExcludePathPage, excludePathTotalPages, 'excludePaths');
            this.attachChangePaginationEvents();
        } else if (excludePathPagination) {
            excludePathPagination.innerHTML = '';
        }
    }

    renderPaginationButtons(currentPage, totalPages, type) {
        let html = '';
        for (let i = 1; i <= totalPages; i++) {
            html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" data-page="${i}" data-type="${type}">${i}</button>`;
        }
        return html;
    }

    attachPaginationEvents() {
        const btns = this.container.querySelectorAll('.page-btn');
        btns.forEach(btn => {
            btn.removeEventListener('click', this.paginationClickHandler);
            btn.addEventListener('click', this.paginationClickHandler.bind(this));
        });
    }

    attachChangePaginationEvents() {
        const btns = this.container.querySelectorAll('.page-btn');
        btns.forEach(btn => {
            btn.removeEventListener('click', this.changePaginationClickHandler);
            btn.addEventListener('click', this.changePaginationClickHandler.bind(this));
        });
    }

    paginationClickHandler(e) {
        const page = parseInt(e.target.dataset.page);
        const type = e.target.dataset.type;
        if (type === 'processes') {
            this.currentIncludeProcessPage = page;
            this.updateProcessesList();
        } else if (type === 'paths') {
            this.currentIncludePathPage = page;
            this.updatePathsList();
        }
        this.renderPagination();
    }

    changePaginationClickHandler(e) {
        const page = parseInt(e.target.dataset.page);
        const type = e.target.dataset.type;

        switch(type) {
            case 'includeProcesses':
                this.currentIncludeProcessPage = page;
                this.updateIncludeProcessesList();
                break;
            case 'includePaths':
                this.currentIncludePathPage = page;
                this.updateIncludePathsList();
                break;
            case 'excludeProcesses':
                this.currentExcludeProcessPage = page;
                this.updateExcludeProcessesList();
                break;
            case 'excludePaths':
                this.currentExcludePathPage = page;
                this.updateExcludePathsList();
                break;
        }
        this.renderChangePagination();
    }

    updateIncludeItemsTable() {
        const tbody = this.container.querySelector('#selectedItemsTable tbody');
        if (tbody) {
            tbody.innerHTML = this.renderIncludeItems();
            const removeBtns = tbody.querySelectorAll('.btn-remove');
            removeBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const index = parseInt(btn.dataset.index);
                    this.includeItems.splice(index, 1);
                    this.updateIncludeItemsTable();
                    this.saveConfig();
                });
            });
        }
    }

    updateChangeItemsTable() {
        const tbody = this.container.querySelector('#changeItemsTable tbody');
        if (tbody) {
            tbody.innerHTML = this.renderChangeItems();
            const removeBtns = tbody.querySelectorAll('.btn-remove');
            removeBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const index = parseInt(btn.dataset.index);
                    const type = btn.dataset.type;
                    if (type === 'include') {
                        this.includeItems.splice(index, 1);
                    } else {
                        this.excludeItems.splice(index, 1);
                    }
                    this.updateChangeItemsTable();
                    this.saveChangeConfig();
                });
            });
        }

        const counter = this.container.querySelector('.selected-items-section h3');
        if (counter) {
            counter.textContent = `Изменения (${this.includeItems.length + this.excludeItems.length})`;
        }
    }

    saveConfig() {
        if (this.currentScenario !== 'new') return;

        const configData = {
            items: this.includeItems.map(item => ({
                processCode: item.processCode,
                processName: item.processName,
                processOwnerDepartment: item.processOwnerDepartment,
                pathCode: item.pathCode,
                pathName: item.pathName,
                pathOwnerDepartment: item.pathOwnerDepartment
            }))
        };

        this.configManager.updateModuleConfig(this.MODULE_KEY, configData);
        console.log('Сохранены процессы и КП:', configData);
        this.showNotification('Данные сохранены', 'success');
    }

    saveChangeConfig() {
        if (this.currentScenario !== 'change') return;

        const configData = {
            include: this.includeItems.map(item => ({
                processCode: item.processCode,
                processName: item.processName,
                processOwnerDepartment: item.processOwnerDepartment,
                pathCode: item.pathCode,
                pathName: item.pathName,
                pathOwnerDepartment: item.pathOwnerDepartment
            })),
            exclude: this.excludeItems.map(item => ({
                processCode: item.processCode,
                processName: item.processName,
                processOwnerDepartment: item.processOwnerDepartment,
                pathCode: item.pathCode,
                pathName: item.pathName,
                pathOwnerDepartment: item.pathOwnerDepartment
            }))
        };

        this.configManager.updateModuleConfig(this.MODULE_KEY, configData);
        console.log('Сохранены изменения процессов и КП:', configData);
        this.showNotification('Изменения сохранены', 'success');
    }

    loadSavedData() {
        const savedData = this.configManager.getConfig()[this.MODULE_KEY] || {};
        console.log('Загрузка сохраненных данных модуля 4:', savedData);

        if (!this.container || !this.currentScenario) {
            console.log('Контейнер или сценарий не инициализированы для модуля 4');
            return;
        }

        if (Object.keys(savedData).length === 0) {
            console.log('Нет сохраненных данных для модуля 4');
            return;
        }

        if (this.currentScenario === 'new' && savedData.items && Array.isArray(savedData.items)) {
            this.includeItems = [...savedData.items];
            this.updateIncludeItemsTable();
            console.log('✓ Модуль 4 загрузил данные (новый сценарий)');
        } else if (this.currentScenario === 'change') {
            if (savedData.include && Array.isArray(savedData.include)) {
                this.includeItems = [...savedData.include];
            }
            if (savedData.exclude && Array.isArray(savedData.exclude)) {
                this.excludeItems = [...savedData.exclude];
            }
            this.updateChangeItemsTable();
            console.log('✓ Модуль 4 загрузил данные (сценарий изменений)');
        }
    }

    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.textContent = message;
        const bgColor = type === 'success' ? '#4CAF50' : (type === 'warning' ? '#ff9800' : '#2196F3');
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: ${bgColor};
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            z-index: 2000;
            font-size: 14px;
            animation: fadeOut 2s ease-in-out;
        `;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 2000);
    }

    render() {
        return this.container;
    }
}