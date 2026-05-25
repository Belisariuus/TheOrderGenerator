export default class Module5 {
    constructor(configManager) {
        this.configManager = configManager;
        this.container = null;
        this.MODULE_KEY = 'AutomatedSystems';
        this.currentScenario = null;
        this.needASFlag = false;
        this.changeASFlag = false;

        // Данные
        this.systems = [];
        this.filteredSystems = [];
        this.employees = [];
        this.addedItems = [];

        // Выбранные значения
        this.selectedSystem = null;
        this.selectedRoles = new Set();
        this.selectedEmployees = new Set();

        // Поиск
        this.systemsSearchTerm = '';

        this.createContainer();
        this.loadSystemsFromJSON();

        // Подписываемся на изменения
        this.configManager.subscribe((moduleName, data, fullConfig) => {
            if (moduleName === 'SettingsOrder') {
                this.updateScenario(data, fullConfig, false);
            }
            if (moduleName === 'Questionnaire') {
                this.updateScenario(this.configManager.getConfig().SettingsOrder, fullConfig, false);
            }
            if (moduleName === 'TeamAudit') {
                this.updateEmployeesFromTeam();
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
        this.container.id = 'module5-container';
        this.container.innerHTML = `
            <h2>5. Автоматизированные системы</h2>
            <p class="info-message">⏳ Загрузка данных...</p>
        `;
    }

    async loadSystemsFromJSON() {
        try {
            const response = await fetch('../data/systems.json');
            if (!response.ok) throw new Error('JSON файл не найден');
            const data = await response.json();
            this.systems = data.systems;
            this.filteredSystems = [...this.systems];
            console.log('Загружены АС:', this.systems);
        } catch (error) {
            console.error('Ошибка загрузки JSON, используем тестовые данные:', error);
            this.systems = [
                { id: "AS1", name: "Система А", roles: ["Роль1", "Роль2"] },
                { id: "AS2", name: "Система Б", roles: ["Роль3", "Роль4", "Роль5"] },
                { id: "AS3", name: "Система В", roles: ["Администратор", "Пользователь", "Аналитик"] },
                { id: "AS4", name: "Система Г", roles: ["Руководитель", "Исполнитель"] }
            ];
            this.filteredSystems = [...this.systems];
        }

        if (this.currentScenario) {
            this.renderForm();
            
            // Загружаем данные с небольшой задержкой после рендеринга формы
            setTimeout(() => {
                this.loadSavedData();
            }, 50);
        }
    }

    updateEmployeesFromTeam() {
        // Получаем данные из модуля 3 (ключ 'TeamAudit')
        const teamData = this.configManager.getConfig().TeamAudit || {};

        console.log('Данные команды из модуля 3:', teamData);

        // Очищаем массив сотрудников
        this.employees = [];

        // Собираем всех сотрудников из разных полей teamData (уже полные объекты)
        if (teamData.curators && Array.isArray(teamData.curators)) {
            this.employees.push(...teamData.curators);
        }

        if (teamData.leader) {
            this.employees.push(teamData.leader);
        }

        if (teamData.deputy) {
            this.employees.push(teamData.deputy);
        }

        if (teamData.control) {
            this.employees.push(teamData.control);
        }

        if (teamData.signer) {
            this.employees.push(teamData.signer);
        }

        if (teamData.teamMembers && Array.isArray(teamData.teamMembers)) {
            this.employees.push(...teamData.teamMembers);
        }

        // Для сценария изменения
        if (teamData.changes) {
            if (teamData.changes.include && Array.isArray(teamData.changes.include)) {
                this.employees.push(...teamData.changes.include);
            }
            if (teamData.changes.signer) {
                this.employees.push(teamData.changes.signer);
            }
        }

        // Удаляем дубликаты по id
        this.employees = this.employees.filter((emp, index, self) =>
            index === self.findIndex(e => e.id === emp.id)
        );

        console.log('Сотрудники для АС (из команды):', this.employees);

        // Если форма уже отрендерена, обновляем список сотрудников
        if (this.container && this.currentScenario) {
            this.updateEmployeeSelect();
        }
    }

    updateScenario(module1Config, fullConfig, isRestore = false) {
        if (!module1Config) return;

        const orderType = module1Config.orderType || module1Config.modificationType;
        const questionnaireConfig = fullConfig?.Questionnaire || {};

        this.needASFlag = orderType === 'new' ? questionnaireConfig.needAS || false : false;
        this.changeASFlag = orderType === 'change' ? questionnaireConfig.changeAS || false : false;

        let scenario = null;

        if (orderType === 'new' && this.needASFlag) {
            scenario = 'new';
        } else if (orderType === 'change' && this.changeASFlag) {
            scenario = 'change';
        } else if ((orderType === 'new' && !this.needASFlag) ||
                   (orderType === 'change' && !this.changeASFlag)) {
            scenario = 'not_needed';
        }

        console.log('Модуль 5: смена сценария:', this.currentScenario, '->', scenario, 'isRestore:', isRestore);

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

        if (this.currentScenario === 'new' || this.currentScenario === 'change') {
            emptyData = { items: [] };
        }

        this.configManager.replaceModuleConfig(this.MODULE_KEY, emptyData);
        console.log('Данные модуля 5 очищены:', emptyData);
        this.addedItems = [];
        this.selectedSystem = null;
        this.selectedRoles.clear();
        this.selectedEmployees.clear();
        this.systemsSearchTerm = '';
        this.filteredSystems = [...this.systems];
    }

    renderForm() {
        if (!this.container) return;

        if (this.currentScenario === 'not_needed') {
            this.container.innerHTML = `
                <h2>5. Автоматизированные системы</h2>
                <div class="info-message" style="background: #fff3cd; border: 1px solid #ffc107;">
                    ⚠️ Автоматизированные системы не требуются
                </div>
            `;
            return;
        }

        this.renderMainForm();
    }

    renderMainForm() {
        this.container.innerHTML = `
            <h2>5. Автоматизированные системы</h2>

            <div class="as-selection-section">
                <div class="form-group">
                    <label for="systemSearch">Поиск автоматизированной системы</label>
                    <input type="text" id="systemSearch" class="search-input" placeholder="Поиск по ID или названию..." value="${this.systemsSearchTerm}">
                </div>

                <div class="form-group">
                    <label for="systemSelect">Выберите автоматизированную систему <span class="required">*</span></label>
                    <select id="systemSelect" class="as-select" size="5">
                        <option value="">-- Выберите систему --</option>
                        ${this.renderSystemsOptions()}
                    </select>
                </div>

                <div id="rolesContainer" class="roles-container" style="display: none;">
                    <label>Выберите роли:</label>
                    <div id="rolesList" class="checkbox-group"></div>
                </div>

                <div id="employeesContainer" class="employees-container" style="display: none;">
                    <label>Выберите сотрудников (из команды проверки):</label>
                    <div id="employeesList" class="checkbox-group"></div>
                </div>

                <div class="button-container">
                    <button id="addSystemBtn" class="btn">➕ Добавить</button>
                    <button id="clearSelectionBtn" class="btn btn-secondary">🗑 Очистить</button>
                </div>
            </div>

            <div class="selected-systems-section">
                <h3>Добавленные системы (${this.addedItems.length})</h3>
                <div class="table-wrapper">
                    <table id="selectedSystemsTable" class="selected-items-table">
                        <thead>
                            <tr>
                                <th>ID АС</th>
                                <th>Название АС</th>
                                <th>Роль</th>
                                <th>Сотрудники</th>
                                <th>Действия</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.renderAddedItems()}
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="button-container">
                <button id="saveSystemsBtn" class="btn">💾 Сохранить</button>
            </div>
        `;

        this.attachFormEvents();
    }

    renderSystemsOptions() {
        let filtered = [...this.systems];
        if (this.systemsSearchTerm) {
            const term = this.systemsSearchTerm.toLowerCase();
            filtered = filtered.filter(sys =>
                sys.id.toLowerCase().includes(term) ||
                sys.name.toLowerCase().includes(term)
            );
        }
        this.filteredSystems = filtered;

        if (filtered.length === 0) {
            return '<option value="" disabled>Ничего не найдено</option>';
        }

        return filtered.map(sys => `
            <option value="${sys.id}" data-roles='${JSON.stringify(sys.roles)}'>
                ${sys.id} - ${sys.name}
            </option>
        `).join('');
    }

    renderAddedItems() {
        if (this.addedItems.length === 0) {
            return '<tr><td colspan="5" style="text-align: center;">Нет добавленных系统</noscript></td></tr>';
        }

        return this.addedItems.map((item, index) => `
            <tr data-index="${index}">
                <td>${item.systemId}</td>
                <td>${item.systemName}</td>
                <td>${item.rolesDisplay}</td>
                <td>${item.employeesDisplay}</td>
                <td><button class="btn-remove" data-index="${index}">🗑 Удалить</button></td>
            </tr>
        `).join('');
    }

    attachFormEvents() {
        // Поиск по системам
        const systemSearch = this.container.querySelector('#systemSearch');
        if (systemSearch) {
            systemSearch.addEventListener('input', (e) => {
                this.systemsSearchTerm = e.target.value;
                this.updateSystemsList();
            });
        }

        const systemSelect = this.container.querySelector('#systemSelect');
        if (systemSelect) {
            systemSelect.addEventListener('change', (e) => {
                this.selectedSystem = e.target.value;
                if (this.selectedSystem) {
                    const selectedOption = e.target.options[e.target.selectedIndex];
                    const roles = selectedOption.dataset.roles ? JSON.parse(selectedOption.dataset.roles) : [];
                    this.renderRoles(roles);
                } else {
                    const rolesContainer = this.container.querySelector('#rolesContainer');
                    if (rolesContainer) rolesContainer.style.display = 'none';
                    const employeesContainer = this.container.querySelector('#employeesContainer');
                    if (employeesContainer) employeesContainer.style.display = 'none';
                }
            });
        }

        const addBtn = this.container.querySelector('#addSystemBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.addSystemItem());
        }

        const clearBtn = this.container.querySelector('#clearSelectionBtn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearSelection());
        }

        const saveBtn = this.container.querySelector('#saveSystemsBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveConfig());
        }

        const removeBtns = this.container.querySelectorAll('.btn-remove');
        removeBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(btn.dataset.index);
                this.addedItems.splice(index, 1);
                this.updateAddedItemsTable();
                this.saveConfig();
            });
        });
    }

    updateSystemsList() {
        const systemSelect = this.container.querySelector('#systemSelect');
        if (systemSelect) {
            const currentValue = systemSelect.value;
            systemSelect.innerHTML = `
                <option value="">-- Выберите систему --</option>
                ${this.renderSystemsOptions()}
            `;

            // Восстанавливаем выбранное значение, если оно все еще есть в отфильтрованном списке
            if (currentValue && this.filteredSystems.some(sys => sys.id === currentValue)) {
                systemSelect.value = currentValue;
                const selectedOption = systemSelect.options[systemSelect.selectedIndex];
                if (selectedOption && selectedOption.dataset.roles) {
                    const roles = JSON.parse(selectedOption.dataset.roles);
                    this.renderRoles(roles);
                }
            } else {
                // Скрываем контейнеры ролей и сотрудников
                const rolesContainer = this.container.querySelector('#rolesContainer');
                if (rolesContainer) rolesContainer.style.display = 'none';
                const employeesContainer = this.container.querySelector('#employeesContainer');
                if (employeesContainer) employeesContainer.style.display = 'none';
                this.selectedSystem = null;
                this.selectedRoles.clear();
                this.selectedEmployees.clear();
            }
        }
    }

    renderRoles(roles) {
        const rolesContainer = this.container.querySelector('#rolesContainer');
        const rolesList = this.container.querySelector('#rolesList');

        if (roles && roles.length > 0) {
            // Восстанавливаем выбранные роли
            rolesList.innerHTML = roles.map(role => `
                <label class="checkbox-label">
                    <input type="checkbox" value="${role}" class="role-checkbox" ${this.selectedRoles.has(role) ? 'checked' : ''}>
                    <span>${role}</span>
                </label>
            `).join('');

            rolesContainer.style.display = 'block';

            // Добавляем обработчики для чекбоксов ролей
            const roleCheckboxes = this.container.querySelectorAll('.role-checkbox');
            roleCheckboxes.forEach(cb => {
                cb.addEventListener('change', () => {
                    this.selectedRoles.clear();
                    const checked = this.container.querySelectorAll('.role-checkbox:checked');
                    checked.forEach(c => this.selectedRoles.add(c.value));
                });
            });

            // Показываем сотрудников
            this.renderEmployees();
        } else {
            rolesContainer.style.display = 'none';
            this.selectedRoles.clear();
            this.renderEmployees();
        }
    }

    renderEmployees() {
        const employeesContainer = this.container.querySelector('#employeesContainer');
        const employeesList = this.container.querySelector('#employeesList');

        if (this.employees && this.employees.length > 0) {
            employeesList.innerHTML = this.employees.map(emp => `
                <label class="checkbox-label">
                    <input type="checkbox" value="${emp.id}" class="employee-checkbox" ${this.selectedEmployees.has(emp.id) ? 'checked' : ''}>
                    <span><strong>${emp.fullName}</strong>${emp.position ? ` (${emp.position})` : ''}${emp.department ? ` - ${emp.department}` : ''}</span>
                </label>
            `).join('');

            employeesContainer.style.display = 'block';

            // Добавляем обработчики для чекбоксов сотрудников
            const employeeCheckboxes = this.container.querySelectorAll('.employee-checkbox');
            employeeCheckboxes.forEach(cb => {
                cb.addEventListener('change', () => {
                    this.selectedEmployees.clear();
                    const checked = this.container.querySelectorAll('.employee-checkbox:checked');
                    checked.forEach(c => this.selectedEmployees.add(parseInt(c.value)));
                });
            });
        } else {
            employeesList.innerHTML = '<div class="empty-message">⚠️ Нет сотрудников в команде проверки. Пожалуйста, сначала заполните модуль 3 "Команда проверки".</div>';
            employeesContainer.style.display = 'block';
        }
    }

    updateEmployeeSelect() {
        const employeesList = this.container.querySelector('#employeesList');
        if (employeesList) {
            if (this.employees && this.employees.length > 0) {
                employeesList.innerHTML = this.employees.map(emp => `
                    <label class="checkbox-label">
                        <input type="checkbox" value="${emp.id}" class="employee-checkbox" ${this.selectedEmployees.has(emp.id) ? 'checked' : ''}>
                        <span><strong>${emp.fullName}</strong>${emp.position ? ` (${emp.position})` : ''}${emp.department ? ` - ${emp.department}` : ''}</span>
                    </label>
                `).join('');

                // Восстанавливаем выбранных сотрудников
                const employeeCheckboxes = this.container.querySelectorAll('.employee-checkbox');
                employeeCheckboxes.forEach(cb => {
                    cb.addEventListener('change', () => {
                        this.selectedEmployees.clear();
                        const checked = this.container.querySelectorAll('.employee-checkbox:checked');
                        checked.forEach(c => this.selectedEmployees.add(parseInt(c.value)));
                    });
                });
            } else {
                employeesList.innerHTML = '<div class="empty-message">⚠️ Нет сотрудников в команде проверки. Пожалуйста, сначала заполните модуль 3 "Команда проверки".</div>';
                const employeesContainer = this.container.querySelector('#employeesContainer');
                if (employeesContainer) employeesContainer.style.display = 'block';
            }
        }
    }

    addSystemItem() {
        if (!this.selectedSystem) {
            this.showNotification('Пожалуйста, выберите систему', 'warning');
            return;
        }

        const system = this.systems.find(s => s.id === this.selectedSystem);
        if (!system) return;

        // Формируем отображение ролей
        let rolesDisplay = 'Все необходимые роли';
        const selectedRolesArray = Array.from(this.selectedRoles);
        if (selectedRolesArray.length > 0) {
            rolesDisplay = selectedRolesArray.join(', ');
        }

        // Формируем отображение сотрудников
        let employeesDisplay = 'Все сотрудники приложения 1';
        const selectedEmployeesArray = Array.from(this.selectedEmployees);
        if (selectedEmployeesArray.length > 0) {
            const employeeNames = selectedEmployeesArray.map(id => {
                const emp = this.employees.find(e => e.id === id);
                return emp ? emp.fullName : `Сотрудник ${id}`;
            });
            employeesDisplay = employeeNames.join(', ');
        }

        // Проверяем, нет ли уже такой записи
        const exists = this.addedItems.some(item =>
            item.systemId === system.id &&
            JSON.stringify(item.roles) === JSON.stringify(selectedRolesArray) &&
            JSON.stringify(item.employees) === JSON.stringify(selectedEmployeesArray)
        );

        if (exists) {
            this.showNotification('Такая запись уже добавлена', 'warning');
            return;
        }

        this.addedItems.push({
            systemId: system.id,
            systemName: system.name,
            roles: selectedRolesArray,
            rolesDisplay: rolesDisplay,
            employees: selectedEmployeesArray,
            employeesDisplay: employeesDisplay
        });

        // Очищаем выбор, но сохраняем поиск
        this.selectedSystem = null;
        this.selectedRoles.clear();
        this.selectedEmployees.clear();

        const systemSelect = this.container.querySelector('#systemSelect');
        if (systemSelect) systemSelect.value = '';

        const rolesContainer = this.container.querySelector('#rolesContainer');
        if (rolesContainer) rolesContainer.style.display = 'none';

        const employeesContainer = this.container.querySelector('#employeesContainer');
        if (employeesContainer) employeesContainer.style.display = 'none';

        this.updateAddedItemsTable();
        this.saveConfig();
        this.showNotification('Запись добавлена', 'success');
    }

    clearSelection() {
        this.selectedSystem = null;
        this.selectedRoles.clear();
        this.selectedEmployees.clear();

        const systemSelect = this.container.querySelector('#systemSelect');
        if (systemSelect) systemSelect.value = '';

        const rolesContainer = this.container.querySelector('#rolesContainer');
        if (rolesContainer) rolesContainer.style.display = 'none';

        const employeesContainer = this.container.querySelector('#employeesContainer');
        if (employeesContainer) employeesContainer.style.display = 'none';

        const rolesList = this.container.querySelector('#rolesList');
        if (rolesList) rolesList.innerHTML = '';

        const employeesList = this.container.querySelector('#employeesList');
        if (employeesList) employeesList.innerHTML = '';

        this.showNotification('Выбор очищен', 'info');
    }

    updateAddedItemsTable() {
        const tbody = this.container.querySelector('#selectedSystemsTable tbody');
        if (tbody) {
            tbody.innerHTML = this.renderAddedItems();

            const removeBtns = tbody.querySelectorAll('.btn-remove');
            removeBtns.forEach(btn => {
                btn.removeEventListener('click', this.removeItemHandler);
                btn.addEventListener('click', (e) => {
                    const index = parseInt(btn.dataset.index);
                    this.addedItems.splice(index, 1);
                    this.updateAddedItemsTable();
                    this.saveConfig();
                });
            });
        }

        const counter = this.container.querySelector('.selected-systems-section h3');
        if (counter) {
            counter.textContent = `Добавленные системы (${this.addedItems.length})`;
        }
    }

    removeItemHandler(e) {
        const index = parseInt(e.target.dataset.index);
        this.addedItems.splice(index, 1);
        this.updateAddedItemsTable();
        this.saveConfig();
    }

    saveConfig() {
        if (!this.currentScenario) return;

        const configData = {
            items: this.addedItems.map(item => ({
                systemId: item.systemId,
                systemName: item.systemName,
                roles: item.roles,
                rolesDisplay: item.rolesDisplay,
                employees: item.employees,
                employeesDisplay: item.employeesDisplay
            }))
        };

        this.configManager.updateModuleConfig(this.MODULE_KEY, configData);
        console.log('Сохранены АС:', configData);
        this.showNotification('Данные сохранены', 'success');
    }

    loadSavedData() {
        const savedData = this.configManager.getConfig()[this.MODULE_KEY] || {};
        console.log('Загрузка сохраненных данных модуля 5:', savedData);

        if (!this.container) {
            console.log('Контейнер не инициализирован для модуля 5');
            return;
        }

        if (Object.keys(savedData).length === 0) {
            console.log('Нет сохраненных данных для модуля 5');
            return;
        }

        if (savedData.items && Array.isArray(savedData.items)) {
            this.addedItems = [...savedData.items];
            this.updateAddedItemsTable();
            console.log('✓ Модуль 5 загрузил данные');
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