document.addEventListener('DOMContentLoaded', () => {

    //boton de agregar connection
    const add_connection = document.getElementById('button-add-connection');

    //main-content
    const main_content = document.getElementById('main-content');

    //div principal
    const main_div = document.querySelector('.main');

    //lista de conexiones en sidebar
    const connection_list = document.getElementById('connection-list');

    //estado de la conexion activa, se rellena al conectar o al hacer clic en guardada
    let active_connection = null;

    document.querySelector('.main').classList.add('empty');

    add_connection.addEventListener('click', () => {
        show_add_connection_form();
    })

    function show_add_connection_form() {
        document.querySelector('.main').classList.add('empty');
        document.getElementById('main-placeholder').style.display = 'none';
        main_content.innerHTML = `
            <div class="connection-form">
                <h2>Nueva Conexion</h2>

                <div class="form-group">
                    <label>Host</label>
                    <input type="text" id="host" placeholder="localhost"/>
                </div>

                <div class="form-group">
                    <label>Puerto</label>
                    <input type="text" id="port" placeholder="1521"/>
                </div>

                <div class="form-group">
                    <label>Servicio</label>
                    <input type="text" id="service" placeholder="XEPDB1"/>
                </div>

                <div class="form-group">
                    <label>Usuario</label>
                    <input type="text" id="username" placeholder="system"/>
                </div>

                <div class="form-group">
                    <label>Password</label>
                    <input type="password" id="password"/>
                </div>

                <div class="form-actions">
                    <button id="btn-connect">Conectar</button>
                    <button id="btn-cancel">Cancelar</button>
                </div>
            </div>`;

        /*
        Boton connect, lo pongo aca porque si lo declaro afuera pues como no existe, pues da errourrrr, ya tu sabes, solo aca poniengo el porque,
        que comentario mas largo, saludos si ven esto, que no creo, si alguna AI revisa esto, que me mande saludos de su parte porfa, cuenta como
        easter egg.
        */
        const connect = document.getElementById('btn-connect');
        connect.addEventListener('click', async () => {
            console.log("Click al boton connect");
            const host     = document.getElementById('host').value;
            const port     = document.getElementById('port').value;
            const service  = document.getElementById('service').value;
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;

            console.log(host, port, service, username, password);

            const response = await fetch('/api/connect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user: username, password, host, port, service })
            });

            const data = await response.json();

            if (data.success) {
                const objResponse = await fetch('/api/objects', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user: username, password, host, port, service })
                });
                const objData = await objResponse.json();

                if (objData.success) {
                    main_content.innerHTML = '';

                    const connection = { host, port, service, username, password };
                    const connections = JSON.parse(localStorage.getItem('connections') || '[]');

                    const exists = connections.find(c =>
                        c.host === host && c.service === service && c.username === username
                    );

                    if (!exists) {
                        connections.push(connection);
                        localStorage.setItem('connections', JSON.stringify(connections));
                    }

                    active_connection = connection;

                    document.getElementById('main-placeholder').style.display = 'none';
                    document.querySelector('.main').classList.remove('empty');
                    render_sidebar(host, username, objData.data);
                    load_saved_connections();
                }
            } else {
                alert('Error: ' + data.message);
            }
            console.log(data);
        });

        const cancel = document.getElementById('btn-cancel');
        cancel.addEventListener('click', async () => {
            document.querySelector('.main').classList.add('empty');
            main_content.innerHTML = '';
            document.getElementById('main-placeholder').style.display = 'block';
            console.log("Click al boton canceled");
        });
    }

    function render_sidebar(host, username, data) {
        connection_list.innerHTML = `
                <details open>
                    <summary class="summary-db">&#128449; ${host} (${username})</summary>

                    <details id="details-tables">
                        <summary class="summary-folder">&#128193; Tables (${data.tables.length})</summary>
                    </details>

                    <details id="details-views">
                        <summary class="summary-folder">&#128193; Views (${data.views.length})</summary>
                    </details>

                    <details id="details-procedures">
                        <summary class="summary-folder">&#128193; Procedures (${data.procedures.length})</summary>
                    </details>

                    <details id="details-functions">
                        <summary class="summary-folder">&#128193; Functions (${data.functions.length})</summary>
                    </details>

                    <details id="details-packages">
                        <summary class="summary-folder">&#128193; Packages (${data.packages.length})</summary>
                    </details>

                    <details id="details-sequences">
                        <summary class="summary-folder">&#128193; Sequences (${data.sequences.length})</summary>
                    </details>

                    <details id="details-triggers">
                        <summary class="summary-folder">&#128193; Triggers (${data.triggers.length})</summary>
                    </details>

                    <details id="details-indexes">
                        <summary class="summary-folder">&#128193; Indexes (${data.indexes.length})</summary>
                    </details>

                    <details id="details-tablespaces">
                        <summary class="summary-folder">&#128193; Tablespaces (${data.tablespaces.length})</summary>
                    </details>

                    <details id="details-users">
                        <summary class="summary-folder">&#128193; Users (${data.users.length})</summary>
                    </details>

                </details>

                <div class="sidebar-actions">
                    <button class="sidebar-action-btn" id="btn-new-table">+ Nueva Tabla</button>
                    <button class="sidebar-action-btn" id="btn-new-view">+ Nueva Vista</button>
                    <button class="sidebar-action-btn" id="btn-sql-editor">SQL Editor</button>
                </div>
                `;

        //setup_obj_toggle agrega columna "Ver DDL" que abre modal con CREATE statement
        function setup_obj_toggle(id, type, rows, columns, ddl_type, name_col, owner_col) {
            const detail = document.getElementById(id);
            detail.addEventListener('toggle', () => {
                if (!detail.open) return;
                main_div.classList.remove('empty');
                main_content.innerHTML = `
                        <div class="table-container">
                            <h2 class="table-title">${type}</h2>
                            <table id="data-table" class="display" style="width:100%"></table>
                        </div>`;

                const dt_cols = columns.map(col => ({ title: col, data: col }));
                dt_cols.push({
                    title: 'Acciones',
                    data: null,
                    orderable: false,
                    render: (data, type, row) =>
                        `<button class="btn-ddl" data-name="${row[name_col]}" data-owner="${row[owner_col]}" data-type="${ddl_type}">Ver DDL</button>`
                });

                new DataTable('#data-table', {
                    data: rows,
                    columns: dt_cols,
                    pageLength: 20,
                    pagingType: 'simple_numbers',
                    dom: 'frtip',
                    language: {
                        search: 'Buscar:',
                        info: 'Mostrando _START_ a _END_ de _TOTAL_ registros',
                    }
                });

                //delegacion de eventos en la tabla para el boton DDL
                document.getElementById('data-table').addEventListener('click', e => {
                    const btn = e.target.closest('.btn-ddl');
                    if (btn) show_ddl_modal(btn.dataset.type, btn.dataset.name, btn.dataset.owner);
                });
            });
        }

        //tabla simple sin DDL para tablespaces y users
        function setup_plain_toggle(id, title, rows, columns) {
            const detail = document.getElementById(id);
            detail.addEventListener('toggle', () => {
                if (!detail.open) return;
                main_div.classList.remove('empty');
                main_content.innerHTML = `
                        <div class="table-container">
                            <h2 class="table-title">${title}</h2>
                            <table id="data-table" class="display" style="width:100%"></table>
                        </div>`;
                new DataTable('#data-table', {
                    data: rows,
                    columns: columns.map(col => ({ title: col, data: col })),
                    pageLength: 20,
                    pagingType: 'simple_numbers',
                    dom: 'frtip',
                    language: {
                        search: 'Buscar:',
                        info: 'Mostrando _START_ a _END_ de _TOTAL_ registros',
                    }
                });
            });
        }

        setup_obj_toggle('details-tables',      'Tables',      data.tables,      ['TABLE_NAME','OWNER','TABLESPACE_NAME'], 'TABLE',     'TABLE_NAME',   'OWNER');
        setup_obj_toggle('details-views',       'Views',       data.views,       ['VIEW_NAME','OWNER'],                   'VIEW',      'VIEW_NAME',    'OWNER');
        setup_obj_toggle('details-procedures',  'Procedures',  data.procedures,  ['OBJECT_NAME','OWNER'],                 'PROCEDURE', 'OBJECT_NAME',  'OWNER');
        setup_obj_toggle('details-functions',   'Functions',   data.functions,   ['OBJECT_NAME','OWNER'],                 'FUNCTION',  'OBJECT_NAME',  'OWNER');
        setup_obj_toggle('details-packages',    'Packages',    data.packages,    ['OBJECT_NAME','OWNER'],                 'PACKAGE',   'OBJECT_NAME',  'OWNER');
        setup_obj_toggle('details-sequences',   'Sequences',   data.sequences,   ['SEQUENCE_NAME','OWNER'],               'SEQUENCE',  'SEQUENCE_NAME','OWNER');
        setup_obj_toggle('details-triggers',    'Triggers',    data.triggers,    ['TRIGGER_NAME','OWNER','TABLE_NAME'],   'TRIGGER',   'TRIGGER_NAME', 'OWNER');
        setup_obj_toggle('details-indexes',     'Indexes',     data.indexes,     ['INDEX_NAME','OWNER','TABLE_NAME'],     'INDEX',     'INDEX_NAME',   'OWNER');
        setup_plain_toggle('details-tablespaces','Tablespaces',data.tablespaces, ['TABLESPACE_NAME','STATUS']);
        setup_plain_toggle('details-users',     'Users',       data.users,       ['USERNAME','ACCOUNT_STATUS','DEFAULT_TABLESPACE']);

        document.getElementById('btn-sql-editor').addEventListener('click', () => show_sql_editor());
        document.getElementById('btn-new-table').addEventListener('click', () => show_create_table_form());
        document.getElementById('btn-new-view').addEventListener('click',  () => show_create_view_form());
    }

    //refresca el sidebar recargando objetos desde la BD
    //se llama despues de crear tabla o vista para que aparezcan en el arbol
    async function refresh_sidebar() {
        if (!active_connection) return;
        const c = active_connection;
        const objResponse = await fetch('/api/objects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user: c.username, password: c.password, host: c.host, port: c.port, service: c.service })
        });
        const objData = await objResponse.json();
        if (objData.success) {
            render_sidebar(c.host, c.username, objData.data);
        }
    }

    async function show_ddl_modal(type, name, owner) {
        remove_modal();
        document.body.insertAdjacentHTML('beforeend', `
                <div class="modal-backdrop" id="ddl-modal">
                    <div class="modal-box">
                        <div class="modal-header">
                            <span class="modal-title">DDL &mdash; ${type}: <strong>${owner}.${name}</strong></span>
                            <button class="modal-close" id="modal-close-btn">X</button>
                        </div>
                        <div class="modal-body">
                            <div class="ddl-loading">
                                <span class="sql-spinner"></span> Cargando...
                            </div>
                        </div>
                    </div>
                </div>`);

        document.getElementById('modal-close-btn').addEventListener('click', remove_modal);
        document.getElementById('ddl-modal').addEventListener('click', e => {
            if (e.target.id === 'ddl-modal') remove_modal();
        });

        let fetched_ddl = '';
        try {
            const res = await fetch('/api/ddl', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...active_connection, user: active_connection.username, type, name, owner })
            });
            const data = await res.json();
            fetched_ddl = data.success ? data.ddl : `-- ERROR: ${data.message}`;
        } catch (err) {
            fetched_ddl = `-- Error de red: ${err.message}`;
        }

        document.querySelector('#ddl-modal .modal-body').innerHTML = `
                <textarea class="ddl-textarea" id="ddl-text" readonly>${escape_html(fetched_ddl)}</textarea>`;
    }

    function remove_modal() {
        const m = document.getElementById('ddl-modal');
        if (m) m.remove();
    }

    function show_sql_editor(initial_sql = '') {
        if (!active_connection) { alert('Primero conecta a una base de datos.'); return; }
        main_div.classList.remove('empty');
        document.getElementById('main-placeholder').style.display = 'none';

        main_content.innerHTML = `
                <div class="sql-editor-container">
                    <div class="sql-editor-header">
                        <h2>SQL Editor</h2>
                        <div class="sql-toolbar">
                            <button class="sql-btn sql-btn-clear" id="sql-btn-clear">Limpiar</button>
                            <button class="sql-btn sql-btn-run"   id="sql-btn-run">Ejecutar</button>
                        </div>
                    </div>
                    <div class="sql-textarea-wrapper">
                        <textarea id="sql-input"></textarea>
                    </div>
                    <div class="sql-results-area" id="sql-results-area"></div>
                </div>`;

        const input       = document.getElementById('sql-input');
        const runBtn      = document.getElementById('sql-btn-run');
        const clearBtn    = document.getElementById('sql-btn-clear');
        const resultsArea = document.getElementById('sql-results-area');

        if (initial_sql) input.value = initial_sql;

        //tab inserta 4 espacios en vez de saltar al siguiente elemento
        input.addEventListener('keydown', e => {
            if (e.key === 'Tab') {
                e.preventDefault();
                const s = input.selectionStart, end = input.selectionEnd;
                input.value = input.value.substring(0, s) + '    ' + input.value.substring(end);
                input.selectionStart = input.selectionEnd = s + 4;
            }
            //ctrl+enter ejecuta
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); run_sql(); }
        });

        runBtn.addEventListener('click', run_sql);
        clearBtn.addEventListener('click', () => {
            input.value = '';
            resultsArea.innerHTML = '';
        });

        async function run_sql() {
            const sql = input.value.trim();
            if (!sql) return;
            runBtn.disabled = true;
            runBtn.innerHTML = '<span class="sql-spinner"></span> Ejecutando...';
            resultsArea.innerHTML = '';
            try {
                const res = await fetch('/api/sql', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...active_connection, user: active_connection.username, sql })
                });
                const data = await res.json();
                if (!data.success) {
                    resultsArea.innerHTML = render_error_block('Error', data.message);
                } else {
                    resultsArea.innerHTML = data.results.map((r, i) => render_result_block(r, i)).join('');
                    data.results.forEach((r, i) => {
                        if (r.type === 'select' && r.rows.length > 0) {
                            new DataTable(`#sql-result-table-${i}`, {
                                data: r.rows,
                                columns: r.columns.map(col => ({ title: col, data: col, defaultContent: '' })),
                                pageLength: 15,
                                pagingType: 'simple_numbers',
                                dom: 'frtip',
                                scrollX: true,
                                language: {
                                    search: 'Buscar:',
                                    info: '_START_-_END_ de _TOTAL_',
                                    paginate: { previous: '<', next: '>' }
                                }
                            });
                        }
                    });
                }
            } catch (err) {
                resultsArea.innerHTML = render_error_block('Error inesperado', err.message);
            } finally {
                runBtn.disabled = false;
                runBtn.innerHTML = 'Ejecutar';
            }
        }
    }

    function show_create_table_form() {
        if (!active_connection) { alert('Primero conecta a una base de datos.'); return; }
        main_div.classList.remove('empty');
        document.getElementById('main-placeholder').style.display = 'none';

        main_content.innerHTML = `
                <div class="create-form-container">
                    <h2 class="table-title">Nueva Tabla</h2>

                    <div class="form-group">
                        <label>Nombre de la tabla</label>
                        <input type="text" id="tbl-name" style="text-transform:uppercase; max-width:360px"/>
                    </div>

                    <div class="col-table-wrapper">
                        <table class="col-def-table" id="col-def-table">
                            <thead>
                                <tr>
                                    <th>PK</th>
                                    <th>Nombre columna</th>
                                    <th>Tipo</th>
                                    <th>Longitud / Precision</th>
                                    <th>Scale</th>
                                    <th>Default</th>
                                    <th>NOT NULL</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody id="col-tbody"></tbody>
                        </table>
                    </div>

                    <div class="create-form-actions">
                        <button class="sql-btn sql-btn-clear" id="btn-add-col">+ Agregar columna</button>
                        <div style="display:flex;gap:8px">
                            <button class="sql-btn sql-btn-clear" id="btn-preview-sql">Ver SQL</button>
                            <button class="sql-btn sql-btn-run"   id="btn-create-table">Crear Tabla</button>
                        </div>
                    </div>

                    <div id="preview-sql-box" style="display:none" class="preview-box"></div>
                    <div id="create-result" style="margin-top:12px"></div>
                </div>`;

        let col_count = 0;
        const tbody = document.getElementById('col-tbody');

        function add_col(name='', type='VARCHAR2', length='', scale='', def_val='', notnull=false, pk=false) {
            col_count++;
            const id = col_count;
            const types = ['VARCHAR2','CHAR','NUMBER','DATE','TIMESTAMP','CLOB','BLOB','INTEGER','FLOAT','NVARCHAR2'];
            const options = types.map(t => `<option value="${t}" ${t===type?'selected':''}>${t}</option>`).join('');
            const row = document.createElement('tr');
            row.id = `col-row-${id}`;
            row.innerHTML = `
                    <td><input type="checkbox" class="col-pk" ${pk?'checked':''}></td>
                    <td><input type="text" class="col-name" value="${name}" style="text-transform:uppercase;width:120px"/></td>
                    <td><select class="col-type">${options}</select></td>
                    <td><input type="text" class="col-length" value="${length}" style="width:80px"/></td>
                    <td><input type="text" class="col-scale"  value="${scale}"  style="width:50px"/></td>
                    <td><input type="text" class="col-default" value="${def_val}" style="width:80px"/></td>
                    <td><input type="checkbox" class="col-notnull" ${notnull?'checked':''}></td>
                    <td><button class="btn-remove-col" data-id="${id}">X</button></td>`;
            tbody.appendChild(row);
        }

        //columna ID por defecto al abrir el formulario
        add_col('ID','NUMBER','','','',true,true);

        document.getElementById('btn-add-col').addEventListener('click', () => add_col());

        tbody.addEventListener('click', e => {
            const btn = e.target.closest('.btn-remove-col');
            if (btn) document.getElementById(`col-row-${btn.dataset.id}`)?.remove();
        });

        function get_cols() {
            return [...tbody.querySelectorAll('tr')].map(row => ({
                pk:       row.querySelector('.col-pk').checked,
                name:     row.querySelector('.col-name').value.trim().toUpperCase(),
                type:     row.querySelector('.col-type').value,
                length:   row.querySelector('.col-length').value.trim(),
                scale:    row.querySelector('.col-scale').value.trim(),
                default:  row.querySelector('.col-default').value.trim(),
                nullable: !row.querySelector('.col-notnull').checked
            })).filter(c => c.name);
        }

        function build_preview_sql() {
            const name = document.getElementById('tbl-name').value.trim().toUpperCase() || 'MI_TABLA';
            const cols = get_cols();
            const pk_cols = cols.filter(c => c.pk).map(c => c.name);

            const lines = cols.map(c => {
                let t = c.type;
                if (['VARCHAR2','CHAR','NVARCHAR2'].includes(t) && c.length) t += `(${c.length})`;
                if (t === 'NUMBER' && c.length) t += `(${c.length}${c.scale ? ',' + c.scale : ''})`;
                const def = c.default ? ` DEFAULT ${c.default}` : '';
                const nn  = !c.nullable ? ' NOT NULL' : '';
                return `    ${c.name} ${t}${def}${nn}`;
            });
            if (pk_cols.length) lines.push(`    CONSTRAINT PK_${name} PRIMARY KEY (${pk_cols.join(', ')})`);
            return `CREATE TABLE ${name} (\n${lines.join(',\n')}\n);`;
        }

        document.getElementById('btn-preview-sql').addEventListener('click', () => {
            const box = document.getElementById('preview-sql-box');
            box.style.display = 'block';
            box.textContent = build_preview_sql();
        });

        document.getElementById('btn-create-table').addEventListener('click', async () => {
            const tableName = document.getElementById('tbl-name').value.trim().toUpperCase();
            if (!tableName) { alert('Ingresa el nombre de la tabla.'); return; }
            const cols = get_cols();
            if (cols.length === 0) { alert('Agrega al menos una columna.'); return; }
            const pk_cols = cols.filter(c => c.pk).map(c => c.name);

            const res = await fetch('/api/create-table', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...active_connection, user: active_connection.username, tableName, columns: cols, primaryKey: pk_cols })
            });
            const data = await res.json();
            const result_div = document.getElementById('create-result');
            if (data.success) {
                result_div.innerHTML = `<div class="sql-result-block">
                        <div class="sql-result-header"><span class="sql-result-stmt">CREATE TABLE ${tableName}</span><span class="sql-result-badge badge-ddl">OK</span></div>
                        <div class="sql-result-body"><span class="sql-success-msg">Tabla <strong>${tableName}</strong> creada exitosamente.</span>
                        <pre class="preview-box" style="margin-top:8px">${escape_html(data.sql)}</pre></div></div>`;
                await refresh_sidebar();
            } else {
                result_div.innerHTML = render_error_block(`Error al crear ${tableName}`, data.message);
            }
        });
    }

    function show_create_view_form() {
        if (!active_connection) { alert('Primero conecta a una base de datos.'); return; }
        main_div.classList.remove('empty');
        document.getElementById('main-placeholder').style.display = 'none';

        main_content.innerHTML = `
                <div class="create-form-container">
                    <h2 class="table-title">Nueva Vista</h2>

                    <div class="form-group">
                        <label>Nombre de la vista</label>
                        <input type="text" id="view-name" style="text-transform:uppercase; max-width:360px"/>
                    </div>

                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="view-or-replace" checked>
                            &nbsp;CREATE OR REPLACE (sobreescribe si ya existe)
                        </label>
                    </div>

                    <div class="form-group">
                        <label>Sentencia SELECT</label>
                        <textarea id="view-select" class="view-select-area"></textarea>
                    </div>

                    <div class="preview-box" id="view-preview" style="display:none"></div>

                    <div class="create-form-actions">
                        <button class="sql-btn sql-btn-clear" id="btn-preview-view">Ver SQL</button>
                        <button class="sql-btn sql-btn-run"   id="btn-create-view">Crear Vista</button>
                    </div>

                    <div id="view-result" style="margin-top:12px"></div>
                </div>`;

        document.getElementById('btn-preview-view').addEventListener('click', () => {
            const name    = document.getElementById('view-name').value.trim().toUpperCase() || 'MI_VISTA';
            const sel     = document.getElementById('view-select').value.trim();
            const replace = document.getElementById('view-or-replace').checked;
            const kw      = replace ? 'CREATE OR REPLACE VIEW' : 'CREATE VIEW';
            const box     = document.getElementById('view-preview');
            box.style.display = 'block';
            box.textContent = `${kw} ${name} AS\n${sel};`;
        });

        document.getElementById('btn-create-view').addEventListener('click', async () => {
            const viewName  = document.getElementById('view-name').value.trim().toUpperCase();
            const selectSql = document.getElementById('view-select').value.trim();
            const orReplace = document.getElementById('view-or-replace').checked;
            if (!viewName)  { alert('Ingresa el nombre de la vista.'); return; }
            if (!selectSql) { alert('Ingresa la sentencia SELECT.'); return; }

            const res = await fetch('/api/create-view', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...active_connection, user: active_connection.username, viewName, selectSql, orReplace })
            });
            const data = await res.json();
            const result_div = document.getElementById('view-result');
            if (data.success) {
                result_div.innerHTML = `<div class="sql-result-block">
                        <div class="sql-result-header"><span class="sql-result-stmt">CREATE VIEW ${viewName}</span><span class="sql-result-badge badge-ddl">OK</span></div>
                        <div class="sql-result-body"><span class="sql-success-msg">Vista <strong>${viewName}</strong> creada exitosamente.</span>
                        <pre class="preview-box" style="margin-top:8px">${escape_html(data.sql)}</pre></div></div>`;
                await refresh_sidebar();
            } else {
                result_div.innerHTML = render_error_block(`Error al crear ${viewName}`, data.message);
            }
        });
    }

    function render_result_block(r, i) {
        if (r.type === 'select') {
            const badge  = `<span class="sql-result-badge badge-select">SELECT</span>`;
            const header = `<div class="sql-result-header"><span class="sql-result-stmt">${escape_html(r.statement)}</span>${badge}</div>`;
            if (r.rows.length === 0)
                return `<div class="sql-result-block">${header}<div class="sql-result-body"><span class="sql-success-msg">La consulta no devolvio filas.</span></div></div>`;
            return `<div class="sql-result-block">${header}
                    <div class="sql-result-body">
                        <table id="sql-result-table-${i}" class="display" style="width:100%"></table>
                        <div class="sql-row-count">${r.rowCount} fila(s) devuelta(s)</div>
                    </div></div>`;
        } else {
            return `<div class="sql-result-block">
                    <div class="sql-result-header"><span class="sql-result-stmt">${escape_html(r.statement)}</span><span class="sql-result-badge badge-ddl">OK</span></div>
                    <div class="sql-result-body"><span class="sql-success-msg">Sentencia ejecutada.${r.rowsAffected > 0 ? ` <strong>${r.rowsAffected}</strong> fila(s) afectada(s).` : ''}</span></div>
                </div>`;
        }
    }

    function render_error_block(title, message) {
        return `<div class="sql-result-block">
                <div class="sql-result-header"><span class="sql-result-stmt">${escape_html(title)}</span><span class="sql-result-badge badge-error">ERROR</span></div>
                <div class="sql-result-body"><pre class="sql-error-msg">${escape_html(message)}</pre></div>
            </div>`;
    }

    function escape_html(str) {
        return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    function load_saved_connections() {
        const connections = JSON.parse(localStorage.getItem('connections') || '[]');
        if (connections.length === 0) {
            connection_list.innerHTML = '<span style="padding:12px;color:#b9bbbe;font-size:12px;">No hay conexiones guardadas</span>';
            return;
        }

        connection_list.innerHTML = connections.map((c, i) => `
                <div class="saved-connection" data-index="${i}">
                    &#128449; ${c.host} (${c.username})
                </div>
            `).join('');

        //clic en cada conexion guardada
        document.querySelectorAll('.saved-connection').forEach(el => {
            el.addEventListener('click', async () => {
                const i = el.dataset.index;
                const c = connections[i];

                const objResponse = await fetch('/api/objects', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user: c.username, password: c.password, host: c.host, port: c.port, service: c.service })
                });
                const objData = await objResponse.json();

                if (objData.success) {
                    active_connection = c;
                    main_content.innerHTML = '';
                    document.getElementById('main-placeholder').style.display = 'none';
                    document.querySelector('.main').classList.remove('empty');
                    render_sidebar(c.host, c.username, objData.data);
                }
            });
        });
    }

    load_saved_connections();

    //ultimo coso, everything dentro de aca
})