export default class DocxGenerator {
    constructor(configManager) {
        this.configManager = configManager;
        this.config = configManager.getConfig();
        
        // Словари названий территориальных банков
        this.dictNameTB = {
            "ТБ ББ": ["Байкальский банк", "Байкальскому банку"],
            "ТБ ВВБ": ["Волго-Вятский банк", "Волго-Вятскому банку"],
            "ТБ ДВБ": ["Дальневосточный банк", "Дальневосточному банку"],
            "ТБ МБ": ["Московский банк", "Московскому банку"],
            "ТБ ПБ": ["Поволжский банк", "Поволжскому банку"],
            "ТБ СЗБ": ["Северо-Западный банк", "Северо-Западному банку"],
            "ТБ СИБ": ["Сибирский банк", "Сибирскому банку"],
            "ТБ СРБ": ["Среднерусский банк", "Среднерусскому банку"],
            "ТБ УРАЛ": ["Уральский банк", "Уральскому банку"],
            "ТБ ЦЧБ": ["Центрально-Чернозёмный банк", "Центрально-Чернозёмному банку"],
            "ТБ ЮЗБ": ["Юго-Западный банк", "Юго-Западному банку"],
            "ЦА": ["Центральный аппарат", "Центральному аппарату"]
        };

        // Словарь должностей для сортировки
        this.dictNamePost = {
            'Аудитор': 1,
            'Аудитор-младший аналитик данных': 1,
            'Аудитор-младший исследователь данных': 1,
            'Ведущ.спец.по аудиту-исследователь данн.': 2,
            'Ведущий аудитор': 3,
            'Ведущий аудитор-аналитик данных': 3,
            'Ведущий аудитор-исследователь данных': 3,
            'Ведущий специалист по цифр.техн-м аудита': 2,
            'Ведущий эксперт по аудиту': 4,
            'Главный аудитор': 4,
            'Главный аудитор-аналитик данных': 4,
            'Главный аудитор-исследователь данных': 4,
            'Главный инженер по разработке': 4,
            'Главный эксперт по цифр.техн-м аудита': 4,
            'Директор управления': 8,
            'Заместитель директора управления': 7,
            'Заместитель начальника отдела': 5,
            'Исполнительный директор-начальник отдела': 10,
            'Менеджер направления': 5,
            'Менеджер по работе с регионами': 5,
            'Начальник отдела': 6,
            'Рук-ль направления по исслед.данных': 9,
            'Руководитель направления': 9,
            'Специалист': 1,
            'Специалист по цифр.техн-м аудита': 1,
            'Старший аудитор': 2,
            'Старший аудитор-аналитик данных': 2,
            'Старший аудитор-исследователь данных': 2,
            'Старший управляющий директор-дир.управл.': 11,
            'Управляющий директор': 7,
            'Управляющий директор-зам.дир.управления': 7,
            'Эксперт по контролю операций': 3,
            'Эксперт по цифр.техн-м аудита': 3
        };

        // Формы слов в зависимости от типа проверки
        this.listWordFormsPrep = [
            'О подготовке к аудиторской проверке',
            'подготовку к аудиторской проверке',
            'подготовку',
            'подготовки к проверки',
            '',
            'подготовки к аудиторской проверке',
            'для подготовки аудиторской проверки',
            'подготовки к аудиторской проверке',
            'подготовку аудиторской проверки',
            '',
            'начать',
            'подготовку к аудиторской проверке'
        ];

        this.listWordFormsExecute = [
            'О проведении аудиторской проверки',
            'к проведению аудиторской проверки',
            'реализацию проверки',
            'проведения проверки',
            'аудиторской проверки ',
            'аудиторской проверки',
            'для проведения аудиторской проверки',
            'проведения проверки',
            'проведение проверки',
            'проверочные действия',
            'приступить',
            'реализацию проверки'
        ];

        // Справочные данные из JSON файлов
        this.processesData = null;
        this.systemsData = null;
        this.employeesData = null;
    }

    /**
     * Публичный метод для подготовки и генерации документа из конфига
     * Вызывается из index.html по кнопке
     */
    async prepareDocument() {
        // Проверяем, все ли модули сохранили данные
        if (!this.configManager.isAllModulesSaved()) {
            alert('⚠️ Не все модули заполнены! Пожалуйста, заполните все необходимые модули перед генерацией.');
            return;
        }

        // Генерируем уникальное имя задачи на основе даты
        const now = new Date();
        const taskName = `Task_${now.toISOString().slice(0,10).replace(/-/g,'')}_${now.getHours()}-${now.getMinutes()}`;
        
        await this.generateFromConfig(taskName);
    }

    /**
     * Собирает конфигурацию из всех модулей и генерирует документ
     * @param {string} taskName - Имя папки задачи для сохранения файла
     */
    async generateFromConfig(taskName) {
        try {
            // Получаем данные из всех модулей через configManager
            const settingsOrder = this.configManager.getModuleConfig('SettingsOrder');
            const questionnaire = this.configManager.getModuleConfig('Questionnaire');
            const teamAudit = this.configManager.getModuleConfig('TeamAudit');
            const processesModule = this.configManager.getModuleConfig('ProcessesModule');
            const automatedSystems = this.configManager.getModuleConfig('AutomatedSystems');

            console.log('Генерация документа из конфигурации:', {
                settingsOrder,
                questionnaire,
                teamAudit,
                processesModule,
                automatedSystems
            });

            // Проверка обязательных данных
            if (!settingsOrder || !settingsOrder.auditType) {
                alert('❌ Не выбран тип проверки в Модуле 1');
                return;
            }

            if (!questionnaire || Object.keys(questionnaire).length === 0) {
                alert('❌ Не заполнен Опросник в Модуле 2');
                return;
            }

            // Преобразуем данные из модулей в формат для генератора
            const dictAttributes = this.prepareAttributes(
                settingsOrder,
                questionnaire,
                teamAudit,
                processesModule,
                automatedSystems
            );

            // Генерируем документ
            await this.generateDocument(dictAttributes, taskName);
        } catch (error) {
            console.error('Ошибка при генерации документа:', error);
            alert(`❌ Ошибка генерации документа: ${error.message}`);
        }
    }

    /**
     * Подготавливает атрибуты для генератора из данных модулей
     */
    prepareAttributes(settingsOrder, questionnaire, teamAudit, processesModule, automatedSystems) {
        const attrs = {};

        // Из SettingsOrder
        attrs.pod_or_prov = settingsOrder.auditType === 'preparation' ? '0' : '1';
        attrs.isTB = settingsOrder.levelOrder === 'TB' ? '1' : '0';
        if (settingsOrder.selectedTB) {
            // Находим код ТБ по названию
            const tbCode = Object.keys(this.dictNameTB).find(key => 
                this.dictNameTB[key][0] === settingsOrder.selectedTB
            );
            attrs.tbName = tbCode || 'ЦА';
        } else {
            attrs.tbName = 'ЦА';
        }

        // Из Questionnaire
        attrs.name = questionnaire.auditName || '';
        
        if (settingsOrder.orderType === 'change') {
            // Сценарий изменения
            attrs.provNum = questionnaire.orderNumber || '';
            attrs.reason = questionnaire.reason || '';
            
            if (questionnaire.newEndDate) {
                const oldDate = questionnaire.oldEndDate || questionnaire.startDate || '';
                attrs.dates = `${this.formatDateToSlash(oldDate)},${this.formatDateToSlash(questionnaire.newEndDate)}`;
            }
            
            if (questionnaire.newActSendDate) {
                attrs.act_date = this.formatDateToSlash(questionnaire.newActSendDate);
            }
        } else {
            // Новый сценарий
            attrs.dates = `${this.formatDateToSlash(questionnaire.startDate)},${this.formatDateToSlash(questionnaire.endDate)}`;
            attrs.punkt = questionnaire.basisPoint || '';
            
            if (questionnaire.actSendDate) {
                attrs.act_date = this.formatDateToSlash(questionnaire.actSendDate);
            }
        }

        // Из TeamAudit
        if (teamAudit.curators && teamAudit.curators.length > 0) {
            attrs.curator = teamAudit.curators.map(cur => 
                `${cur.fullName}(${cur.tabNumber}),${cur.department},${cur.position},${cur.bank}`
            ).join(';');
        } else {
            attrs.curator = '-';
        }

        if (teamAudit.leader) {
            const leader = teamAudit.leader;
            attrs.supervisor = `${leader.position},${leader.department},${leader.fullName}(${leader.tabNumber}),${leader.bank}`;
        }

        if (teamAudit.deputy) {
            const deputy = teamAudit.deputy;
            attrs.subsuper = `${deputy.position},${deputy.department},${deputy.fullName}(${deputy.tabNumber}),${deputy.bank}`;
        }

        if (teamAudit.control) {
            const control = teamAudit.control;
            attrs.director = `${control.fullName}(${control.tabNumber}),${control.position}`;
            console.log(attrs.director);
        }

        if (teamAudit.signer) {
            const signer = teamAudit.signer;
            attrs.podpis = `${signer.fullName}(${signer.tabNumber}),${signer.position}`;
        }

        // Команда проверки
        if (teamAudit.teamMembers && teamAudit.teamMembers.length > 0) {
            attrs.emps = teamAudit.teamMembers.map(emp => 
                `${emp.fullName}(${emp.tabNumber}),${emp.department},${emp.position},${emp.bank}`
            ).join(';');
        } else {
            attrs.emps = '';
        }

        // Изменения команды
        if (teamAudit.changes) {
            if (teamAudit.changes.include && teamAudit.changes.include.length > 0) {
                attrs.addEmployees = teamAudit.changes.include.map(emp => 
                    `${emp.fullName}(${emp.tabNumber}),${emp.department},${emp.position},${emp.bank}`
                ).join(';');
            }
            if (teamAudit.changes.exclude && teamAudit.changes.exclude.length > 0) {
                attrs.delEmployees = teamAudit.changes.exclude.map(emp => 
                    `${emp.fullName}(${emp.tabNumber}),${emp.department},${emp.position},${emp.bank}`
                ).join(';');
            }
            if (teamAudit.changes.signer) {
                const signer = teamAudit.changes.signer;
                attrs.podpis = `${signer.fullName}(${signer.tabNumber}),${signer.position}`;
            }
        }

        // Из ProcessesModule
        if (processesModule.items && processesModule.items.length > 0) {
            const procsKPs = processesModule.items.map(item => {
                const procCode = item.processCode.replace('П', '');
                const kpCode = item.pathCode && item.pathCode !== '-' ? item.pathCode.replace('КП', '') : '';
                return `${procCode}$${kpCode}`;
            }).join('%');
            attrs.procsKPs = ` ${procsKPs} `;
        }

        if (processesModule.include && processesModule.include.length > 0) {
            const procsKPsAdd = processesModule.include.map(item => {
                const procCode = item.processCode.replace('П', '');
                const kpCode = item.pathCode && item.pathCode !== '-' ? item.pathCode.replace('КП', '') : '';
                return `${procCode}$${kpCode}`;
            }).join('%');
            attrs.procsKPsAdd = ` ${procsKPsAdd} `;
        }

        if (processesModule.exclude && processesModule.exclude.length > 0) {
            const procsKPsRemove = processesModule.exclude.map(item => {
                const procCode = item.processCode.replace('П', '');
                const kpCode = item.pathCode && item.pathCode !== '-' ? item.pathCode.replace('КП', '') : '';
                return `${procCode}$${kpCode}`;
            }).join('%');
            attrs.procsKPsRemove = ` ${procsKPsRemove} `;
        }

        // Из AutomatedSystems
        if (automatedSystems.items && automatedSystems.items.length > 0) {
            const askiList = automatedSystems.items.map(item => {
                const sysId = Math.abs(parseInt(item.systemId.replace(/\D/g, '') || '0'));
                const roles = item.roles && item.roles.length > 0 
                    ? item.roles.map(r => r.roleIndex || '0').join(',')
                    : '-1';
                const proc = item.processCode ? item.processCode.replace('П', '') : '';
                const kp = item.pathCode ? item.pathCode.replace('КП', '') : '';
                
                // Сотрудники
                const employees = item.employees && item.employees.length > 0
                    ? item.employees.map(emp => `${emp.fullName}(${emp.tabNumber})^${emp.position}^${emp.bank}`).join(',')
                    : '-1';
                
                return `${sysId},${roles},${proc},${kp},{${employees}}`;
            });
            attrs.aski = ` ${askiList.join('%')} `;
        }

        // Пользователь (заглушка, можно передать дополнительно)
        attrs.user = 'user';
        attrs.email = 'user@example.com';

        return attrs;
    }

    /**
     * Форматирует дату из YYYY-MM-DD в MM/DD/YYYY
     */
    formatDateToSlash(dateStr) {
        if (!dateStr) return '';
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            return `${parts[1]}/${parts[2]}/${parts[0]}`;
        }
        return dateStr;
    }

    /**
     * Загружает справочные данные из JSON файлов
     */
    async loadReferenceData() {
        // Загружаем процессы и клиентские пути
        if (!this.processesData) {
            try {
                const response = await fetch('./data/processes.json');
                if (!response.ok) throw new Error('JSON файл процессов не найден');
                this.processesData = await response.json();
                console.log('Загружены процессы и КП для генерации:', this.processesData);
            } catch (error) {
                console.error('Ошибка загрузки processes.json:', error);
                // Fallback данные
                this.processesData = {
                    processes: [
                        { code: "П01", name: "Процесс 1", ownerDepartment: "Отдел 1", linkedKP: ["КП01"] },
                        { code: "П02", name: "Процесс 2", ownerDepartment: "Отдел 2", linkedKP: ["КП02"] }
                    ],
                    clientPaths: [
                        { code: "КП01", name: "Клиентский путь 1", ownerDepartment: "Отдел 1", linkedProcesses: ["П01"] },
                        { code: "КП02", name: "Клиентский путь 2", ownerDepartment: "Отдел 2", linkedProcesses: ["П02"] }
                    ]
                };
            }
        }

        // Загружаем системы
        if (!this.systemsData) {
            try {
                const response = await fetch('./data/systems.json');
                if (!response.ok) throw new Error('JSON файл систем не найден');
                this.systemsData = await response.json();
                console.log('Загружены системы для генерации:', this.systemsData);
            } catch (error) {
                console.error('Ошибка загрузки systems.json:', error);
                // Fallback данные
                this.systemsData = {
                    systems: [
                        { id: "AS1", name: "Система А", roles: ["Роль1", "Роль2"] },
                        { id: "AS2", name: "Система Б", roles: ["Роль3", "Роль4"] }
                    ]
                };
            }
        }

        // Загружаем сотрудников
        if (!this.employeesData) {
            try {
                const response = await fetch('./data/employees.json');
                if (!response.ok) throw new Error('JSON файл сотрудников не найден');
                this.employeesData = await response.json();
                console.log('Загружены сотрудники для генерации:', this.employeesData.length);
            } catch (error) {
                console.error('Ошибка загрузки employees.json:', error);
                this.employeesData = [];
            }
        }
    }

    /**
     * Получает процесс по коду из загруженных данных
     */
    getProcessByCode(code) {
        if (!this.processesData || !code) return null;
        return this.processesData.processes.find(p => p.code === code || p.code === 'П' + code);
    }

    /**
     * Получает клиентский путь по коду из загруженных данных
     */
    getClientPathByCode(code) {
        if (!this.processesData || !code) return null;
        return this.processesData.clientPaths.find(kp => kp.code === code || kp.code === 'КП' + code);
    }

    /**
     * Получает систему по ID из загруженных данных
     */
    getSystemById(id) {
        if (!this.systemsData || !id) return null;
        return this.systemsData.systems.find(s => s.id === `AS${id}` || s.id === String(id));
    }

    /**
     * Основная функция генерации документа
     */
    async generateDocument(dictAttributesJson, pathTaskFolder) {
        // Загружаем справочные данные из JSON (вместо Excel)
        await this.loadReferenceData();

        this.dictAttributesJson = dictAttributesJson;
        this.pathTaskFolder = pathTaskFolder;
        
        // Инициализация основных атрибутов
        this.nameAudit = dictAttributesJson['name'];
        this.flagPrepOrExecute = dictAttributesJson['pod_or_prov'];
        this.dataEmpExecutionControl = dictAttributesJson['director'];
        console.log(this.dataEmpExecutionControl)
        this.dataSignatory = dictAttributesJson['podpis'].split(',');
        this.userLogin = dictAttributesJson['user'];
        this.userEmail = dictAttributesJson['email'];

        // Обработка автоматизированных систем
        if (dictAttributesJson['aski'] && dictAttributesJson['aski'].length > 1) {
            this.listAutomatedSystemsAudit = dictAttributesJson['aski']
                .trim(' %')
                .split('%')
                .map(col => col.split('$'));
        } else {
            this.listAutomatedSystemsAudit = null;
        }

        // Определение типа распоряжения (изменение или нет)
        this.flagIsChange = 'provNum' in dictAttributesJson ? 1 : 0;

        // Обработка территориального банка
        if (dictAttributesJson['isTB'] === "1") {
            this.flagIsTB = 1;
            this.nameTB = dictAttributesJson['tbName'];
        } else {
            this.flagIsTB = 0;
        }

        this.nameFile = `Распоряжение_${this.pathTaskFolder}.docx`;

        if (!this.flagIsChange) {
            // Распоряжение на подготовку или проведение
            this.nameTemplate = 'templates/TemplateOrderExecuteOrPrepAudit2026.docx';
            [this.dateStart, this.dateEnd] = dictAttributesJson['dates'].split(',');
            this.pointAudit = dictAttributesJson['punkt'];
            this.dataHeadAudit = dictAttributesJson['supervisor'].split(',');
            this.listDataEmployeesAudit = dictAttributesJson['emps']
                .trim(';')
                .split(';')
                .map(col => col.split(','));

            if (dictAttributesJson['act_date'] && dictAttributesJson['act_date'].length > 1) {
                this.dateAct = dictAttributesJson['act_date'];
            } else {
                this.dateAct = null;
            }

            if (dictAttributesJson['subsuper'] && dictAttributesJson['subsuper'].length > 1) {
                this.dataDeputyHeadAudit = dictAttributesJson['subsuper'].split(',');
            } else {
                this.dataDeputyHeadAudit = null;
            }

            this.listDataCuratorsAudit = dictAttributesJson['curator']
                .split(';')
                .map(cur => cur.split(','));
            
            if (this.listDataCuratorsAudit[0][0] === '-') {
                this.listDataCuratorsAudit = null;
            }

            if (dictAttributesJson['procsKPs'] && dictAttributesJson['procsKPs'].length > 1) {
                this.listProcessesAudit = dictAttributesJson['procsKPs']
                    .trim(' %')
                    .split('%')
                    .map(col => col.split('$'));
            } else {
                this.listProcessesAudit = null;
            }
        } else {
            // Распоряжение на изменение
            this.nameTemplate = 'templates/TemplateOrderChangeAudit2026.docx';
            [this.dateOldEndAudit, this.dateNewEndAudit] = dictAttributesJson['dates'].split(',');
            this.numberOrderAudit = dictAttributesJson['provNum'];
            this.textReason = dictAttributesJson['reason'];

            if (dictAttributesJson['procsKPsAdd'] && dictAttributesJson['procsKPsAdd'].length > 1) {
                this.newListProcessesAudit = dictAttributesJson['procsKPsAdd']
                    .trim(' %')
                    .split('%')
                    .map(col => col.split('$'));
            } else {
                this.newListProcessesAudit = null;
            }

            if (dictAttributesJson['procsKPsRemove'] && dictAttributesJson['procsKPsRemove'].length > 1) {
                this.deleteListProcessesAudit = dictAttributesJson['procsKPsRemove']
                    .trim(' %')
                    .split('%')
                    .map(col => col.split('$'));
            } else {
                this.deleteListProcessesAudit = null;
            }

            if (dictAttributesJson['addEmployees'] && dictAttributesJson['addEmployees'].length > 1) {
                this.listDataEmployeesAdd = dictAttributesJson['addEmployees']
                    .trim(';')
                    .split(';')
                    .map(col => col.split(','));
            } else {
                this.listDataEmployeesAdd = null;
            }

            if (dictAttributesJson['delEmployees'] && dictAttributesJson['delEmployees'].length > 1) {
                this.listDataEmployeesDel = dictAttributesJson['delEmployees']
                    .trim(';')
                    .split(';')
                    .map(col => col.split(','));
            } else {
                this.listDataEmployeesDel = null;
            }
        }

        // Выбор форм слов
        this.listWordForms = this.flagPrepOrExecute === '1' 
            ? this.listWordFormsExecute 
            : this.listWordFormsPrep;

        // Генерация документа в зависимости от типа
        if (this.flagIsChange) {
            await this.generateChangeAudit();
        } else {
            await this.generatePrepOrExecuteAudit();
        }
    }

    /**
     * Генерация распоряжения на подготовку или проведение проверки
     */
    async generatePrepOrExecuteAudit() {
        // Для сотрудника, исполняющего обязанности контроля исполнения
        const [empExecutionControlFio, empExecutionControlPost] = this.dataEmpExecutionControl.split(',');
        const empExecutionControlShortFio = this.shortFio(empExecutionControlFio, true);
        const empExecutionControlPostGent = this.titleToGent(empExecutionControlPost.replace('управления', ''));
        
        let empExecutionControl;
        if (this.flagIsTB) {
            empExecutionControl = `${empExecutionControlPostGent} Управления внутреннего аудита по ${this.dictNameTB[this.nameTB][1]} ${empExecutionControlShortFio}`;
        } else {
            empExecutionControl = `${empExecutionControlPostGent} Управления внутреннего аудита ${empExecutionControlShortFio}`;
        }

        // Список словарей для генерации таблицы сотрудников
        const listDictEmployees = [];
        this.listDataEmployeesAudit.sort((a, b) => {
            const tbCompare = a[3].localeCompare(b[3]);
            if (tbCompare !== 0) return -tbCompare; // reverse
            const postA = this.dictNamePost[a[2]] || 0;
            const postB = this.dictNamePost[b[2]] || 0;
            return postA - postB;
        }).reverse();

        for (let i = 0; i < this.listDataEmployeesAudit.length; i++) {
            const emp = this.listDataEmployeesAudit[i];
            const fio = this.removeBrackets(emp[0]);
            const tn = emp[0].substring(emp[0].indexOf('(') + 1, emp[0].lastIndexOf(')'));
            
            listDictEmployees.push({
                title: this.deabbrTitle(emp[2]),
                dep: emp[1],
                tb: this.dictNameTB[emp[3]][0],
                i: String(i + 1),
                fio: fio,
                tn: tn
            });
        }

        // Словари для генерации таблицы процессов
        const listDictProcesses = [];
        const uniqueClientPath = new Set();
        const uniqueProcess = new Set();
        let i_CP = 1;
        let i_P = 1;
        let countProcessClientPath = '';

        if (this.listProcessesAudit) {
            // Разбиваем по парам и сортируем для группировки
            const listPairsProcessesClientPath = [];
            for (const row of this.listProcessesAudit) {
                if (row[1].includes('^')) {
                    const CPS = row[1].split('^');
                    for (const CP of CPS) {
                        listPairsProcessesClientPath.push([row[0], CP]);
                    }
                } else {
                    listPairsProcessesClientPath.push(row);
                }
            }
            listPairsProcessesClientPath.sort((a, b) => b[1].localeCompare(a[1]));

            let prevCP = 0;
            for (const row of listPairsProcessesClientPath) {
                const processCode = 'П' + row[0];
                const rowProcess = this.getProcessByCode(processCode);
                if (!rowProcess) continue;
                
                const dictProcess = {
                    p_name: rowProcess.name,
                    p_code: rowProcess.code,
                    p_owner: rowProcess.ownerDepartment,
                    p_i: String(i_P++)
                };
                uniqueProcess.add(dictProcess.p_code);

                // Если нет клиентских путей
                if (row[1].length <= 1) {
                    dictProcess.kp_i = '-';
                    dictProcess.kp_code = '-';
                    dictProcess.kp_name = '-';
                    dictProcess.kp_owner = '-';
                    listDictProcesses.push(dictProcess);
                } else {
                    const codeCP = row[1];
                    if (prevCP !== codeCP) {
                        const kpCode = 'КП' + codeCP;
                        const rowClientPath = this.getClientPathByCode(kpCode);
                        if (!rowClientPath) continue;
                        
                        const newDictProcess = { ...dictProcess };
                        newDictProcess.kp_i = String(i_CP++);
                        newDictProcess.kp_name = rowClientPath.name;
                        newDictProcess.kp_code = kpCode;
                        newDictProcess.kp_owner = rowClientPath.ownerDepartment;
                        uniqueClientPath.add(newDictProcess.kp_code);
                        listDictProcesses.push(newDictProcess);
                    } else {
                        dictProcess.kp_i = '';
                        dictProcess.kp_name = '';
                        dictProcess.kp_code = '';
                        dictProcess.kp_owner = '';
                        // Флаги для объединения ячеек КП
                        dictProcess.kp_i_empty = true;
                        dictProcess.kp_name_empty = true;
                        dictProcess.kp_code_empty = true;
                        dictProcess.kp_owner_empty = true;
                        listDictProcesses.push(dictProcess);
                    }
                    prevCP = codeCP;
                }
            }

            // Количество процессов для первой страницы
            const countProcess = uniqueProcess.size;
            let strCountProcess;
            const lastDigit = String(countProcess).slice(-1);
            if (lastDigit === '1' && countProcess !== 11) {
                strCountProcess = `${countProcess} централизованный процесс`;
            } else if (['2', '3', '4'].includes(lastDigit) && ![12, 13, 14].includes(countProcess)) {
                strCountProcess = `${countProcess} централизованных процесса`;
            } else {
                strCountProcess = `${countProcess} централизованных процессов`;
            }
            countProcessClientPath = strCountProcess;
        }

        // Словари для генерации таблицы с доступами
        let listDictAutomatedSystems = [];
        if (this.listAutomatedSystemsAudit) {
            let i = 0;
            for (const AS of this.listAutomatedSystemsAudit) {
                i++;
                let first = true;
                const emp_tns = AS[AS.length - 1].slice(1, -1).split(',');
                const systemId = Math.abs(parseInt(AS[0]));
                const systemData = this.getSystemById(systemId);

                for (const emp_tn of emp_tns) {
                    const dictAutomatedSystems = {};
                    if (!first) {
                        dictAutomatedSystems.i = '';
                        dictAutomatedSystems.name = '';
                        dictAutomatedSystems.ke = '';
                        dictAutomatedSystems.roles = '';
                        dictAutomatedSystems.kp = '';
                        dictAutomatedSystems.proc = '';
                        dictAutomatedSystems.emp_name = '';
                        dictAutomatedSystems.title = '';
                        dictAutomatedSystems.tn = '';
                        // Флаги для объединения ячеек сотрудника
                        dictAutomatedSystems.emp_name_empty = true;
                        dictAutomatedSystems.title_empty = true;
                        dictAutomatedSystems.tn_empty = true;
                    } else {
                        dictAutomatedSystems.i = String(i);
                        // Получаем данные о системе из systemData (вместо Excel)
                        const sysName = systemData ? systemData.name : `Система ${systemId}`;
                        const sysDesc = systemData && systemData.description 
                            ? systemData.description
                            : 'Автоматизированная система';
                        
                        dictAutomatedSystems.name = sysName;
                        dictAutomatedSystems.ke = `${sysDesc}\r\nAS${systemId}`;
                        dictAutomatedSystems.kp = AS[AS.length - 2];
                        dictAutomatedSystems.proc = AS[AS.length - 3];

                        if (parseInt(AS[0]) < 0) {
                            dictAutomatedSystems.name += ' (+реплика)';
                        }

                        if (AS[1] === '-1') {
                            dictAutomatedSystems.roles = 'Роль, позволяющая просматривать необходимую информацию в рамках проверки.';
                        } else {
                            const roleIndices = AS.slice(1, AS.length - 3);
                            dictAutomatedSystems.roles = roleIndices
                                .map(role_index => {
                                    const roleIndexNum = parseInt(role_index);
                                    const roleRow = systemData && systemData.roles && systemData.roles[roleIndexNum - 1] ? {name: systemData.roles[roleIndexNum - 1]} : null;
                                    return roleRow ? roleRow['name'] : '';
                                })
                                .join('\r\n');
                        }
                    }

                    if (emp_tn === '-1') {
                        dictAutomatedSystems.emp_name = 'Все участники (Приложение 1)';
                        dictAutomatedSystems.title = '';
                        dictAutomatedSystems.tn = '';
                        // Флаги для объединения ячеек сотрудника
                        dictAutomatedSystems.emp_name_empty = true;
                        dictAutomatedSystems.title_empty = true;
                        dictAutomatedSystems.tn_empty = true;
                    } else {
                        const cur_emp = listDictEmployees.find(e => e.tn === emp_tn);
                        if (cur_emp) {
                            dictAutomatedSystems.emp_name = cur_emp.fio;
                            dictAutomatedSystems.title = this.getFullTitle(cur_emp.title, cur_emp.tb);
                            dictAutomatedSystems.tn = cur_emp.tn;
                            // Флаги для объединения ячеек сотрудника
                            dictAutomatedSystems.emp_name_empty = false;
                            dictAutomatedSystems.title_empty = false;
                            dictAutomatedSystems.tn_empty = false;
                        } else {
                            dictAutomatedSystems.emp_name = '';
                            dictAutomatedSystems.title = '';
                            dictAutomatedSystems.tn = '';
                            dictAutomatedSystems.emp_name_empty = true;
                            dictAutomatedSystems.title_empty = true;
                            dictAutomatedSystems.tn_empty = true;
                        }
                    }

                    first = false;
                    listDictAutomatedSystems.push(dictAutomatedSystems);
                }
            }
        }

        // Форматирование дат
        const formatDate = (dateStr) => {
            if (!dateStr || !dateStr.includes('/')) return '';
            const parts = dateStr.split('/');
            return `${parts[1].padStart(2, '0')}.${parts[0].padStart(2, '0')}.${parts[2]}`;
        };

        const startDateFull = formatDate(this.dateStart);
        const endDateFull = formatDate(this.dateEnd);
        const dateActFull = formatDate(this.dateAct);

        // Куратор
        let stringCurators = '';
        let plurCurators = 'куратора';
        if (this.listDataCuratorsAudit) {
            const curatorParts = [];
            for (let i = 0; i < this.listDataCuratorsAudit.length; i++) {
                const curator = this.listDataCuratorsAudit[i];
                const curatorFIO = this.shortFio(this.removeBrackets(curator[0]), false, true);
                const curatorPost = this.getFullTitle(curator[1].toLowerCase(), curator[2], true, true, true);
                curatorParts.push(`${curatorFIO} – ${curatorPost}`);
            }
            stringCurators = curatorParts.join(', ');
            if (this.listDataCuratorsAudit.length > 1) {
                plurCurators = 'кураторов';
            }
        }

        // Руководитель
        const headAuditFIO = this.shortFio(this.removeBrackets(this.dataHeadAudit[2]), false, true);
        const headAuditPost = this.getFullTitle(this.dataHeadAudit[0].toLowerCase(), this.dataHeadAudit[this.dataHeadAudit.length - 1], false, true, true);

        // Зам руководителя
        let deputyHeadFIO = '';
        let deputyHeadPost = '';
        if (this.dataDeputyHeadAudit) {
            deputyHeadFIO = this.shortFio(this.removeBrackets(this.dataDeputyHeadAudit[2]), false, true);
            deputyHeadPost = this.getFullTitle(this.dataDeputyHeadAudit[0].toLowerCase(), this.dataDeputyHeadAudit[this.dataDeputyHeadAudit.length - 1], true, true, true);
        }

        // Подписант
        let signatoryFIO, signatoryPost;
        if (!this.flagIsTB) {
            signatoryFIO = this.shortFio(this.dataSignatory[0]);
            signatoryPost = this.dataSignatory[1]
                .replace('зам.дир.', 'заместитель директора ')
                .replace('дир.управл.', 'директор управления')
                .replace('управления', 'Управления внутреннего аудита');
        } else {
            signatoryFIO = this.shortFio(this.dataSignatory[0]);
            const fullNameTB = this.dictNameTB[this.nameTB][1];
            signatoryPost = this.dataSignatory[1]
                .replace('управления', 'Управления внутреннего аудита') + ' по ' + fullNameTB;
        }

        // Определение ca_tb
        let ca_tb = "Территориальный банк";
        for (const dict_emp of listDictEmployees) {
            if (dict_emp.tb.includes('Центральный аппарат')) {
                ca_tb = "Центральный аппарат/Территориальный банк";
                break;
            }
        }

        // Подготовка словаря для рендеринга
        const dictOrder = {
            name: this.nameAudit.trim(),
            pv_title: this.listWordForms[0],
            pv1: this.listWordForms[1],
            pv2: this.listWordForms[2],
            pv3: this.listWordForms[3],
            pv4: this.listWordForms[4],
            pv5: this.listWordForms[5],
            pv9: this.listWordForms[9],
            pv10: this.listWordForms[10],
            pv_emp: this.listWordForms[6],
            pv_ases: this.listWordForms[7],
            podpunkt: this.pointAudit ? `п.${this.pointAudit}` : '',
            start_date: startDateFull,
            end_date: endDateFull,
            act_date: dateActFull,
            curator: stringCurators,
            supervisor: `${headAuditFIO} – ${headAuditPost}`,
            subsuper: `${deputyHeadFIO} – ${deputyHeadPost}`,
            curator_plur: plurCurators,
            dir: empExecutionControl,
            podpis_title: signatoryPost,
            podpis_fio: signatoryFIO,
            pril_procs: 2,
            pril_aski: 3,
            ca_tb: ca_tb
        };

        // Передаем данные приложений только если они есть, иначе ставим флаги false
        if (listDictEmployees && listDictEmployees.length > 0) {
            dictOrder.employees = listDictEmployees;
            dictOrder.showApp1 = true;
            dictOrder.showLinkApp1 = true;
        } else {
            dictOrder.showApp1 = false;
            dictOrder.showLinkApp1 = false;
        }

        if (this.listProcessesAudit && listDictProcesses && listDictProcesses.length > 0) {
            dictOrder.kps_and_ps_count = countProcessClientPath;
            dictOrder.processes = listDictProcesses;
            dictOrder.showApp2 = true;
            dictOrder.showLinkApp2 = true;
        } else {
            dictOrder.pril_aski = 2; // Сдвигаем номер приложения
            dictOrder.showApp2 = false;
            dictOrder.showLinkApp2 = false;
        }

        if (this.flagIsTB) {
            dictOrder.TB_full_name = this.dictNameTB[this.nameTB][0].toUpperCase();
            dictOrder.TB_full_name2 = 'ПО ' + this.dictNameTB[this.nameTB][1].toUpperCase();
            dictOrder.showTB = true;
        } else {
            dictOrder.showTB = false;
        }

        if (this.listAutomatedSystemsAudit && listDictAutomatedSystems && listDictAutomatedSystems.length > 0) {
            dictOrder.aski = listDictAutomatedSystems;
            dictOrder.showApp3 = true;
            dictOrder.showLinkApp3 = true;
        } else {
            dictOrder.showApp3 = false;
            dictOrder.showLinkApp3 = false;
        }

        // Загрузка и рендеринг шаблона
        await this.renderTemplate(dictOrder, this.nameTemplate, this.pathTaskFolder);
    }

    /**
     * Генерация распоряжения на изменение
     */
    async generateChangeAudit() {
        // Для сотрудника, исполняющего обязанности контроля исполнения
        const [empExecutionControlFio, empExecutionControlPost] = this.dataEmpExecutionControl.split(',');
        const empExecutionControlShortFio = this.shortFio(empExecutionControlFio, true);
        const empExecutionControlPostGent = this.titleToGent(empExecutionControlPost.replace('управления', ''));
        
        let empExecutionControl;
        if (this.flagIsTB) {
            empExecutionControl = `${empExecutionControlPostGent} Управления внутреннего аудита по ${this.dictNameTB[this.nameTB][1]} ${empExecutionControlShortFio}`;
        } else {
            empExecutionControl = `${empExecutionControlPostGent} Управления внутреннего аудита ${empExecutionControlShortFio}`;
        }

        // Список словарей для генерации таблицы сотрудников
        const listDictEmployees = [];
        
        if (this.listDataEmployeesAdd) {
            this.listDataEmployeesAdd.sort((a, b) => {
                const tbCompare = a[3].localeCompare(b[3]);
                if (tbCompare !== 0) return -tbCompare;
                const postA = this.dictNamePost[a[2]] || 0;
                const postB = this.dictNamePost[b[2]] || 0;
                return postA - postB;
            }).reverse();

            for (let i = 0; i < this.listDataEmployeesAdd.length; i++) {
                const emp = this.listDataEmployeesAdd[i];
                const fio = this.removeBrackets(emp[0]);
                const tn = emp[0].substring(emp[0].indexOf('(') + 1, emp[0].lastIndexOf(')'));
                
                listDictEmployees.push({
                    title: this.deabbrTitle(emp[2]),
                    dep: emp[1],
                    tb: this.dictNameTB[emp[3]][0],
                    i: String(i + 1),
                    fio: fio,
                    tn: tn,
                    action: 'Включить'
                });
            }
        }

        if (this.listDataEmployeesDel) {
            this.listDataEmployeesDel.sort((a, b) => {
                const tbCompare = a[3].localeCompare(b[3]);
                if (tbCompare !== 0) return -tbCompare;
                const postA = this.dictNamePost[a[2]] || 0;
                const postB = this.dictNamePost[b[2]] || 0;
                return postA - postB;
            }).reverse();

            for (let i = 0; i < this.listDataEmployeesDel.length; i++) {
                const emp = this.listDataEmployeesDel[i];
                const fio = this.removeBrackets(emp[0]);
                const tn = emp[0].substring(emp[0].indexOf('(') + 1, emp[0].lastIndexOf(')'));
                
                listDictEmployees.push({
                    title: this.deabbrTitle(emp[2]),
                    dep: emp[1],
                    tb: this.dictNameTB[emp[3]][0],
                    i: String(i + 1),
                    fio: fio,
                    tn: tn,
                    action: 'Исключить'
                });
            }
        }

        // Словари для генерации таблицы процессов (добавление)
        const listDictProcessesAdd = [];
        const uniqueClientPathAdd = new Set();
        const uniqueProcessAdd = new Set();
        let i_CP_Add = 1;
        let i_P_Add = 1;
        let countProcessClientPathAdd = '';

        if (this.newListProcessesAudit) {
            const listPairsProcessesClientPath = [];
            for (const row of this.newListProcessesAudit) {
                if (row[1].includes('^')) {
                    const CPS = row[1].split('^');
                    for (const CP of CPS) {
                        listPairsProcessesClientPath.push([row[0], CP]);
                    }
                } else {
                    listPairsProcessesClientPath.push(row);
                }
            }
            listPairsProcessesClientPath.sort((a, b) => b[1].localeCompare(a[1]));

            let prevCP = 0;
            let prevProcCode = 0;
            for (const row of listPairsProcessesClientPath) {
                const processCode = 'П' + row[0];
                const rowProcess = this.getProcessByCode(processCode);
                if (!rowProcess) continue;
                
                const dictProcess = {
                    p_name: rowProcess.name,
                    p_code: rowProcess.code,
                    p_owner: rowProcess.ownerDepartment,
                    p_i: String(i_P_Add++)
                };
                uniqueProcessAdd.add(dictProcess.p_code);

                if (row[1].length <= 1) {
                    dictProcess.kp_i = '-';
                    dictProcess.kp_code = '-';
                    dictProcess.kp_name = '-';
                    dictProcess.kp_owner = '-';
                    // Объединение ячеек для процессов без КП
                    if (prevProcCode === row[0]) {
                        dictProcess.kp_i_empty = true;
                        dictProcess.kp_code_empty = true;
                        dictProcess.kp_name_empty = true;
                        dictProcess.kp_owner_empty = true;
                        dictProcess.p_i_empty = true;
                        dictProcess.p_code_empty = true;
                        dictProcess.p_name_empty = true;
                        dictProcess.p_owner_empty = true;
                    }
                    listDictProcessesAdd.push(dictProcess);
                    prevProcCode = row[0];
                } else {
                    const codeCP = row[1];
                    if (prevCP !== codeCP) {
                        const kpCode = 'КП' + codeCP;
                        const rowClientPath = this.getClientPathByCode(kpCode);
                        if (!rowClientPath) continue;
                        
                        const newDictProcess = { ...dictProcess };
                        newDictProcess.kp_i = String(i_CP_Add++);
                        newDictProcess.kp_name = rowClientPath.name;
                        newDictProcess.kp_code = kpCode;
                        newDictProcess.kp_owner = rowClientPath.ownerDepartment;
                        uniqueClientPathAdd.add(newDictProcess.kp_code);
                        // Объединение ячеек для процессов
                        if (prevProcCode === row[0]) {
                            newDictProcess.p_i_empty = true;
                            newDictProcess.p_code_empty = true;
                            newDictProcess.p_name_empty = true;
                            newDictProcess.p_owner_empty = true;
                        }
                        listDictProcessesAdd.push(newDictProcess);
                        prevProcCode = row[0];
                    } else {
                        dictProcess.kp_i = '';
                        dictProcess.kp_name = '';
                        dictProcess.kp_code = '';
                        dictProcess.kp_owner = '';
                        // Объединение ячеек для КП
                        dictProcess.kp_i_empty = true;
                        dictProcess.kp_code_empty = true;
                        dictProcess.kp_name_empty = true;
                        dictProcess.kp_owner_empty = true;
                        // Объединение ячеек для процессов
                        if (prevProcCode === row[0]) {
                            dictProcess.p_i_empty = true;
                            dictProcess.p_code_empty = true;
                            dictProcess.p_name_empty = true;
                            dictProcess.p_owner_empty = true;
                        }
                        listDictProcessesAdd.push(dictProcess);
                        prevProcCode = row[0];
                    }
                    prevCP = codeCP;
                }
            }

            const countProcess = uniqueProcessAdd.size;
            let strCountProcess;
            const lastDigit = String(countProcess).slice(-1);
            if (lastDigit === '1' && countProcess !== 11) {
                strCountProcess = `${countProcess} централизованный процесс`;
            } else if (['2', '3', '4'].includes(lastDigit) && ![12, 13, 14].includes(countProcess)) {
                strCountProcess = `${countProcess} централизованных процесса`;
            } else {
                strCountProcess = `${countProcess} централизованных процессов`;
            }
            countProcessClientPathAdd = strCountProcess;
        }

        // Словари для генерации таблицы процессов (удаление)
        const listDictProcessesRem = [];
        const uniqueClientPathRem = new Set();
        const uniqueProcessRem = new Set();
        let i_CP_Rem = 1;
        let i_P_Rem = 1;
        let countRemoveProcessesClientPath = '';

        if (this.deleteListProcessesAudit) {
            const listProcessClientPathPairs = [];
            for (const row of this.deleteListProcessesAudit) {
                if (row[1].includes('^')) {
                    const CPS = row[1].split('^');
                    for (const CP of CPS) {
                        listProcessClientPathPairs.push([row[0], CP]);
                    }
                } else {
                    listProcessClientPathPairs.push(row);
                }
            }
            listProcessClientPathPairs.sort((a, b) => b[1].localeCompare(a[1]));

            let prevCP = 0;
            let prevProcCode = 0;
            for (const row of listProcessClientPathPairs) {
                const processCode = 'П' + row[0];
                const rowProcesses = this.getProcessByCode(processCode);
                if (!rowProcesses) continue;
                
                const dictProcesses = {
                    p_name: rowProcesses.name,
                    p_code: rowProcesses.code,
                    p_owner: rowProcesses.ownerDepartment,
                    p_i: String(i_P_Rem++)
                };
                uniqueProcessRem.add(dictProcesses.p_code);

                if (row[1].length <= 1) {
                    dictProcesses.kp_i = '-';
                    dictProcesses.kp_code = '-';
                    dictProcesses.kp_name = '-';
                    dictProcesses.kp_owner = '-';
                    // Объединение ячеек для процессов без КП
                    if (prevProcCode === row[0]) {
                        dictProcesses.kp_i_empty = true;
                        dictProcesses.kp_code_empty = true;
                        dictProcesses.kp_name_empty = true;
                        dictProcesses.kp_owner_empty = true;
                        dictProcesses.p_i_empty = true;
                        dictProcesses.p_code_empty = true;
                        dictProcesses.p_name_empty = true;
                        dictProcesses.p_owner_empty = true;
                    }
                    listDictProcessesRem.push(dictProcesses);
                    prevProcCode = row[0];
                } else {
                    const codeCP = row[1];
                    if (prevCP !== codeCP) {
                        const kpCode = 'КП' + codeCP;
                        const rowClientPath = this.getClientPathByCode(kpCode);
                        if (!rowClientPath) continue;
                        
                        const newDictProcesses = { ...dictProcesses };
                        newDictProcesses.kp_i = String(i_CP_Rem++);
                        newDictProcesses.kp_name = rowClientPath.name;
                        newDictProcesses.kp_code = kpCode;
                        newDictProcesses.kp_owner = rowClientPath.ownerDepartment;
                        uniqueClientPathRem.add(newDictProcesses.kp_code);
                        // Объединение ячеек для процессов
                        if (prevProcCode === row[0]) {
                            newDictProcesses.p_i_empty = true;
                            newDictProcesses.p_code_empty = true;
                            newDictProcesses.p_name_empty = true;
                            newDictProcesses.p_owner_empty = true;
                        }
                        listDictProcessesRem.push(newDictProcesses);
                        prevProcCode = row[0];
                    } else {
                        dictProcesses.kp_i = '';
                        dictProcesses.kp_name = '';
                        dictProcesses.kp_code = '';
                        dictProcesses.kp_owner = '';
                        // Объединение ячеек для КП
                        dictProcesses.kp_i_empty = true;
                        dictProcesses.kp_code_empty = true;
                        dictProcesses.kp_name_empty = true;
                        dictProcesses.kp_owner_empty = true;
                        // Объединение ячеек для процессов
                        if (prevProcCode === row[0]) {
                            dictProcesses.p_i_empty = true;
                            dictProcesses.p_code_empty = true;
                            dictProcesses.p_name_empty = true;
                            dictProcesses.p_owner_empty = true;
                        }
                        listDictProcessesRem.push(dictProcesses);
                        prevProcCode = row[0];
                    }
                    prevCP = codeCP;
                }
            }

            const countProcess = uniqueProcessRem.size;
            let strCountProcess;
            const lastDigit = String(countProcess).slice(-1);
            if (lastDigit === '1' && countProcess !== 11) {
                strCountProcess = `${countProcess} централизованный процесс`;
            } else if (['2', '3', '4'].includes(lastDigit) && ![12, 13, 14].includes(countProcess)) {
                strCountProcess = `${countProcess} централизованных процесса`;
            } else {
                strCountProcess = `${countProcess} централизованных процессов`;
            }
            countRemoveProcessesClientPath = strCountProcess;
        }

        // Словари для генерации таблицы с доступами
        let listDictAutomatedSystems = [];
        if (this.listAutomatedSystemsAudit) {
            let i = 0;
            for (const AS of this.listAutomatedSystemsAudit) {
                i++;
                let first = true;
                const emps = AS[AS.length - 1].slice(1, -1).split(',');
                const systemId = Math.abs(parseInt(AS[0]));
                const systemData = this.getSystemById(systemId);

                for (const emp of emps) {
                    const dictAutomatedSystems = {};
                    if (!first) {
                        dictAutomatedSystems.i = '';
                        dictAutomatedSystems.name = '';
                        dictAutomatedSystems.ke = '';
                        dictAutomatedSystems.roles = '';
                        dictAutomatedSystems.kp = '';
                        dictAutomatedSystems.proc = '';
                        // Флаги для объединения ячеек в АС
                        dictAutomatedSystems.i_empty = true;
                        dictAutomatedSystems.name_empty = true;
                        dictAutomatedSystems.ke_empty = true;
                        dictAutomatedSystems.roles_empty = true;
                        dictAutomatedSystems.kp_empty = true;
                        dictAutomatedSystems.proc_empty = true;
                    } else {
                        dictAutomatedSystems.i = String(i);
                        // Получаем данные о системе из systemData (вместо Excel)
                        const sysName2 = systemData ? systemData.name : `Система ${systemId}`;
                        const sysDesc2 = systemData && systemData.description 
                            ? systemData.description
                            : 'Автоматизированная система';
                        
                        dictAutomatedSystems.name = sysName2;
                        dictAutomatedSystems.ke = `${sysDesc2}\r\nAS${systemId}`;
                        dictAutomatedSystems.kp = AS[AS.length - 2];
                        dictAutomatedSystems.proc = AS[AS.length - 3];

                        if (parseInt(AS[0]) < 0) {
                            dictAutomatedSystems.name += ' (+реплика)';
                        }

                        if (AS[1] === '-1') {
                            dictAutomatedSystems.roles = 'Роль, позволяющая просматривать необходимую информацию в рамках проверки.';
                        } else {
                            const roleIndices = AS.slice(1, AS.length - 3);
                            dictAutomatedSystems.roles = roleIndices
                                .map(role_index => {
                                    const roleIndexNum = parseInt(role_index);
                                    const roleRow = systemData && systemData.roles && systemData.roles[roleIndexNum - 1] ? {name: systemData.roles[roleIndexNum - 1]} : null;
                                    return roleRow ? roleRow['name'] : '';
                                })
                                .join('\r\n');
                        }
                    }

                    if (emp === '-1') {
                        dictAutomatedSystems.emp_name = 'Все участники (Приложение 1)';
                        dictAutomatedSystems.title = '';
                        dictAutomatedSystems.tn = '';
                        // Флаги для объединения ячеек сотрудника
                        dictAutomatedSystems.emp_name_empty = true;
                        dictAutomatedSystems.title_empty = true;
                        dictAutomatedSystems.tn_empty = true;
                    } else {
                        const [emp_tn_fio, emp_title, emp_tb] = emp.split('^');
                        const emp_fio = this.removeBrackets(emp_tn_fio);
                        const emp_tn = emp_tn_fio.substring(emp_tn_fio.indexOf('(') + 1, emp_tn_fio.lastIndexOf(')'));

                        dictAutomatedSystems.emp_name = emp_fio;
                        dictAutomatedSystems.title = this.getFullTitle(emp_title, emp_tb);
                        dictAutomatedSystems.tn = emp_tn;
                        // Флаги для объединения ячеек сотрудника
                        dictAutomatedSystems.emp_name_empty = false;
                        dictAutomatedSystems.title_empty = false;
                        dictAutomatedSystems.tn_empty = false;
                    }

                    first = false;
                    listDictAutomatedSystems.push(dictAutomatedSystems);
                }
            }
        }

        // Форматирование дат
        const formatDate = (dateStr) => {
            if (!dateStr || !dateStr.includes('/')) return '';
            const parts = dateStr.split('/');
            return `${parts[1].padStart(2, '0')}.${parts[0].padStart(2, '0')}.${parts[2]}`;
        };

        const startDateFull = formatDate(this.dateOldEndAudit);
        const endDateFull = formatDate(this.dateNewEndAudit);
        const dateActFull = formatDate(this.dateAct);

        // Подписант
        let signatoryFIO, signatoryPost;
        if (!this.flagIsTB) {
            signatoryFIO = this.shortFio(this.dataSignatory[0]);
            signatoryPost = this.dataSignatory[1]
                .replace('зам.дир.', 'заместитель директора ')
                .replace('дир.управл.', 'директор управления')
                .replace('управления', 'Управления внутреннего аудита');
        } else {
            signatoryFIO = this.shortFio(this.dataSignatory[0]);
            const fullNameTB = this.dictNameTB[this.nameTB][1];
            signatoryPost = this.dataSignatory[1]
                .replace('управления', 'Управления внутреннего аудита') + ' по ' + fullNameTB;
        }

        // Причина
        const stringReason = this.textReason 
            ? `В связи с необходимостью ${this.textReason} внести`
            : 'Внести';

        // Определение ca_tb
        let ca_tb = "Территориальный банк";
        if (listDictEmployees.length > 0) {
            for (const dict_emp of listDictEmployees) {
                if (dict_emp.tb.includes('Центральный аппарат')) {
                    ca_tb = "Центральный аппарат/Территориальный банк";
                    break;
                }
            }
        }

        // Подготовка словаря для рендеринга
        const dictOrder = {
            name: this.nameAudit.trim(),
            pv_title: `${this.listWordForms[0]} ${this.nameAudit.trim()}`,
            pv_num: this.numberOrderAudit,
            reason: stringReason,
            pv5: this.listWordForms[5],
            pv8: this.listWordForms[8],
            pv11: this.listWordForms[11],
            pv_ases: this.listWordForms[7],
            pv_date: startDateFull,
            end_date: endDateFull,
            act_date: dateActFull,
            dir: empExecutionControl,
            podpis_title: signatoryPost,
            podpis_fio: signatoryFIO,
            pril_emp: 1,
            pril_add: 2,
            pril_rem: 3,
            pril_aski: 4
        };

        if (this.flagIsTB) {
            dictOrder.TB_full_name = this.dictNameTB[this.nameTB][0].toUpperCase();
            dictOrder.TB_full_name2 = 'ПО ' + this.dictNameTB[this.nameTB][1].toUpperCase();
            dictOrder.showTB = true;
        } else {
            dictOrder.showTB = false;
        }

        // Передаем данные приложений только если они есть, иначе ставим флаги false
        if (this.listDataEmployeesAdd || this.listDataEmployeesDel) {
            dictOrder.employees = listDictEmployees;
            dictOrder.ca_tb = ca_tb;
            dictOrder.showApp1 = true;
            dictOrder.showLinkApp1 = true;
        } else {
            dictOrder.pril_add = 1;
            dictOrder.showApp1 = false;
            dictOrder.showLinkApp1 = false;
        }

        if (this.newListProcessesAudit && listDictProcessesAdd && listDictProcessesAdd.length > 0) {
            dictOrder.kps_and_ps_count_add = countProcessClientPathAdd;
            dictOrder.processesAdded = listDictProcessesAdd;
            dictOrder.showApp2 = true;
            dictOrder.showLinkApp2 = true;
        } else {
            dictOrder.pril_rem = 1;
            dictOrder.showApp2 = false;
            dictOrder.showLinkApp2 = false;
        }

        if (this.deleteListProcessesAudit && listDictProcessesRem && listDictProcessesRem.length > 0) {
            dictOrder.kps_and_ps_count_rem = countRemoveProcessesClientPath;
            dictOrder.processesRemoved = listDictProcessesRem;
            dictOrder.showApp3 = true;
            dictOrder.showLinkApp3 = true;
        } else if (this.listDataEmployeesAdd || this.listDataEmployeesDel) {
            dictOrder.pril_aski = 2;
            dictOrder.showApp3 = false;
            dictOrder.showLinkApp3 = false;
        } else {
            dictOrder.pril_aski = 1;
            dictOrder.showApp3 = false;
            dictOrder.showLinkApp3 = false;
        }

        if (this.listAutomatedSystemsAudit && listDictAutomatedSystems && listDictAutomatedSystems.length > 0) {
            dictOrder.aski = listDictAutomatedSystems;
            dictOrder.showApp4 = true;
            dictOrder.showLinkApp4 = true;
        } else {
            dictOrder.showApp4 = false;
            dictOrder.showLinkApp4 = false;
        }

        // Загрузка и рендеринг шаблона
        await this.renderTemplate(dictOrder, this.nameTemplate, this.pathTaskFolder);
    }

    /**
     * Рендеринг шаблона и сохранение документа
     */
    async renderTemplate(dictOrder, templatePath, taskName) {
        try {
            const response = await fetch(templatePath);
            const arrayBuffer = await response.arrayBuffer();

            const zip = new PizZip(arrayBuffer);
            
            // Создаем экземпляр docxtemplater с настройками для работы с условными блоками
            const doc = new window.docxtemplater(zip, {
                paragraphLoop: true,
                linebreaks: true,
                nullGetter: () => '', // Пустые значения не вызывают ошибок
            });

            // Рендерим документ с данными
            doc.render(dictOrder);

            const blob = doc.toBlob();
            const fileName = `Распоряжение_${taskName}.docx`;
            
            saveAs(blob, fileName);
            console.log(`Документ сохранен: ${fileName}`);
        } catch (error) {
            console.error('Ошибка генерации документа:', error);
            if (error.properties && error.properties.errors) {
                const errors = error.properties.errors.map(e => e.message).join('\n');
                alert(`Ошибка генерации документа:\n${errors}`);
            } else {
                alert('Ошибка загрузки шаблона: ' + error.message);
            }
        }
    }

    /**
     * Сокращение ФИО
     */
    shortFio(fio, gent = false, accus = false) {
        const splited = fio.split(' ');
        let surname;
        
        if (splited.length === 2) {
            if (gent) {
                surname = this.fioToGent(splited[0], '');
            } else if (accus) {
                surname = this.fioToAccus(splited[0], '');
            } else {
                surname = splited[0];
            }
            return `${splited[1][0]}. ${surname}`;
        } else {
            if (gent) {
                surname = this.fioToGent(splited[0], splited[2]);
            } else if (accus) {
                surname = this.fioToAccus(splited[0], splited[2]);
            } else {
                surname = splited[0];
            }
            return `${splited[1][0]}.${splited[2][0]}. ${surname}`;
        }
    }

    /**
     * Удаление текста в скобках
     */
    removeBrackets(string) {
        const lastIndex = string.lastIndexOf('(');
        return lastIndex >= 0 ? string.substring(0, lastIndex).trim() : string;
    }

    /**
     * Получение полного названия должности
     */
    getFullTitle(title, uprav, abbr = true, tb = true, gent = false) {
        let fullTitle = this.deabbrTitle(title);
        if (gent) {
            fullTitle = this.titleToGent(fullTitle);
        }
        if (abbr) {
            fullTitle += ' УВА';
        } else {
            fullTitle += ' Управления внутреннего аудита (далее – УВА)';
        }

        if (tb && uprav && uprav.includes('ТБ')) {
            fullTitle += ' по ' + this.dictNameTB[uprav][1];
        }
        return fullTitle;
    }

    /**
     * Склонение фамилии в родительный падеж
     */
    fioToGent(surname, patron) {
        if (['е', 'ё', 'и', 'о', 'у', 'ы', 'э', 'ю'].includes(surname.slice(-1)) || 
            ['ых', 'их'].includes(surname.slice(-2))) {
            return surname;
        }
        if (surname.endsWith('ая')) {
            return surname.slice(0, -2) + 'ой';
        }
        if (surname.endsWith('а')) {
            if (['в', 'н'].includes(surname.slice(-2, -1))) {
                return surname.slice(0, -1) + 'ой';
            }
            if (['т', 'д', 'з'].includes(surname.slice(-2, -1))) {
                return surname.slice(0, -1) + 'ы';
            }
            return surname.slice(0, -1) + 'и';
        }
        if (surname.endsWith('ия')) {
            return surname.slice(0, -2) + 'ии';
        }
        if (surname.endsWith('я')) {
            return surname.slice(0, -1) + 'и';
        }
        if (surname.endsWith('ий')) {
            return surname.slice(0, -2) + 'ого';
        }
        if (!this.isFemale(patron)) {
            if (!['й', 'ц', 'ь'].includes(surname.slice(-1))) {
                return surname + 'а';
            }
        }
        return surname;
    }

    /**
     * Склонение фамилии в винительный падеж
     */
    fioToAccus(surname, patron) {
        if (['е', 'ё', 'и', 'о', 'у', 'ы', 'э', 'ю'].includes(surname.slice(-1)) || 
            ['ых', 'их'].includes(surname.slice(-2))) {
            return surname;
        }
        if (surname.endsWith('ая')) {
            return surname.slice(0, -2) + 'ую';
        }
        if (surname.endsWith('а')) {
            return surname.slice(0, -1) + 'у';
        }
        if (surname.endsWith('ия')) {
            return surname.slice(0, -2) + 'ии';
        }
        if (surname.endsWith('я')) {
            return surname.slice(0, -1) + 'ю';
        }
        if (!this.isFemale(patron)) {
            if (surname.endsWith('ий')) {
                return surname.slice(0, -2) + 'ого';
            }
            if (!['й', 'ц', 'ь'].includes(surname.slice(-1))) {
                return surname + 'а';
            }
        }
        return surname;
    }

    /**
     * Проверка женского рода по отчеству
     */
    isFemale(patron) {
        if (!patron) return true;
        return patron.endsWith('на');
    }

    /**
     * Расшифровка сокращений в должностях
     */
    deabbrTitle(title) {
        return title
            .replace(/Ведущ\./g, 'Ведущий ')
            .replace(/ведущ\./g, 'ведущий ')
            .replace(/спец\./g, 'специалист ')
            .replace(/данн\./g, 'данных')
            .replace(/цифр\.техн-м/g, 'цифровым технологиям')
            .replace(/рук-ль/g, 'руководитель')
            .replace(/зам\.дир\./g, 'заместитель директора ')
            .replace(/дир\./g, 'директор ')
            .replace(/управл\./g, 'управления')
            .replace(/исслед\./g, 'исследованию ');
    }

    /**
     * Склонение должности в родительный падеж
     */
    titleToGent(title) {
        const gentWords = {
            'аудитор': 'аудитора',
            'аналитик': 'аналитика',
            'специалист': 'специалиста',
            'эксперт': 'эксперта',
            'инженер': 'инженера',
            'директор': 'директора',
            'менеджер': 'менеджера',
            'начальник': 'начальника',
            'исследователь': 'исследователя',
            'руководитель': 'руководителя',
            'заместитель': 'заместителя',
            'старший': 'старшего',
            'управляющий': 'управляющего',
            'ведущий': 'ведущего',
            'младший': 'младшего',
            'главный': 'главного',
            'исполнительный': 'исполнительного'
        };

        return title.split(' ').map(words => {
            const tokens = words.split('-').map(word => {
                const lowerWord = word.toLowerCase();
                if (gentWords[lowerWord]) {
                    return gentWords[lowerWord];
                }
                return word;
            });
            return tokens.join('-');
        }).join(' ');
    }
}