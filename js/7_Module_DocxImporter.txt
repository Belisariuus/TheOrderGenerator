/**
 * Модуль 7. Импорт данных из готового распоряжения.
 *
 *   Читает уже сформированный документ-распоряжение (DOCX), извлекает из него
 *   две таблицы-приложения:
 *     • «Перечень проверяемых клиентских путей и процессов» (Приложение 2)
 *       — клиентские пути (КП) и процессы;
 *     • «Перечень информационных ресурсов …» (Приложение 3)
 *       — автоматизированные системы (АС) / информационные ресурсы.
 */
export default class DocxImporter {
    constructor(configManager) {
        this.configManager = configManager;

        this.processes = [];
        this.clientPaths = [];
        this.systems = [];

        this.PROCESS_TABLE_MARKERS = ['клиентск', 'процесс'];        // оба слова в шапке
        this.AS_TABLE_MARKERS = ['информационн', 'кэ'];              // «информационного ресурса» + «КЭ»
    }

    /**
        Читаем файл
     */
    async importFromFile(file, options = {}) {
        const applyToConfig = options.applyToConfig !== false;

        if (!file) throw new Error('Файл не передан');

        await this.loadReferenceData();

        const arrayBuffer = await this._readFileAsArrayBuffer(file);
        const parsed = this.parseDocx(arrayBuffer);

        if (applyToConfig) {
            this.applyToForms(parsed);
        }

        console.log('✓ Импорт из файла завершён:', parsed);
        return parsed;
    }

    /**
        Парсим файл
     */
    parseDocx(arrayBuffer) {
        const xml = this._extractDocumentXml(arrayBuffer);
        const tables = this._parseTables(xml);

        const processTable = this._findTable(tables, this.PROCESS_TABLE_MARKERS);
        const asTable = this._findTable(tables, this.AS_TABLE_MARKERS);

        const processItems = processTable ? this._parseProcessTable(processTable) : [];
        const systemItems = asTable ? this._parseAsTable(asTable) : [];

        return { processItems, systemItems };
    }

    /**
     * Записываем данные в формы \
     */
    applyToForms(parsed) {
        const { processItems = [], systemItems = [] } = parsed || {};

        this.configManager.replaceModuleConfig('ProcessesModule', { items: processItems });
        this.configManager.replaceModuleConfig('AutomatedSystems', { items: systemItems });

        // Сохраняем в сессию, чтобы данные пережили перезагрузку
        if (typeof this.configManager.saveToSessionStorage === 'function') {
            this.configManager.saveToSessionStorage();
        }

        if (typeof this.configManager.notifyListeners === 'function') {
            const full = this.configManager.getConfig();
            this.configManager.notifyListeners('FileImport', null, full);
        }
    }

    /**
     * Разбор Приложения 2 — «клиентские пути и процессы».
     *
     * Шапка документа: 
     КП занимают первые 4 столбца (№, Код, Наименование, Подразделение-владелец КП), 
     процессы — следующие 4 (№, Код, Наименование, Подразделение-владелец процесса). 
     КП и процесс в одной строке считаются связанной парой.
     */
    _parseProcessTable(table) {
        const items = [];
        // Находим строку, где начинаются данные (после двух строк шапки: групп. заголовок + «№/Код/...»).
        const dataRows = this._dataRowsAfterHeader(table, ['код', 'наименование']);

        for (const row of dataRows) {
            // Ожидаем 8 столбцов.
            const cols = this._padRow(row, 8);

            const pathCode = this._clean(cols[1]);
            const pathName = this._clean(cols[2]);
            const pathOwner = this._clean(cols[3]);

            const procCode = this._clean(cols[5]);
            const procName = this._clean(cols[6]);
            const procOwner = this._clean(cols[7]);

            // Пропускаем полностью пустые строки.
            if (!pathCode && !pathName && !procCode && !procName) continue;

            const item = {
                processCode: procCode || null,
                processName: procName || (procCode ? this._lookupProcessName(procCode) : null),
                processOwnerDepartment: procOwner || (procCode ? this._lookupProcessOwner(procCode) : null),
                pathCode: pathCode || null,
                pathName: pathName || (pathCode ? this._lookupPathName(pathCode) : null),
                pathOwnerDepartment: pathOwner || (pathCode ? this._lookupPathOwner(pathCode) : null)
            };

            const exists = items.some(it =>
                it.processCode === item.processCode && it.pathCode === item.pathCode
            );
            if (!exists) items.push(item);
        }

        return items;
    }

    /**
     * Разбор Приложения 3 — «информационные ресурсы» (АС).
     *
     * Шапка: 
	 * № п/п | Наименование ИР | Номер ИР (КЭ) | Необходимая роль/группа |ФИО сотрудника | Должность | Табельный номер.
     * В столбце «КЭ» содержится строка вида «Автоматизированная система\nAS1»,
     * откуда извлекаем идентификатор системы (AS1, AS2, …).
     */
    _parseAsTable(table) {
        const items = [];
        const dataRows = this._dataRowsAfterHeader(table, ['наименование', 'роль']);

        let current = null;

        for (const row of dataRows) {
            const cols = this._padRow(row, 7);

            const num = this._clean(cols[0]);
            const sysName = this._clean(cols[1]);
            const keCell = this._clean(cols[2]);
            const roleCell = this._clean(cols[3]);
            const empFio = this._clean(cols[4]);
            const empTitle = this._clean(cols[5]);
            const empTab = this._clean(cols[6]);

            const systemId = this._extractSystemId(keCell) || this._extractSystemId(sysName);

            // Новая запись начинается, когда есть № или появилось имя системы/КЭ.
            const isNewRecord = !!num || (!!systemId && (!current || current.systemId !== systemId));

            if (isNewRecord) {
                if (current) items.push(this._finalizeAsItem(current));
                current = {
                    systemId: systemId || sysName || `AS?`,
                    systemName: sysName || (systemId ? this._lookupSystemName(systemId) : ''),
                    roleSet: new Set(),
                    employeeNames: []
                };
            }

            if (!current) {
                current = {
                    systemId: systemId || sysName || `AS?`,
                    systemName: sysName || (systemId ? this._lookupSystemName(systemId) : ''),
                    roleSet: new Set(),
                    employeeNames: []
                };
            }

            if (roleCell && !/все необходимые роли/i.test(roleCell)) {
                roleCell.split(/\r?\n|,|;/).forEach(r => {
                    const v = this._clean(r);
                    if (v) current.roleSet.add(v);
                });
            }

            if (empFio && !/все участники/i.test(empFio)) {
                current.employeeNames.push({
                    fullName: empFio,
                    position: empTitle && !/все участники/i.test(empTitle) ? empTitle : '',
                    tabNumber: empTab && !/все участники/i.test(empTab) ? empTab : ''
                });
            }
        }

        if (current) items.push(this._finalizeAsItem(current));

        return items;
    }

    /**
     * Приводим к формату.
     */
    _finalizeAsItem(raw) {
        const roles = Array.from(raw.roleSet);
        const rolesDisplay = roles.length > 0 ? roles.join(', ') : 'Все необходимые роли';

        const employees = raw.employeeNames;
        const employeesDisplay = employees.length > 0
            ? employees.map(e => e.fullName).join(', ')
            : 'Все сотрудники приложения 1';

        return {
            systemId: raw.systemId,
            systemName: raw.systemName || this._lookupSystemName(raw.systemId) || raw.systemId,
            roles,
            rolesDisplay,
            employees,
            employeesDisplay
        };
    }


    /**
     * Извлекаем word/document.xml из DOCX-архива.
     */
    _extractDocumentXml(arrayBuffer) {
        const PizZipLib = (typeof PizZip !== 'undefined') ? PizZip
            : (typeof window !== 'undefined' && window.PizZip ? window.PizZip : null);
        if (!PizZipLib) {
            throw new Error('Библиотека PizZip не найдена. Подключите libs/pizzip.js.');
        }
        const zip = new PizZipLib(arrayBuffer);
        const file = zip.file('word/document.xml');
        if (!file) throw new Error('В архиве отсутствует word/document.xml (это не DOCX?).');
        return file.asText();
    }

    /**
     * Парсим XML 
     */
    _parseTables(xml) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xml, 'application/xml');

        const W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
        const tableEls = this._getElems(doc, W_NS, 'tbl');

        const tables = [];
        for (const tbl of tableEls) {
            const rows = [];
            const trEls = this._directDescendants(tbl, W_NS, 'tr');
            for (const tr of trEls) {
                const tcEls = this._directDescendants(tr, W_NS, 'tc');
                const cells = tcEls.map(tc => this._cellText(tc, W_NS));
                rows.push(cells);
            }
            tables.push(rows);
        }
        return tables;
    }

    _cellText(tc, W_NS) {
        const paras = this._getElems(tc, W_NS, 'p');
        const lines = [];
        for (const p of paras) {
            const texts = this._getElems(p, W_NS, 't');
            const line = texts.map(t => t.textContent).join('');
            lines.push(line);
        }
        return lines.join('\n').trim();
    }


    _getElems(root, ns, local) {
        if (root.getElementsByTagNameNS) {
            return Array.from(root.getElementsByTagNameNS(ns, local));
        }
        return Array.from(root.getElementsByTagName('*'))
            .filter(el => el.localName === local);
    }

    // ИСПРАВЛЕННЫЙ МЕТОД
    _directDescendants(root, ns, local) {
        const all = this._getElems(root, ns, local);
        return all.filter(el => {
            let parent = el.parentNode;
            while (parent && parent !== root) {
                if (parent.localName === local || parent.localName === 'tbl' || parent.localName === 'tr') {
                    return false;
                }
                parent = parent.parentNode;
            }
            return true;
        });
    }

    /**
     * Находим таблицу, в шапке которой встречаются ВСЕ слова-маркеры.
     */
    _findTable(tables, markers) {
        for (const table of tables) {
            const headerText = (table.slice(0, 2).flat().join(' ')).toLowerCase();
            const ok = markers.every(m => headerText.includes(m.toLowerCase()));
            if (ok) return table;
        }
        return null;
    }

    /**
     * Возвращаем строки данных после строки-шапки
     */
    _dataRowsAfterHeader(table, headerWords) {
        let headerIdx = -1;
        for (let i = 0; i < table.length; i++) {
            const rowText = table[i].join(' ').toLowerCase();
            if (headerWords.every(w => rowText.includes(w.toLowerCase()))) {
                headerIdx = i;
                break;
            }
        }
        const start = headerIdx >= 0 ? headerIdx + 1 : 1;
        return table.slice(start);
    }

    _padRow(row, n) {
        const out = row.slice(0, n);
        while (out.length < n) out.push('');
        return out;
    }

    _clean(v) {
        if (v == null) return '';
        const s = String(v).replace(/\s+/g, ' ').trim();
        if (s === '—' || s === '-' || s === '–') return '';
        return s;
    }


    _extractSystemId(text) {
        if (!text) return '';
        const m = String(text).match(/AS\s*\d+/i);
        return m ? m[0].replace(/\s+/g, '').toUpperCase() : '';
    }

    _lookupProcessName(code) {
        const p = this.processes.find(x => x.code === code);
        return p ? p.name : null;
    }
    _lookupProcessOwner(code) {
        const p = this.processes.find(x => x.code === code);
        return p ? p.ownerDepartment : null;
    }
    _lookupPathName(code) {
        const p = this.clientPaths.find(x => x.code === code);
        return p ? p.name : null;
    }
    _lookupPathOwner(code) {
        const p = this.clientPaths.find(x => x.code === code);
        return p ? p.ownerDepartment : null;
    }
    _lookupSystemName(id) {
        const s = this.systems.find(x => x.id === id);
        return s ? s.name : null;
    }

    async loadReferenceData() {
        if (this.processes.length && this.systems.length) return;
        try {
            const r = await fetch('./data/processes.json');
            if (r.ok) {
                const d = await r.json();
                this.processes = d.processes || [];
                this.clientPaths = d.clientPaths || [];
            }
        } catch (e) {
            console.warn('Не удалось загрузить processes.json:', e);
        }
        try {
            const r = await fetch('./data/systems.json');
            if (r.ok) {
                const d = await r.json();
                this.systems = d.systems || [];
            }
        } catch (e) {
            console.warn('Не удалось загрузить systems.json:', e);
        }
    }

    _readFileAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('Ошибка чтения файла'));
            reader.readAsArrayBuffer(file);
        });
    }
}