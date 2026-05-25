export default class Module1 {
    constructor(configManager) {
        this.configManager = configManager;
        this.container = null;
        this.tbList = [
            'Байкальский банк',
            'Волго-Вятский банк',
            'Дальневосточный банк',
            'Московский банк',
            'Поволжский банк',
            'Северо-Западный банк',
            'Сибирский банк',
            'Среднерусский банк',
            'Уральский банк',
            'Центрально-Чернозёмный банк',
            'Юго-Западный банк'
        ];
    }

    render() {
        const moduleContainer = document.createElement('div');
        moduleContainer.className = 'form-section';
        moduleContainer.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <h2>1. Настройки распоряжения</h2>
            </div>
            <div class="selection-group">
                <div class="radio-group">
                    <h3>Тип проверки</h3>
                    <label>
                        <input type="radio" name="auditType" value="preparation">
                        Подготовка аудиторской проверки
                    </label>
                    <label>
                        <input type="radio" name="auditType" value="execution">
                        Проведение аудиторской проверки
                    </label>
                </div>

                <div class="radio-group">
                    <h3>Тип распоряжения</h3>
                    <label>
                        <input type="radio" name="orderType" value="new">
                        Новое
                    </label>
                    <label>
                        <input type="radio" name="orderType" value="change">
                        Изменение
                    </label>
                </div>

                <div class="radio-group">
                    <h3>Уровень распоряжения</h3>
                    <label>
                        <input type="radio" name="levelOrder" value="CA">
                        Центральный аппарат
                    </label>
                    <label>
                        <input type="radio" name="levelOrder" value="TB">
                        Территориальный банк
                    </label>
                </div>

                <div id="tbSelectionBlock" class="form-group" style="display: none; margin-top: 15px;">
                    <h3>Выбор территориального банка</h3>
                    <select id="tbSelect" class="tb-select">
                        <option value="">-- Выберите территориальный банк --</option>
                        ${this.renderTBOptions()}
                    </select>
                </div>
            </div>
            <div class="button-container">
                <button id="submitChooseType" type="button" class="btn">Применить</button>
            </div>
        `;

        this.container = moduleContainer;

        const levelOrderRadios = moduleContainer.querySelectorAll('input[name="levelOrder"]');
        levelOrderRadios.forEach(radio => {
            radio.addEventListener('change', () => this.toggleTBSelection());
        });

        const submitBtn = moduleContainer.querySelector('#submitChooseType');
        submitBtn.addEventListener('click', () => this.saveConfig());

        this.toggleTBSelection();
        this.loadSavedData();

        return moduleContainer;
    }

    renderTBOptions() {
        let options = '';
        this.tbList.forEach(tb => {
            const selected = '';
            options += `<option value="${tb}" ${selected}>${tb}</option>`;
        });
        return options;
    }

    toggleTBSelection() {
        const levelOrderRadios = this.container.querySelectorAll('input[name="levelOrder"]');
        let isTBSelected = false;

        levelOrderRadios.forEach(radio => {
            if (radio.checked && radio.value === 'TB') {
                isTBSelected = true;
            }
        });

        const tbSelectionBlock = this.container.querySelector('#tbSelectionBlock');
        const tbSelect = this.container.querySelector('#tbSelect');

        if (isTBSelected) {
            tbSelectionBlock.style.display = 'block';
            tbSelect.required = true;
        } else {
            tbSelectionBlock.style.display = 'none';
            tbSelect.required = false;
            tbSelect.value = '';
        }
    }

    loadSavedData() {
        const savedConfig = this.configManager.getConfig().SettingsOrder;
        if (savedConfig && Object.keys(savedConfig).length > 0) {
            // Восстанавливаем тип проверки
            if (savedConfig.auditType) {
                const auditTypeRadio = this.container.querySelector(`input[name="auditType"][value="${savedConfig.auditType}"]`);
                if (auditTypeRadio) {
                    auditTypeRadio.checked = true;
                }
            }
            
            // Восстанавливаем тип распоряжения
            if (savedConfig.orderType) {
                const orderTypeRadio = this.container.querySelector(`input[name="orderType"][value="${savedConfig.orderType}"]`);
                if (orderTypeRadio) {
                    orderTypeRadio.checked = true;
                }
            }
            
            // Восстанавливаем уровень распоряжения
            if (savedConfig.levelOrder) {
                const levelOrderRadio = this.container.querySelector(`input[name="levelOrder"][value="${savedConfig.levelOrder}"]`);
                if (levelOrderRadio) {
                    levelOrderRadio.checked = true;
                }
            }
            
            // Восстанавливаем выбранный ТБ
            if (savedConfig.selectedTB) {
                const tbSelect = this.container.querySelector('#tbSelect');
                if (tbSelect) {
                    tbSelect.value = savedConfig.selectedTB;
                }
            }
            
            // Обновляем видимость блока выбора ТБ
            this.toggleTBSelection();
        }
    }

    validateForm() {
        const levelOrderRadios = this.container.querySelectorAll('input[name="levelOrder"]');
        let selectedLevel = null;

        levelOrderRadios.forEach(radio => {
            if (radio.checked) {
                selectedLevel = radio.value;
            }
        });

        if (selectedLevel === 'TB') {
            const tbSelect = this.container.querySelector('#tbSelect');
            if (!tbSelect.value) {
                alert('Пожалуйста, выберите территориальный банк');
                tbSelect.focus();
                return false;
            }
        }

        return true;
    }

    saveConfig() {
        if (!this.validateForm()) {
            return;
        }

        const auditType = this.container.querySelector('input[name="auditType"]:checked').value;
        const orderType = this.container.querySelector('input[name="orderType"]:checked').value;
        const levelOrder = this.container.querySelector('input[name="levelOrder"]:checked').value;
        let selectedTB = null;
        if (levelOrder === 'TB') {
            const tbSelect = this.container.querySelector('#tbSelect');
            selectedTB = tbSelect.value;
        }

        const configData = {
            auditType: auditType,
            orderType: orderType,
            modificationType: orderType, // Добавляем для совместимости с другими модулями
            levelOrder: levelOrder,
            selectedTB: selectedTB
        };

        this.configManager.updateModuleConfig('SettingsOrder', configData);
    }
}