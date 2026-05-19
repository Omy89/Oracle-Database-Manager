    document.addEventListener('DOMContentLoaded', () => {


        //boton de agregar connection
        const add_connection = document.getElementById('button-add-connection');

        //main-content
        const main_content = document.getElementById('main-content');



        add_connection.addEventListener('click', () => {
            console.log('clicked');
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
                
                <button id="btn-connect">Conectar</button>
            </div>`;
        })
    })