    document.addEventListener('DOMContentLoaded', () => {


        //boton de agregar connection
        const add_connection = document.getElementById('button-add-connection');

        //main-content
        const main_content = document.getElementById('main-content');

        document.querySelector('.main').classList.add('empty');

        add_connection.addEventListener('click', () => {
            show_add_connection_form();
        })

        //helpers
        function show_add_connection_form() {
            document.querySelector('.main').classList.add('empty');
            document.getElementById('main-placeholder').style.display = 'none';
            main_content.innerHTML = `
            <div class="connection-form">
                <h2>Nueva Conexión</h2>
                
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
                    <input type="password" id="password" placeholder="••••••••"/>
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
            const connect  = document.getElementById('btn-connect');
            connect.addEventListener('click', async () => {
                console.log("Click al boton connect");
                const host = document.getElementById('host').value;
                const port = document.getElementById('port').value;
                const service = document.getElementById('service').value;
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

                        document.getElementById('main-placeholder').style.display = 'none';
                        document.querySelector('.main').classList.remove('empty');
                        render_sidebar(host, username, objData.data);
                    }
                } else {
                    alert('Error: ' + data.message);
                }
                console.log(data);
            });


            const cancel  = document.getElementById('btn-cancel');
            cancel.addEventListener('click', async () => {
                document.querySelector('.main').classList.add('empty');
                main_content.innerHTML = '';
                document.getElementById('main-placeholder').style.display = 'block';
                console.log("Click al boton canceled");
            });
        }

        //CONNECTION
        const connection_list = document.getElementById('connection-list');


        function render_sidebar(host, username, data) {
                        connection_list.innerHTML = `
                <details>
                    <summary>📁 ${host} (${username})</summary>
            
                    <details id="details-tables">
                        <summary>📂 Tables (${data.tables.length})</summary>
                    </details>
            
                    <details id="details-views">
                        <summary>📂 Views (${data.views.length})</summary>
                    </details>
            
                    <details id="details-procedures">
                        <summary>📂 Procedures (${data.procedures.length})</summary>
                    </details>
            
                    <details id="details-functions">
                        <summary>📂 Functions (${data.functions.length})</summary>
                    </details>
            
                    <details id="details-packages">
                        <summary>📂 Packages (${data.packages.length})</summary>
                    </details>
            
                    <details id="details-sequences">
                        <summary>📂 Sequences (${data.sequences.length})</summary>
                    </details>
            
                    <details id="details-triggers">
                        <summary>📂 Triggers (${data.triggers.length})</summary>
                    </details>
            
                    <details id="details-indexes">
                        <summary>📂 Indexes (${data.indexes.length})</summary>
                    </details>
            
                    <details id="details-tablespaces">
                        <summary>📂 Tablespaces (${data.tablespaces.length})</summary>
                    </details>
            
                    <details id="details-users">
                        <summary>📂 Users (${data.users.length})</summary>
                    </details>
            
                </details>
                `;
            //gracias ai por:
            function setup_toggle(id, type, rows, columns) {
                const detail = document.getElementById(id);
                detail.addEventListener('toggle', () => {
                    if (detail.open) {
                        show_objects(type, rows, columns);
                    }
                });
            }

            function show_objects(type, rows, columns) {
                // limpiar el main y quitar el centrado para que la tabla ocupe todo
                document.querySelector('.main').classList.remove('empty');
                main_content.innerHTML = `
                        <div class="table-container">
                            <h2 class="table-title">${type}</h2>
                            <table id="data-table" class="display" style="width:100%"></table>
                        </div>
                    `;

                   // inicializar DataTables con los datos
                new DataTable('#data-table', {
                    data: rows,
                    columns: columns.map(col => ({ title: col, data: col })),
                    pageLength: 20,
                    pagingType: 'simple_numbers',
                    dom: 'frtip', // quita el selector de cantidad (l)
                    language: {
                        search: 'Buscar:',
                        info: 'Mostrando _START_ a _END_ de _TOTAL_ registros',
                    }
                });
            }

            setup_toggle('details-tables',      'Tables',      data.tables,      ['TABLE_NAME', 'OWNER', 'TABLESPACE_NAME']);
            setup_toggle('details-views',       'Views',       data.views,       ['VIEW_NAME', 'OWNER']);
            setup_toggle('details-procedures',  'Procedures',  data.procedures,  ['OBJECT_NAME', 'OWNER']);
            setup_toggle('details-functions',   'Functions',   data.functions,   ['OBJECT_NAME', 'OWNER']);
            setup_toggle('details-packages',    'Packages',    data.packages,    ['OBJECT_NAME', 'OWNER']);
            setup_toggle('details-sequences',   'Sequences',   data.sequences,   ['SEQUENCE_NAME', 'OWNER']);
            setup_toggle('details-triggers',    'Triggers',    data.triggers,    ['TRIGGER_NAME', 'OWNER', 'TABLE_NAME']);
            setup_toggle('details-indexes',     'Indexes',     data.indexes,     ['INDEX_NAME', 'OWNER', 'TABLE_NAME']);
            setup_toggle('details-tablespaces', 'Tablespaces', data.tablespaces, ['TABLESPACE_NAME', 'STATUS']);
            setup_toggle('details-users',       'Users',       data.users,       ['USERNAME', 'ACCOUNT_STATUS', 'DEFAULT_TABLESPACE']);



        }

        function load_saved_connections() {
            const connections = JSON.parse(localStorage.getItem('connections') || '[]');
            if (connections.length === 0) {
                connection_list.innerHTML = '<span style="padding:12px;color:#b9bbbe;font-size:12px;">No hay conexiones guardadas</span>';
                return;
            }

            connection_list.innerHTML = connections.map((c, i) => `
        <div class="saved-connection" data-index="${i}">
            📁 ${c.host} (${c.username})
        </div>
    `).join('');

            // clic en cada conexión guardada
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