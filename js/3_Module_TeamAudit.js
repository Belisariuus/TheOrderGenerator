export default class Module3 {
    constructor(configManager) {
        this.configManager = configManager;
        this.container = null;
        this.employees = [];
        this.filteredEmployees = [];
        this.MODULE_KEY = 'TeamAudit';
        this.currentScenario = null;
        this.currentTB = null;
        this.changeTeamFlag = false;

        // Создаем контейнер
        this.createContainer();

        // Загружаем сотрудников из JSON
        this.loadEmployeesFromJSON();

        // Подписываемся на изменения модуля 1 и модуля 2
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

        // Проверяем существующую конфигурацию
        const existingConfig = this.configManager.getConfig().SettingsOrder;
        if (existingConfig && Object.keys(existingConfig).length > 0) {
            this.updateScenario(existingConfig, this.configManager.getConfig(), false);
        }
    }

    createContainer() {
        this.container = document.createElement('div');
        this.container.className = 'form-section';
        this.container.id = 'module3-container';
        this.container.innerHTML = `
            <h2>3. Команда проверки</h2>
            <p class="info-message">⏳ Загрузка данных...</p>
        `;
    }

    async loadEmployeesFromJSON() {
        try {
            const response = await fetch('./data/employees.json');
            if (!response.ok) {
                throw new Error('JSON файл не найден');
            }
            this.employees = await response.json();
            console.log('Загружены сотрудники:', this.employees);
            this.updateFilteredEmployees();
        } catch (error) {
            console.error('Ошибка загрузки JSON:', error);
            this.employees = [];
        }

        if (this.currentScenario) {
            this.renderForm();
            this.loadSavedData();
        }
    }

    getTBMapping() {
        return {
            'Байкальский банк': 'ТБ ББ',
            'Волго-Вятский банк': 'ТБ ВВБ',
            'Дальневосточный банк': 'ТБ ДВБ',
            'Московский банк': 'ТБ МБ',
            'Поволжский банк': 'ТБ ПБ',
            'Северо-Западный банк': 'ТБ СЗБ',
            'Сибирский банк': 'ТБ СИБ',
            'Среднерусский банк': 'ТБ СРБ',
            'Уральский банк': 'ТБ УРАЛ',
            'Центрально-Чернозёмный банк': 'ТБ ЦЧБ',
            'Юго-Западный банк': 'ТБ ЮЗБ'
        };
    }

    updateFilteredEmployees() {
        if (this.currentScenario === 'change') {
            this.filteredEmployees = [...this.employees];
            console.log('Сценарий изменения - показываем всех сотрудников:', this.filteredEmployees.length);
            return;
        }

        // Если выбран ЦА или не выбран ТБ - показываем всех сотрудников
        if (!this.currentTB || this.currentTB === 'ЦА') {
            this.filteredEmployees = [...this.employees];
            console.log('Центральный аппарат - показываем всех сотрудников:', this.filteredEmployees.length);
        } else {
            const tbMapping = this.getTBMapping();
            const tbCode = tbMapping[this.currentTB];
            this.filteredEmployees = this.employees.filter(emp => emp.bank === tbCode);
            console.log(`Территориальный банк ${this.currentTB} - показываем сотрудников:`, this.filteredEmployees.length);
        }
    }

    updateScenario(module1Config, fullConfig, isRestore = false) {
        if (!module1Config) return;

        const orderType = module1Config.orderType || module1Config.modificationType;
        const levelOrder = module1Config.levelOrder;

        if (levelOrder === 'TB' && module1Config.selectedTB) {
            this.currentTB = module1Config.selectedTB;
        } else {
            this.currentTB = 'ЦА';
        }

        const questionnaireConfig = fullConfig?.Questionnaire || {};
        this.changeTeamFlag = questionnaireConfig.changeTeam || false;

        let scenario = null;

        if (orderType === 'new') {
            scenario = 'new';
        } else if (orderType === 'change') {
            // Для изменения распоряжения модуль команда должен отображаться всегда
            scenario = 'change';
        }

        console.log('Модуль 3: смена сценария:', this.currentScenario, '->', scenario, 'isRestore:', isRestore);

        if (this.currentScenario !== scenario) {
            this.currentScenario = scenario;
            
            // При восстановлении НЕ очищаем данные - они будут загружены из конфига
            if (!isRestore) {
                this.clearModuleData();
            }
            
            this.updateFilteredEmployees();
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
            emptyData = {
                curators: [],
                leader: null,
                deputy: null,
                control: null,
                signer: null,
                teamMembers: []
            };
        } else if (this.currentScenario === 'change') {
            emptyData = {
                include: [],
                exclude: [],
                signer: null,
                control: null
            };
        }

        this.configManager.replaceModuleConfig(this.MODULE_KEY, emptyData);
        console.log('Данные модуля 3 очищены для сценария:', this.currentScenario, emptyData);
    }

    renderForm() {
        if (!this.container) return;

        if (this.currentScenario === 'change') {
            this.renderChangeForm();
        } else {
            this.renderNewForm();
        }
    }

    renderNewForm() {
        let html = `
            <h2>3. Состав участников проверки</h2>

            <div class="info-banner">
                📍 ${this.currentTB === 'ЦА' ? 'Показываются все сотрудники' : `Показываются сотрудники только выбранного ТБ: ${this.currentTB}`}
            </div>

            <div class="employee-section">
                <h3>Куратор проверки (до 2-х) <span class="required">*</span></h3>
                <div id="curatorContainer">
                    <div class="employee-row">
                        <input type="text" class="employee-search-input" data-role="curator" data-index="0"
                               placeholder="Поиск по ФИО, должности, отделу или табельному номеру..." autocomplete="off">
                        <div class="selected-employee-tag" style="display: none;"></div>
                        <button type="button" class="btn btn-secondary btn-small add-curator">+ Добавить куратора</button>
                        <div class="suggestions-box"></div>
                    </div>
                </div>
                <div id="curatorTags" class="selected-tags-container"></div>
            </div>

            <div class="employee-section">
                <h3>Руководитель проверки <span class="required">*</span></h3>
                <div class="employee-row">
                    <input type="text" class="employee-search-input" id="leader"
                           placeholder="Поиск по ФИО, должности, отделу или табельному номеру..." autocomplete="off" required>
                    <div class="selected-employee-tag" style="display: none;"></div>
                    <div class="suggestions-box"></div>
                </div>
                <div id="leaderTag" class="selected-tag"></div>
            </div>

            <div class="employee-section">
                <h3>Заместитель руководителя</h3>
                <div class="employee-row">
                    <input type="text" class="employee-search-input" id="deputy"
                           placeholder="Поиск по ФИО, должности, отделу или табельному номеру..." autocomplete="off">
                    <div class="selected-employee-tag" style="display: none;"></div>
                    <div class="suggestions-box"></div>
                </div>
                <div id="deputyTag" class="selected-tag"></div>
            </div>

            <div class="employee-section">
                <h3>Контроль исполнения распоряжений <span class="required">*</span></h3>
                <div class="employee-row">
                    <input type="text" class="employee-search-input" id="control"
                           placeholder="Поиск по ФИО, должности, отделу или табельному номеру..." autocomplete="off" required>
                    <div class="selected-employee-tag" style="display: none;"></div>
                    <div class="suggestions-box"></div>
                </div>
                <div id="controlTag" class="selected-tag"></div>
            </div>

            <div class="employee-section">
                <h3>Подписант <span class="required">*</span></h3>
                <div class="employee-row">
                    <input type="text" class="employee-search-input" id="signer"
                           placeholder="Поиск по ФИО, должности, отделу или табельному номеру..." autocomplete="off" required>
                    <div class="selected-employee-tag" style="display: none;"></div>
                    <div class="suggestions-box"></div>
                </div>
                <div id="signerTag" class="selected-tag"></div>
            </div>

            <div class="employee-section">
                <h3>Команда проверки</h3>
                <div id="teamContainer">
                    <div class="employee-row">
                        <input type="text" class="employee-search-input" data-role="team" data-index="0"
                               placeholder="Поиск по ФИО, должности, отделу или табельному номеру..." autocomplete="off">
                        <button type="button" class="btn btn-secondary btn-small add-team">+ Добавить участника</button>
                        <div class="suggestions-box"></div>
                    </div>
                </div>
                <div id="teamTags" class="selected-tags-container"></div>
            </div>

            <div class="button-container">
                <button id="saveTeamBtn" class="btn">Сохранить команду</button>
            </div>
        `;

        this.container.innerHTML = html;
        this.attachSearchEvents();
        this.attachAddButtons();

        const saveBtn = this.container.querySelector('#saveTeamBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveConfig());
        }
    }

    renderChangeForm() {
        const html = `
            <h2>3. Изменение состава команды проверки</h2>

            <div class="info-banner">
                📍 ${this.currentTB === 'ЦА' ? 'Показываются все сотрудники' : `Показываются сотрудники только выбранного ТБ: ${this.currentTB}`}
            </div>

            <div class="employee-section">
                <h3>Контроль исполнения распоряжения <span class="required">*</span></h3>
                <div class="employee-row">
                    <input type="text" class="employee-search-input" id="changeControl"
                           placeholder="Поиск по ФИО, должности, отделу или табельному номеру..." autocomplete="off" required>
                    <div class="suggestions-box"></div>
                </div>
                <div id="changeControlTag" class="selected-tag"></div>
            </div>

            <div class="employee-section">
                <h3>Подписант <span class="required">*</span></h3>
                <div class="employee-row">
                    <input type="text" class="employee-search-input" id="changeSigner"
                           placeholder="Поиск по ФИО, должности, отделу или табельному номеру..." autocomplete="off" required>
                    <div class="suggestions-box"></div>
                </div>
                    <div id="changeSignerTag" class="selected-tag"></div>
            </div>

            <div class="employee-section">
                <h3>Выбрать кого включить в состав команды проверки</h3>
                <div id="includeTeamContainer">
                    <div class="employee-row">
                        <input type="text" class="employee-search-input" data-role="include" data-index="0"
                               placeholder="Поиск по ФИО, должности, отделу или табельному номеру..." autocomplete="off">
                        <button type="button" class="btn btn-secondary btn-small add-include">+ Добавить</button>
                        <div class="suggestions-box"></div>
                    </div>
                </div>
                <div id="includeTags" class="selected-tags-container"></div>
            </div>

            <div class="employee-section">
                <h3>Выбрать кого исключить из состава команды проверки</h3>
                <div id="excludeTeamContainer">
                    <div class="employee-row">
                        <input type="text" class="employee-search-input" data-role="exclude" data-index="0"
                               placeholder="Поиск по ФИО, должности, отделу или табельному номеру..." autocomplete="off">
                        <button type="button" class="btn btn-secondary btn-small add-exclude">+ Добавить</button>
                        <div class="suggestions-box"></div>
                    </div>
                </div>
                <div id="excludeTags" class="selected-tags-container"></div>
            </div>

            <div class="button-container">
                <button id="saveTeamChangesBtn" class="btn">Сохранить изменения</button>
            </div>
        `;

        this.container.innerHTML = html;
        this.attachSearchEvents();
        this.attachChangeButtons();

        const saveBtn = this.container.querySelector('#saveTeamChangesBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveChangeConfig());
        }
    }

    attachSearchEvents() {
        const searchInputs = this.container.querySelectorAll('.employee-search-input');
        searchInputs.forEach(input => {
            input.addEventListener('input', (e) => {
                const searchTerm = e.target.value.toLowerCase();
                const suggestionsBox = input.parentElement.querySelector('.suggestions-box');
                this.showSuggestions(searchTerm, suggestionsBox, input);
            });

            input.addEventListener('blur', () => {
                setTimeout(() => {
                    const suggestionsBox = input.parentElement.querySelector('.suggestions-box');
                    if (suggestionsBox) {
                        suggestionsBox.style.display = 'none';
                    }
                }, 200);
            });
        });
    }

    showSuggestions(searchTerm, suggestionsBox, input) {
        if (searchTerm.length < 2) {
            suggestionsBox.style.display = 'none';
            return;
        }

        const filtered = this.filteredEmployees.filter(emp => {
            return emp.fullName.toLowerCase().includes(searchTerm) ||
                   emp.position.toLowerCase().includes(searchTerm) ||
                   emp.department.toLowerCase().includes(searchTerm) ||
                   emp.tabNumber.includes(searchTerm);
        }).slice(0, 10);

        if (filtered.length === 0) {
            suggestionsBox.style.display = 'none';
            return;
        }

        suggestionsBox.innerHTML = filtered.map(emp => `
            <div class="suggestion-item" data-id='${JSON.stringify(emp)}'>
                <div class="suggestion-name"><strong>${emp.fullName}</strong></div>
                <div class="suggestion-details">
                    <span class="suggestion-badge">${emp.position}</span>
                    <span class="suggestion-badge">${emp.department}</span>
                    <span class="suggestion-badge">Таб.№: ${emp.tabNumber}</span>
                    <span class="suggestion-badge bank-badge">${emp.bank}</span>
                </div>
            </div>
        `).join('');

        suggestionsBox.style.display = 'block';

        const suggestions = suggestionsBox.querySelectorAll('.suggestion-item');
        suggestions.forEach(suggestion => {
            suggestion.addEventListener('click', () => {
                const employee = JSON.parse(suggestion.dataset.id);
                this.selectEmployee(input, employee);
                suggestionsBox.style.display = 'none';
            });
        });
    }

    selectEmployee(input, employee) {
        const role = input.dataset.role || input.id;
        input.value = '';
        input.dataset.selectedEmployee = JSON.stringify(employee);

        // Создаем тег для выбранного сотрудника
        this.createEmployeeTag(role, employee);

        // Очищаем поле ввода
        input.value = '';

        // Автосохранение
        if (this.currentScenario === 'new') {
            this.saveConfig();
        } else if (this.currentScenario === 'change') {
            this.saveChangeConfig();
        }
    }

    createEmployeeTag(role, employee) {
        let containerId = '';
        let tagContainer = null;

        // Определяем контейнер для тега
        switch(role) {
            case 'curator':
                containerId = 'curatorTags';
                break;
            case 'leader':
                containerId = 'leaderTag';
                break;
            case 'deputy':
                containerId = 'deputyTag';
                break;
            case 'control':
                containerId = 'controlTag';
                break;
            case 'signer':
                containerId = 'signerTag';
                break;
            case 'team':
                containerId = 'teamTags';
                break;
            case 'include':
                containerId = 'includeTags';
                break;
            case 'exclude':
                containerId = 'excludeTags';
                break;
            case 'changeSigner':
                containerId = 'changeSignerTag';
                break;
            case 'changeControl':
                containerId = 'changeControlTag';
                break;
            default:
                return;
        }

        tagContainer = this.container.querySelector(`#${containerId}`);
        if (!tagContainer) return;

        // Для одиночных ролей (leader, deputy, control, signer) - заменяем тег
        const singleRoles = ['leader', 'deputy', 'control', 'signer', 'changeSigner', 'changeControl'];
        if (singleRoles.includes(role)) {
            tagContainer.innerHTML = '';
        }

        const tag = document.createElement('div');
        tag.className = 'employee-tag';
        tag.innerHTML = `
            <div class="tag-content">
                <span class="tag-name"><strong>${employee.fullName}</strong></span>
                <span class="tag-details">${employee.position} | ${employee.department}</span>
                <span class="tag-bank">${employee.bank}</span>
            </div>
            <button class="tag-remove" data-role="${role}" data-employee='${JSON.stringify(employee)}'>×</button>
        `;

        tagContainer.appendChild(tag);

        // Добавляем обработчик удаления
        const removeBtn = tag.querySelector('.tag-remove');
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.removeEmployee(role, employee);
        });
    }

    removeEmployee(role, employee) {
        // Удаляем тег из DOM
        const tagContainer = this.container.querySelector(`#${this.getTagContainerId(role)}`);
        if (tagContainer) {
            const tags = tagContainer.querySelectorAll('.employee-tag');
            tags.forEach(tag => {
                const tagData = JSON.parse(tag.querySelector('.tag-remove')?.dataset.employee || '{}');
                if (tagData.id === employee.id) {
                    tag.remove();
                }
            });
        }

        // Очищаем связанный input
        if (role === 'curator') {
            const curatorRows = this.container.querySelectorAll('#curatorContainer .employee-row');
            curatorRows.forEach(row => {
                const input = row.querySelector('.employee-search-input');
                if (input && input.dataset.selectedEmployee) {
                    const selected = JSON.parse(input.dataset.selectedEmployee);
                    if (selected.id === employee.id) {
                        delete input.dataset.selectedEmployee;
                    }
                }
            });
        } else {
            const inputId = role === 'changeSigner' ? 'changeSigner' : role === 'changeControl' ? 'changeControl' : role;
            const input = this.container.querySelector(`#${inputId}`);
            if (input && input.dataset.selectedEmployee) {
                const selected = JSON.parse(input.dataset.selectedEmployee);
                if (selected.id === employee.id) {
                    delete input.dataset.selectedEmployee;
                }
            }
        }

        // Автосохранение
        if (this.currentScenario === 'new') {
            this.saveConfig();
        } else if (this.currentScenario === 'change') {
            this.saveChangeConfig();
        }
    }

    getTagContainerId(role) {
        const map = {
            'curator': 'curatorTags',
            'leader': 'leaderTag',
            'deputy': 'deputyTag',
            'control': 'controlTag',
            'signer': 'signerTag',
            'team': 'teamTags',
            'include': 'includeTags',
            'exclude': 'excludeTags',
            'changeSigner': 'changeSignerTag',
            'changeControl': 'changeControlTag'
        };
        return map[role] || '';
    }

    attachAddButtons() {
        const addCuratorBtn = this.container.querySelector('.add-curator');
        if (addCuratorBtn) {
            addCuratorBtn.addEventListener('click', () => this.addCuratorRow());
        }

        const addTeamBtn = this.container.querySelector('.add-team');
        if (addTeamBtn) {
            addTeamBtn.addEventListener('click', () => this.addTeamRow());
        }
    }

    attachChangeButtons() {
        const addIncludeBtn = this.container.querySelector('.add-include');
        if (addIncludeBtn) {
            addIncludeBtn.addEventListener('click', () => this.addIncludeRow());
        }

        const addExcludeBtn = this.container.querySelector('.add-exclude');
        if (addExcludeBtn) {
            addExcludeBtn.addEventListener('click', () => this.addExcludeRow());
        }
    }

    addCuratorRow() {
        const curatorTags = this.container.querySelector('#curatorTags');
        const currentCount = curatorTags.querySelectorAll('.employee-tag').length;

        if (currentCount >= 2) {
            alert('Максимум 2 куратора');
            return;
        }

        // Для кураторов используем отдельный механизм выбора через попап
        this.showEmployeeSelector('curator');
    }

    addTeamRow() {
        this.showEmployeeSelector('team');
    }

    addIncludeRow() {
        this.showEmployeeSelector('include');
    }

    addExcludeRow() {
        this.showEmployeeSelector('exclude');
    }

    showEmployeeSelector(role) {
        // Создаем модальное окно для выбора сотрудника
        const modal = document.createElement('div');
        modal.className = 'employee-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Выберите сотрудника</h3>
                    <button class="modal-close">×</button>
                </div>
                <div class="modal-body">
                    <input type="text" class="modal-search" placeholder="Поиск по ФИО, должности, отделу..." autocomplete="off">
                    <div class="modal-list"></div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const searchInput = modal.querySelector('.modal-search');
        const listContainer = modal.querySelector('.modal-list');
        const closeBtn = modal.querySelector('.modal-close');

        const renderList = (searchTerm = '') => {
            let filtered = [...this.filteredEmployees];
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                filtered = filtered.filter(emp =>
                    emp.fullName.toLowerCase().includes(term) ||
                    emp.position.toLowerCase().includes(term) ||
                    emp.department.toLowerCase().includes(term) ||
                    emp.tabNumber.includes(term)
                );
            }

            listContainer.innerHTML = filtered.map(emp => `
                <div class="modal-item" data-employee='${JSON.stringify(emp)}'>
                    <div class="modal-item-name"><strong>${emp.fullName}</strong></div>
                    <div class="modal-item-details">
                        <span>${emp.position}</span>
                        <span>${emp.department}</span>
                        <span>Таб.№: ${emp.tabNumber}</span>
                        <span class="bank-badge">${emp.bank}</span>
                    </div>
                </div>
            `).join('');

            const items = listContainer.querySelectorAll('.modal-item');
            items.forEach(item => {
                item.addEventListener('click', () => {
                    const employee = JSON.parse(item.dataset.employee);
                    this.selectEmployeeForRole(role, employee);
                    modal.remove();
                });
            });
        };

        renderList();

        searchInput.addEventListener('input', (e) => {
            renderList(e.target.value);
        });

        closeBtn.addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }

    selectEmployeeForRole(role, employee) {
        if (role === 'curator') {
            const curatorTags = this.container.querySelector('#curatorTags');
            const currentCount = curatorTags.querySelectorAll('.employee-tag').length;
            if (currentCount >= 2) {
                alert('Максимум 2 куратора');
                return;
            }
        }

        this.createEmployeeTag(role, employee);

        if (this.currentScenario === 'new') {
            this.saveConfig();
        } else if (this.currentScenario === 'change') {
            this.saveChangeConfig();
        }
    }

    saveConfig() {
        if (this.currentScenario !== 'new') return;

        // Собираем кураторов из тегов
        const curatorTags = this.container.querySelector('#curatorTags');
        const curators = [];
        if (curatorTags) {
            const tags = curatorTags.querySelectorAll('.employee-tag');
            tags.forEach(tag => {
                const removeBtn = tag.querySelector('.tag-remove');
                if (removeBtn && removeBtn.dataset.employee) {
                    curators.push(JSON.parse(removeBtn.dataset.employee));
                }
            });
        }

        // Руководитель
        const leaderTag = this.container.querySelector('#leaderTag');
        let leader = null;
        if (leaderTag) {
            const removeBtn = leaderTag.querySelector('.tag-remove');
            if (removeBtn && removeBtn.dataset.employee) {
                leader = JSON.parse(removeBtn.dataset.employee);
            }
        }

        // Заместитель
        const deputyTag = this.container.querySelector('#deputyTag');
        let deputy = null;
        if (deputyTag) {
            const removeBtn = deputyTag.querySelector('.tag-remove');
            if (removeBtn && removeBtn.dataset.employee) {
                deputy = JSON.parse(removeBtn.dataset.employee);
            }
        }

        // Контроль
        const controlTag = this.container.querySelector('#controlTag');
        let control = null;
        if (controlTag) {
            const removeBtn = controlTag.querySelector('.tag-remove');
            if (removeBtn && removeBtn.dataset.employee) {
                control = JSON.parse(removeBtn.dataset.employee);
            }
        }

        // Подписант
        const signerTag = this.container.querySelector('#signerTag');
        let signer = null;
        if (signerTag) {
            const removeBtn = signerTag.querySelector('.tag-remove');
            if (removeBtn && removeBtn.dataset.employee) {
                signer = JSON.parse(removeBtn.dataset.employee);
            }
        }

        // Команда
        const teamTags = this.container.querySelector('#teamTags');
        const teamMembers = [];
        if (teamTags) {
            const tags = teamTags.querySelectorAll('.employee-tag');
            tags.forEach(tag => {
                const removeBtn = tag.querySelector('.tag-remove');
                if (removeBtn && removeBtn.dataset.employee) {
                    teamMembers.push(JSON.parse(removeBtn.dataset.employee));
                }
            });
        }

        const teamData = {
            curators: curators,
            leader: leader,
            deputy: deputy,
            control: control,
            signer: signer,
            teamMembers: teamMembers
        };

        this.configManager.updateModuleConfig(this.MODULE_KEY, teamData);
        console.log('Сохранена команда:', teamData);
        this.showNotification('Команда сохранена');
    }

    saveChangeConfig() {
        if (this.currentScenario !== 'change') return;

        // Контроль исполнения
        const controlTag = this.container.querySelector('#changeControlTag');
        let control = null;
        if (controlTag) {
            const removeBtn = controlTag.querySelector('.tag-remove');
            if (removeBtn && removeBtn.dataset.employee) {
                control = JSON.parse(removeBtn.dataset.employee);
            }
        }

        // Подписант
        const signerTag = this.container.querySelector('#changeSignerTag');
        let signer = null;
        if (signerTag) {
            const removeBtn = signerTag.querySelector('.tag-remove');
            if (removeBtn && removeBtn.dataset.employee) {
                signer = JSON.parse(removeBtn.dataset.employee);
            }
        }

        // Включаемые
        const includeTags = this.container.querySelector('#includeTags');
        const includeMembers = [];
        if (includeTags) {
            const tags = includeTags.querySelectorAll('.employee-tag');
            tags.forEach(tag => {
                const removeBtn = tag.querySelector('.tag-remove');
                if (removeBtn && removeBtn.dataset.employee) {
                    includeMembers.push(JSON.parse(removeBtn.dataset.employee));
                }
            });
        }

        // Исключаемые
        const excludeTags = this.container.querySelector('#excludeTags');
        const excludeMembers = [];
        if (excludeTags) {
            const tags = excludeTags.querySelectorAll('.employee-tag');
            tags.forEach(tag => {
                const removeBtn = tag.querySelector('.tag-remove');
                if (removeBtn && removeBtn.dataset.employee) {
                    excludeMembers.push(JSON.parse(removeBtn.dataset.employee));
                }
            });
        }

        const changeData = {
                include: includeMembers,
                exclude: excludeMembers,
                signer: signer,
                control: control

        };

        this.configManager.updateModuleConfig(this.MODULE_KEY, changeData);
        console.log('Сохранены изменения команды:', changeData);
        this.showNotification('Изменения сохранены');
    }

    loadSavedData() {
        const savedData = this.configManager.getConfig()[this.MODULE_KEY] || {};
        console.log('Загрузка сохраненных данных модуля 3:', savedData);

        if (!this.container || !this.currentScenario) {
            console.log('Контейнер или сценарий не инициализированы для модуля 3');
            return;
        }

        if (Object.keys(savedData).length === 0) {
            console.log('Нет сохраненных данных для модуля 3');
            return;
        }

        if (this.currentScenario === 'new') {
            // Загружаем кураторов
            if (savedData.curators && Array.isArray(savedData.curators) && savedData.curators.length > 0) {
                savedData.curators.forEach(employee => {
                    this.createEmployeeTag('curator', employee);
                });
            }

            // Загружаем руководителя
            if (savedData.leader) {
                this.createEmployeeTag('leader', savedData.leader);
            }

            // Загружаем заместителя
            if (savedData.deputy) {
                this.createEmployeeTag('deputy', savedData.deputy);
            }

            // Загружаем контроль
            if (savedData.control) {
                this.createEmployeeTag('control', savedData.control);
            }

            // Загружаем подписанта
            if (savedData.signer) {
                this.createEmployeeTag('signer', savedData.signer);
            }

            // Загружаем команду
            if (savedData.teamMembers && Array.isArray(savedData.teamMembers) && savedData.teamMembers.length > 0) {
                savedData.teamMembers.forEach(employee => {
                    this.createEmployeeTag('team', employee);
                });
            }
        } else if (this.currentScenario === 'change') {
            // Загружаем контроль исполнения
            if (savedData.changes && savedData.changes.control) {
                this.createEmployeeTag('changeControl', savedData.changes.control);
            }

            // Загружаем подписанта
            if (savedData.changes && savedData.changes.signer) {
                this.createEmployeeTag('changeSigner', savedData.changes.signer);
            }

            // Загружаем включаемых
            if (savedData.changes && savedData.changes.include && Array.isArray(savedData.changes.include) && savedData.changes.include.length > 0) {
                savedData.changes.include.forEach(employee => {
                    this.createEmployeeTag('include', employee);
                });
            }

            // Загружаем исключаемых
            if (savedData.changes && savedData.changes.exclude && Array.isArray(savedData.changes.exclude) && savedData.changes.exclude.length > 0) {
                savedData.changes.exclude.forEach(employee => {
                    this.createEmployeeTag('exclude', employee);
                });
            }
        }
        
        console.log('✓ Модуль 3 загрузил данные');
    }

    showNotification(message) {
        const notification = document.createElement('div');
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #4CAF50;
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