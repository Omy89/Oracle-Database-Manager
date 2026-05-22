//librerias
const { getConnection } = require('./db/connection');
const oracledb = require('oracledb');
const express = require('express');
const cors = require('cors');


require('dotenv').config();

//instance express
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Oracle DB Manager funcionando');
});

app.post('/api/connect', async (req, res) => {
    const { user, password, host, port, service } = req.body;
    let conn;
    try {
        conn = await getConnection(user, password, host, port, service);
        res.json({ success: true, message: 'Conectado a Oracle' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    } finally {
        if (conn) await conn.close();
    }
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

app.post('/api/objects', async (req, res) => {
    const { user, password, host, port, service } = req.body;
    let conn;

    try {
        conn = await getConnection(user, password, host, port, service);

        // opts es un objeto de configuración para oracledb
        // OUT_FORMAT_OBJECT le dice a oracledb:
        // "en lugar de retornar arrays, retorna objetos con nombres de columnas"
        // sin esto: rows: [['EMPLOYEES', 'HR']]
        // con esto:  rows: [{ TABLE_NAME: 'EMPLOYEES', OWNER: 'HR' }]
        const opts = { outFormat: oracledb.OUT_FORMAT_OBJECT };

        const [tables, views, procedures, functions, packages,
            sequences, triggers, indexes, tablespaces, users] = await Promise.all([

            conn.execute(`SELECT TABLE_NAME, OWNER, TABLESPACE_NAME 
                         FROM ALL_TABLES 
                         ORDER BY TABLE_NAME`, [], opts),

            conn.execute(`SELECT VIEW_NAME, OWNER 
                         FROM ALL_VIEWS 
                         ORDER BY VIEW_NAME`, [], opts),

            conn.execute(`SELECT OBJECT_NAME, OWNER
                          FROM ALL_PROCEDURES
                          WHERE OBJECT_TYPE = 'PROCEDURE'
                          ORDER BY OBJECT_NAME`, [], opts),

            conn.execute(`SELECT OBJECT_NAME, OWNER
                          FROM ALL_PROCEDURES
                          WHERE OBJECT_TYPE = 'FUNCTION'
                          ORDER BY OBJECT_NAME`, [], opts),

            conn.execute(`SELECT OBJECT_NAME, OWNER
                          FROM ALL_PROCEDURES
                          WHERE OBJECT_TYPE = 'PACKAGE'
                          ORDER BY OBJECT_NAME`, [], opts),

            conn.execute(`SELECT SEQUENCE_NAME, SEQUENCE_OWNER AS OWNER
                          FROM ALL_SEQUENCES
                          ORDER BY SEQUENCE_NAME`, [], opts),

            conn.execute(`SELECT TRIGGER_NAME, OWNER, TABLE_NAME 
                         FROM ALL_TRIGGERS 
                         ORDER BY TRIGGER_NAME`, [], opts),

            conn.execute(`SELECT INDEX_NAME, OWNER, TABLE_NAME 
                         FROM ALL_INDEXES 
                         ORDER BY INDEX_NAME`, [], opts),

            conn.execute(`SELECT TABLESPACE_NAME, STATUS
                          FROM DBA_TABLESPACES
                          ORDER BY TABLESPACE_NAME`, [], opts),

            conn.execute(`SELECT USERNAME, ACCOUNT_STATUS, DEFAULT_TABLESPACE
                          FROM DBA_USERS
                          ORDER BY USERNAME`, [], opts)
        ]);

        res.json({
            success: true,
            data: {
                tables:      tables.rows,
                views:       views.rows,
                procedures:  procedures.rows,
                functions:   functions.rows,
                packages:    packages.rows,
                sequences:   sequences.rows,
                triggers:    triggers.rows,
                indexes:     indexes.rows,
                tablespaces: tablespaces.rows,
                users:       users.rows
            }
        });

    } catch (err) {
        console.error('Query fallida:', err);
        res.status(500).json({ success: false, message: err.message });
    }finally {
        if (conn) await conn.close();
    }
});

//todo hacer aprender localStorage para guardar sesiones anteriores.