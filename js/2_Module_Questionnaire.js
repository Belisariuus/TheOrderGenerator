export default class Module2 {
    constructor(configManager) {
        this.configManager = configManager;
        this.container = null;
        this.currentScenario = null;
        this.MODULE_KEY = 'Questionnaire';
        this.createContainer();

        this.configManager.subscribe((moduleName, data, fullConfig) => {
            if (moduleName === 'SettingsOrder') {
                this.updateScenario(data, false);
            }
            // Обработка восстановления сессии или импорта файла
            if (moduleName === 'SessionRestore' || moduleName === 'FileImport') {
                const settingsOrderConfig = fullConfig.SettingsOrder;
                if (settingsOrderConfig && Object.keys(settingsOrderConfig).length > 0) {
                    // Сначала обновляем сценарий на основе SettingsOrder с флагом восстановления
                    this.updateScenario(settingsOrderConfig, true);
                    // Затем загружаем данные этого модуля
                    setTimeout(() => {
                        this.loadSavedData();
                    }, 100);
                }
            }
        });

        const existingConfig = this.configManager.getConfig().SettingsOrder;
        if (existingConfig && Object.keys(existingConfig).length > 0) {
            this.updateScenario(existingConfig);
        }
    }

    createContainer() {
        this.container = document.createElement('div');
        this.container.className = 'form-section';
        this.container.id = 'module2-container';

        this.container.innerHTML = `
            <h2>2. Опросник</h2>
            <p class="info-message">⏳ Ожидание выбора настроек в модуле 1...</p>
        `;
    }

    // Обновление сценария
    updateScenario(module1Config, isRestore = false) {
        if (!module1Config) return;

        const auditType = module1Config.auditType;
        const orderType = module1Config.orderType || module1Config.modificationType;

        let scenario = null;

        if (auditType === 'preparation' && orderType === 'new') {
            scenario = 'preparation_new';
        } else if (auditType === 'execution' && orderType === 'new') {
            scenario = 'execution_new';
        } else if (auditType === 'preparation' && orderType === 'change') {
            scenario = 'preparation_change';
        } else if (auditType === 'execution' && orderType === 'change') {
            scenario = 'execution_change';
        }

        console.log('Смена сценария:', this.currentScenario, '->', scenario, 'isRestore:', isRestore);

        if (this.currentScenario !== scenario) {
            this.currentScenario = scenario;

            // ПРИ restoration НЕ очищаем данные - они будут загружены из конфига
            if (!isRestore) {
                // ПРИНУДИТЕЛЬНАЯ ОЧИСТКА данных модуля
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

    // ПРИНУДИТЕЛЬНАЯ очистка данных модуля 2
    clearModuleData() {
        // Создаем пустой объект для нового сценария
        let emptyData = {};

        // Инициализируем пустые поля в зависимости от сценария
        switch(this.currentScenario) {
            case 'preparation_new':
                emptyData = {
                    auditName: null,
                    startDate: null,
                    endDate: null,
                    basisPoint: null,
                    needAS: false,
                    needProcesses: false
                };
                break;
            case 'execution_new':
                emptyData = {
                    auditName: null,
                    startDate: null,
                    endDate: null,
                    actSendDate: null,
                    basisPoint: null,
                    needAS: false,
                    needProcesses: false
                };
                break;
            case 'preparation_change':
                emptyData = {
                    reason: null,
                    auditName: null,
                    orderDate: null,
                    orderNumber: null,
                    oldEndDate: null,
                    newEndDate: null,
                    changeTeam: false,
                    changeAS: false,
                    changeProcesses: false
                };
                break;
            case 'execution_change':
                emptyData = {
                    reason: null,
                    auditName: null,
                    orderNumber: null,
                    oldEndDate: null,
                    newEndDate: null,
                    newActSendDate: null,
                    changeTeam: false,
                    changeAS: false,
                    changeProcesses: false
                };
                break;
            default:
                emptyData = {};
        }

        // Используем replaceModuleConfig для полной замены данных
        this.configManager.replaceModuleConfig(this.MODULE_KEY, emptyData);
        console.log('Данные модуля 2 принудительно очищены для сценария:', this.currentScenario, emptyData);
    }

    // Сохранение данных
    saveConfig() {
        if (!this.currentScenario) return;

        const formData = {};

        switch(this.currentScenario) {
            case 'preparation_new':
                formData.auditName = this.container.querySelector('#auditName')?.value || null;
                formData.startDate = this.container.querySelector('#startDate')?.value || null;
                formData.endDate = this.container.querySelector('#endDate')?.value || null;
                formData.basisPoint = this.container.querySelector('#basisPoint')?.value || null;
                formData.needAS = this.container.querySelector('#needAS')?.checked || false;
                formData.needProcesses = this.container.querySelector('#needProcesses')?.checked || false;
                break;

            case 'execution_new':
                formData.auditName = this.container.querySelector('#auditName')?.value || null;
                formData.startDate = this.container.querySelector('#startDate')?.value || null;
                formData.endDate = this.container.querySelector('#endDate')?.value || null;
                formData.actSendDate = this.container.querySelector('#actSendDate')?.value || null;
                formData.basisPoint = this.container.querySelector('#basisPoint')?.value || null;
                formData.needAS = this.container.querySelector('#needAS')?.checked || false;
                formData.needProcesses = this.container.querySelector('#needProcesses')?.checked || false;
                break;

            case 'preparation_change':
                formData.reason = this.container.querySelector('#reason')?.value || null;
                formData.auditName = this.container.querySelector('#auditName')?.value || null;
                formData.orderNumber = this.container.querySelector('#orderNumber')?.value || null;
                formData.oldEndDate = this.container.querySelector('#oldEndDate')?.value || null;
                formData.newEndDate = this.container.querySelector('#newEndDate')?.value || null;
                formData.changeTeam = this.container.querySelector('#changeTeam')?.checked || false;
                formData.changeAS = this.container.querySelector('#changeAS')?.checked || false;
                formData.changeProcesses = this.container.querySelector('#changeProcesses')?.checked || false;
                break;

            case 'execution_change':
                formData.reason = this.container.querySelector('#reason')?.value || null;
                formData.auditName = this.container.querySelector('#auditName')?.value || null;
                formData.orderNumber = this.container.querySelector('#orderNumber')?.value || null;
                formData.oldEndDate = this.container.querySelector('#oldEndDate')?.value || null;
                formData.newEndDate = this.container.querySelector('#newEndDate')?.value || null;
                formData.newActSendDate = this.container.querySelector('#newActSendDate')?.value || null;
                formData.changeTeam = this.container.querySelector('#changeTeam')?.checked || false;
                formData.changeAS = this.container.querySelector('#changeAS')?.checked || false;
                formData.changeProcesses = this.container.querySelector('#changeProcesses')?.checked || false;
                break;
        }

        // Используем updateModuleConfig для сохранения (слияние)
        this.configManager.updateModuleConfig(this.MODULE_KEY, formData);
        console.log('Сохранены данные модуля 2:', formData);
    }

    // Загрузка сохраненных данных
    loadSavedData() {
        const savedData = this.configManager.getConfig()[this.MODULE_KEY] || {};
        console.log('Загрузка сохраненных данных модуля 2:', savedData);

        if (!this.container || !this.currentScenario) {
            console.log('Контейнер или сценарий не инициализированы');
            return;
        }

        if (Object.keys(savedData).length === 0) {
            console.log('Нет сохраненных данных для модуля 2');
            return;
        }

        const inputs = this.container.querySelectorAll('input, select');
        inputs.forEach(input => {
            const key = input.id;
            if (savedData.hasOwnProperty(key) && savedData[key] !== null && savedData[key] !== undefined) {
                if (input.type === 'checkbox') {
                    input.checked = savedData[key];
                    console.log(`Загружен чекбокс ${key}:`, savedData[key]);
                } else {
                    input.value = savedData[key];
                    console.log(`Загружено поле ${key}:`, savedData[key]);
                }
            }
        });
    }

    // Рендер формы
    renderForm() {
        if (!this.container) return;

        let html = '<h2>2. Опросник</h2>';

        switch(this.currentScenario) {
            case 'preparation_new':
                html += this.renderPreparationNewForm();
                break;
            case 'execution_new':
                html += this.renderExecutionNewForm();
                break;
            case 'preparation_change':
                html += this.renderPreparationChangeForm();
                break;
            case 'execution_change':
                html += this.renderExecutionChangeForm();
                break;
            default:
                html += '<p class="info-message">⚙️ Выберите настройки в модуле 1 для отображения формы</p>';
        }

        this.container.innerHTML = html;

        if (this.currentScenario) {
            this.attachEventListeners();
        }
    }

    renderPreparationNewForm() {
        return `
            <div class="form-group">
                <label for="auditName">Название проверки <span class="required">*</span></label>
                <input type="text" id="auditName" placeholder="Введите название проверки">
            </div>

            <div class="date-group">
                <div class="form-group">
                    <label for="startDate">Дата начала подготовки <span class="required">*</span></label>
                    <input type="date" id="startDate">
                </div>
                <div class="form-group">
                    <label for="endDate">Дата окончания подготовки <span class="required">*</span></label>
                    <input type="date" id="endDate">
                </div>
            </div>

            <div class="form-group">
                <label for="basisPoint">Выбор пункта плана проверки <span class="required">*</span></label>
                <select id="basisPoint">
                    <option value="">Выберите пункт</option>
                    <option value="1">п.1</option>
                    <option value="2">п.2</option>
                    <option value="3">п.3</option>
                    <option value="4">п.4</option>
                    <option value="5">п.5</option>
                    <option value="6">п.6</option>
                </select>
            </div>

            ${this.renderBasisTable()}

            <div class="checkbox-group">
                <label>
                    <input type="checkbox" id="needAS">
                    Нужны ли автоматизированные процессы (АС)
                </label>
                <label>
                    <input type="checkbox" id="needProcesses">
                    Нужен ли выбор процессов (П) и клиентских путей (КП)
                </label>
            </div>

            <div class="button-container">
                <button id="saveQuestionnaireBtn" class="btn">Сохранить</button>
            </div>
        `;
    }

    renderExecutionNewForm() {
        return `
            <div class="form-group">
                <label for="auditName">Название проверки <span class="required">*</span></label>
                <input type="text" id="auditName" placeholder="Введите название проверки">
            </div>

            <div class="date-group">
                <div class="form-group">
                    <label for="startDate">Дата начала проведения проверки <span class="required">*</span></label>
                    <input type="date" id="startDate">
                </div>
                <div class="form-group">
                    <label for="endDate">Дата окончания проверочных действий <span class="required">*</span></label>
                    <input type="date" id="endDate">
                </div>
                <div class="form-group">
                    <label for="actSendDate">Дата направления акта <span class="required">*</span></label>
                    <input type="date" id="actSendDate">
                </div>
            </div>

            <div class="form-group">
                <label for="basisPoint">Выбор пункта плана проверки <span class="required">*</span></label>
                <select id="basisPoint">
                    <option value="">Выберите пункт</option>
                    <option value="1">п.1</option>
                    <option value="2">п.2</option>
                    <option value="3">п.3</option>
                    <option value="4">п.4</option>
                    <option value="5">п.5</option>
                    <option value="6">п.6</option>
                </select>
            </div>

            ${this.renderBasisTable()}

            <div class="checkbox-group">
                <label>
                    <input type="checkbox" id="needAS">
                    Нужны ли автоматизированные процессы (АС)
                </label>
                <label>
                    <input type="checkbox" id="needProcesses">
                    Нужен ли выбор процессов (П) и клиентских путей (КП)
                </label>
            </div>

            <div class="button-container">
                <button id="saveQuestionnaireBtn" class="btn">Сохранить</button>
            </div>
        `;
    }

    renderPreparationChangeForm() {
        return `
            <div class="form-group">
                <label for="reason">Причина изменения распоряжения <span class="required">*</span></label>
                <input type="text" id="reason" placeholder="Введите причину изменения">
            </div>

            <div class="form-group">
                <label for="auditName">Наименование проверки <span class="required">*</span></label>
                <input type="text" id="auditName" placeholder="Введите наименование проверки">
            </div>

            <div class="form-group">
                <label for="orderNumber">Номер распоряжения <span class="required">*</span></label>
                <input type="text" id="orderNumber" placeholder="Введите номер распоряжения">
            </div>

            <div class="date-group">
                <div class="form-group">
                    <label for="oldEndDate">Дата распоряжения <span class="required">*</span></label>
                    <input type="date" id="oldEndDate">
                </div>
                <div class="form-group">
                    <label for="newEndDate">Новая дата окончания подготовки <span class="required">*</span></label>
                    <input type="date" id="newEndDate">
                </div>
            </div>

            <div class="checkbox-group">
                <h3>Изменения:</h3>
                <label>
                    <input type="checkbox" id="changeTeam">
                    Нужно ли изменить состав проверки
                </label>
                <label>
                    <input type="checkbox" id="changeAS">
                    Нужно ли изменить автоматизированные процессы (АС)
                </label>
                <label>
                    <input type="checkbox" id="changeProcesses">
                    Нужно ли изменить процессы (П) или клиентские пути (КП)
                </label>
            </div>

            <div class="button-container">
                <button id="saveQuestionnaireBtn" class="btn">Сохранить</button>
            </div>
        `;
    }

    renderExecutionChangeForm() {
        return `
            <div class="form-group">
                <label for="reason">Причина изменения распоряжения <span class="required">*</span></label>
                <input type="text" id="reason" placeholder="Введите причину изменения">
            </div>

            <div class="form-group">
                <label for="auditName">Наименование проверки <span class="required">*</span></label>
                <input type="text" id="auditName" placeholder="Введите наименование проверки">
            </div>

            <div class="form-group">
                <label for="orderNumber">Номер распоряжения <span class="required">*</span></label>
                <input type="text" id="orderNumber" placeholder="Введите номер распоряжения">
            </div>

            <div class="date-group">
                <div class="form-group">
                    <label for="oldEndDate">Дата распоряжения <span class="required">*</span></label>
                    <input type="date" id="oldEndDate">
                </div>
                <div class="form-group">
                    <label for="newEndDate">Новая дата окончания проверочных действий <span class="required">*</span></label>
                    <input type="date" id="newEndDate">
                </div>
                <div class="form-group">
                    <label for="newActSendDate">Новая дата направления акта <span class="required">*</span></label>
                    <input type="date" id="newActSendDate">
                </div>
            </div>

            <div class="checkbox-group">
                <h3>Изменения:</h3>
                <label>
                    <input type="checkbox" id="changeTeam">
                    Нужно ли изменить состав проверки
                </label>
                <label>
                    <input type="checkbox" id="changeAS">
                    Нужно ли изменить автоматизированные процессы (АС)
                </label>
                <label>
                    <input type="checkbox" id="changeProcesses">
                    Нужно ли изменить процессы (П) или клиентские пути (КП)
                </label>
            </div>

            <div class="button-container">
                <button id="saveQuestionnaireBtn" class="btn">Сохранить</button>
            </div>
        `;
    }

    renderBasisTable() {
        const basisData = {
            1: { name: 'Пункт 1', description: 'Основание для проведения проверки согласно плану на текущий год' },
            2: { name: 'Пункт 2', description: 'Внеплановая проверка по поручению руководства' },
            3: { name: 'Пункт 3', description: 'Проверка по результатам предыдущих аудиторских мероприятий' },
            4: { name: 'Пункт 4', description: 'Проверка по обращению контролирующих органов' },
            5: { name: 'Пункт 5', description: 'Проверка в рамках комплексного аудита' },
            6: { name: 'Пункт 6', description: 'Тематическая проверка по отдельному направлению' }
        };

        let tableRows = '';
        for (let i = 1; i <= 6; i++) {
            tableRows += `
                <tr>
                    <td>п.${i}</td>
                    <td>${basisData[i].name}</td>
                    <td>${basisData[i].description}</td>
                </tr>
            `;
        }

        return `
            <div class="table-container">
                <h3>Описание пунктов плана проверки</h3>
                <table class="basis-table">
                    <thead>
                        <tr>
                            <th>Номер</th>
                            <th>Название</th>
                            <th>Описание</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
            </div>
        `;
    }

    attachEventListeners() {
        const saveBtn = this.container.querySelector('#saveQuestionnaireBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveConfig());
        }

        const inputs = this.container.querySelectorAll('input, select');
        inputs.forEach(input => {
            input.addEventListener('change', () => this.saveConfig());
            input.addEventListener('input', () => this.saveConfig());
        });
    }


    render() {
        return this.container;
    }
}