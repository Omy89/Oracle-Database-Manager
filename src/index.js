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


app.post('/api/objects', async (req, res) => {
    const { user, password, host, port, service } = req.body;
    let conn;
    try {
        conn = await getConnection(user, password, host, port, service);

        const opts = { outFormat: oracledb.OUT_FORMAT_OBJECT };

        const [tables, views, procedures,
            functions, packages,
            sequences, triggers, indexes,
            tablespaces, users]
            = await Promise.all([

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
    } finally {
        if (conn) await conn.close();
    }
});

app.post('/api/sql', async (req, res) => {
    const { user, password, host, port, service, sql } = req.body;

    if (!sql || !sql.trim()) {
        return res.status(400).json({ success: false, message: 'No se proporciono ninguna sentencia SQL.' });
    }

    let conn;
    try {
        conn = await getConnection(user, password, host, port, service);
        const opts = { outFormat: oracledb.OUT_FORMAT_OBJECT };

        const statements = sql
            .split(/;\s*\n|;\s*$/)
            .map(s => s.trim())
            .filter(s => s.length > 0);

        const results = [];

        for (const stmt of statements) {
            const upper = stmt.toUpperCase().trimStart();
            const isSelect = upper.startsWith('SELECT') || upper.startsWith('WITH');

            if (isSelect) {
                const result = await conn.execute(stmt, [], opts);
                results.push({
                    type: 'select',
                    columns: result.metaData.map(m => m.name),
                    rows: result.rows,
                    rowCount: result.rows.length,
                    statement: stmt.length > 80 ? stmt.substring(0, 80) + '...' : stmt
                });
            } else {
                // DDL / DML necesita autoCommit
                const result = await conn.execute(stmt, [], { autoCommit: true });
                results.push({
                    type: 'ddl_dml',
                    rowsAffected: result.rowsAffected ?? 0,
                    statement: stmt.length > 80 ? stmt.substring(0, 80) + '...' : stmt
                });
            }
        }

        res.json({ success: true, results });

    } catch (err) {
        console.error('SQL error:', err);
        res.status(500).json({ success: false, message: err.message });
    } finally {
        if (conn) await conn.close();
    }
});

function long_opts(long_columns) {
    return {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
        fetchTypeHandler: (meta) => {
            if (long_columns.includes(meta.name)) {
                return { type: oracledb.DB_TYPE_VARCHAR };
            }
        }
    };
}

app.post('/api/ddl', async (req, res) => {
    const { user, password, host, port, service, type, name, owner } = req.body;
    let conn;
    try {
        conn = await getConnection(user, password, host, port, service);
        const opts = { outFormat: oracledb.OUT_FORMAT_OBJECT };
        let ddl = '';

        switch (type.toUpperCase()) {

            case 'TABLE': {
                const cols = await conn.execute(
                    `SELECT COLUMN_NAME, DATA_TYPE, DATA_LENGTH, DATA_PRECISION, DATA_SCALE,
                            NULLABLE, DATA_DEFAULT
                     FROM ALL_TAB_COLUMNS
                     WHERE TABLE_NAME = :name AND OWNER = :owner
                     ORDER BY COLUMN_ID`,
                    { name, owner },
                    long_opts(['DATA_DEFAULT'])
                );

                const cons = await conn.execute(
                    `SELECT ac.CONSTRAINT_NAME, ac.CONSTRAINT_TYPE,
                            ac.R_OWNER, ac.R_CONSTRAINT_NAME,
                            LISTAGG(acc.COLUMN_NAME, ', ') WITHIN GROUP (ORDER BY acc.POSITION) AS COLUMNS
                     FROM ALL_CONSTRAINTS ac
                     INNER JOIN ALL_CONS_COLUMNS acc
                     ON ac.CONSTRAINT_NAME = acc.CONSTRAINT_NAME AND ac.OWNER = acc.OWNER
                     WHERE ac.TABLE_NAME = :name AND ac.OWNER = :owner
                       AND ac.CONSTRAINT_TYPE IN ('P','U','R')
                     GROUP BY ac.CONSTRAINT_NAME, ac.CONSTRAINT_TYPE,
                         ac.R_OWNER, ac.R_CONSTRAINT_NAME`,
                    { name, owner }, opts
                );

                const checks = await conn.execute(
                    `SELECT CONSTRAINT_NAME, SEARCH_CONDITION
                     FROM ALL_CONSTRAINTS
                     WHERE TABLE_NAME = :name AND OWNER = :owner
                       AND CONSTRAINT_TYPE = 'C'
                       AND CONSTRAINT_NAME NOT LIKE 'SYS_%'`,
                    { name, owner },
                    long_opts(['SEARCH_CONDITION'])
                );

                const col_defs = cols.rows.map(c => {
                    let type_str = c.DATA_TYPE;
                    if (['VARCHAR2','CHAR','NVARCHAR2','NCHAR'].includes(c.DATA_TYPE))
                        type_str += `(${c.DATA_LENGTH})`;
                    else if (c.DATA_TYPE === 'NUMBER' && c.DATA_PRECISION != null)
                        type_str += `(${c.DATA_PRECISION}${c.DATA_SCALE ? ',' + c.DATA_SCALE : ''})`;

                    const nullable  = c.NULLABLE === 'N' ? ' NOT NULL' : '';
                    const default_v = c.DATA_DEFAULT ? ` DEFAULT ${String(c.DATA_DEFAULT).trim()}` : '';
                    return `    ${c.COLUMN_NAME} ${type_str}${default_v}${nullable}`;
                });

                const con_defs = [
                    ...cons.rows.map(c => {
                        if (c.CONSTRAINT_TYPE === 'P')
                            return `    CONSTRAINT ${c.CONSTRAINT_NAME} PRIMARY KEY (${c.COLUMNS})`;
                        if (c.CONSTRAINT_TYPE === 'U')
                            return `    CONSTRAINT ${c.CONSTRAINT_NAME} UNIQUE (${c.COLUMNS})`;
                        if (c.CONSTRAINT_TYPE === 'R')
                            return `    CONSTRAINT ${c.CONSTRAINT_NAME} FOREIGN KEY (${c.COLUMNS}) REFERENCES ${c.R_OWNER}.${c.R_CONSTRAINT_NAME}`;
                        return null;
                    }),
                    ...checks.rows.map(c =>
                        `    CONSTRAINT ${c.CONSTRAINT_NAME} CHECK (${c.SEARCH_CONDITION})`
                    )
                ].filter(Boolean);

                const all_defs = [...col_defs, ...con_defs].join(',\n');
                ddl = `CREATE TABLE ${owner}.${name} (\n${all_defs}\n);`;
                break;
            }

            case 'VIEW': {
                const result = await conn.execute(
                    `SELECT TEXT FROM ALL_VIEWS WHERE VIEW_NAME = :name AND OWNER = :owner`,
                    { name, owner },
                    long_opts(['TEXT'])
                );
                const text = result.rows[0]?.TEXT || '-- texto no disponible';
                ddl = `CREATE OR REPLACE VIEW ${owner}.${name} AS\n${text};`;
                break;
            }

            case 'PROCEDURE':
            case 'FUNCTION':
            case 'PACKAGE':
            case 'PACKAGE BODY': {
                const result = await conn.execute(
                    `SELECT TEXT FROM ALL_SOURCE
                     WHERE NAME = :name AND OWNER = :owner AND TYPE = :type
                     ORDER BY LINE`,
                    { name, owner, type: type.toUpperCase() }, opts
                );
                const src = result.rows.map(r => r.TEXT).join('');
                ddl = `CREATE OR REPLACE ${src.trim()};`;
                break;
            }

            case 'TRIGGER': {
                // TRIGGER_BODY es LONG — usar fetchTypeHandler
                const result = await conn.execute(
                    `SELECT TRIGGER_TYPE, TRIGGERING_EVENT, TABLE_OWNER, TABLE_NAME,
                            TRIGGER_BODY, STATUS
                     FROM ALL_TRIGGERS
                     WHERE TRIGGER_NAME = :name AND OWNER = :owner`,
                    { name, owner },
                    long_opts(['TRIGGER_BODY'])
                );
                if (result.rows.length === 0) { ddl = '-- Trigger no encontrado'; break; }
                const t = result.rows[0];
                ddl = `CREATE OR REPLACE TRIGGER ${owner}.${name}
${t.TRIGGER_TYPE} ${t.TRIGGERING_EVENT}
ON ${t.TABLE_OWNER}.${t.TABLE_NAME}
${t.TRIGGER_BODY}
/`;
                break;
            }

            case 'INDEX': {
                const result = await conn.execute(
                    `SELECT ai.INDEX_TYPE, ai.UNIQUENESS, ai.TABLE_OWNER, ai.TABLE_NAME,
                            LISTAGG(aic.COLUMN_NAME, ', ') WITHIN GROUP (ORDER BY aic.COLUMN_POSITION) AS COLUMNS
                     FROM ALL_INDEXES ai
                     INNER JOIN ALL_IND_COLUMNS aic
                     ON ai.INDEX_NAME = aic.INDEX_NAME AND ai.OWNER = aic.INDEX_OWNER
                     WHERE ai.INDEX_NAME = :name AND ai.OWNER = :owner
                     GROUP BY ai.INDEX_TYPE, ai.UNIQUENESS, ai.TABLE_OWNER, ai.TABLE_NAME`,
                    { name, owner }, opts
                );
                if (result.rows.length === 0) { ddl = '-- Indice no encontrado'; break; }
                const idx = result.rows[0];
                const uniq = idx.UNIQUENESS === 'UNIQUE' ? 'UNIQUE ' : '';
                ddl = `CREATE ${uniq}INDEX ${owner}.${name}
                ON ${idx.TABLE_OWNER}.${idx.TABLE_NAME} (${idx.COLUMNS});`;
                break;
            }

            case 'SEQUENCE': {
                const result = await conn.execute(
                    `SELECT MIN_VALUE, MAX_VALUE, INCREMENT_BY, CYCLE_FLAG,
                            ORDER_FLAG, CACHE_SIZE, LAST_NUMBER
                     FROM ALL_SEQUENCES
                     WHERE SEQUENCE_NAME = :name AND SEQUENCE_OWNER = :owner`,
                    { name, owner }, opts
                );
                if (result.rows.length === 0) { ddl = '-- Secuencia no encontrada'; break; }
                const s = result.rows[0];
                ddl = `CREATE SEQUENCE ${owner}.${name}
    START WITH ${s.LAST_NUMBER}
    INCREMENT BY ${s.INCREMENT_BY}
    MINVALUE ${s.MIN_VALUE}
    MAXVALUE ${s.MAX_VALUE}
    ${s.CYCLE_FLAG === 'Y' ? 'CYCLE' : 'NOCYCLE'}
    ${s.CACHE_SIZE > 0 ? 'CACHE ' + s.CACHE_SIZE : 'NOCACHE'}
    ${s.ORDER_FLAG === 'Y' ? 'ORDER' : 'NOORDER'};`;
                break;
            }

            default:
                ddl = `-- DDL no disponible para tipo: ${type}`;
        }

        res.json({ success: true, ddl });

    } catch (err) {
        console.error('DDL error:', err);
        res.status(500).json({ success: false, message: err.message });
    } finally {
        if (conn) await conn.close();
    }
});

app.post('/api/create-table', async (req, res) => {
    const { user, password, host, port, service, tableName, columns, primaryKey } = req.body;
    let conn;
    try {
        conn = await getConnection(user, password, host, port, service);

        const col_defs = columns.map(c => {
            let def = `${c.name} ${c.type}`;
            if (c.length && ['VARCHAR2','CHAR','NVARCHAR2'].includes(c.type.toUpperCase()))
                def += `(${c.length})`;
            if (c.length && c.type.toUpperCase() === 'NUMBER')
                def += `(${c.length}${c.scale ? ',' + c.scale : ''})`;
            if (c.default) def += ` DEFAULT ${c.default}`;
            if (!c.nullable) def += ' NOT NULL';
            return `    ${def}`;
        });

        if (primaryKey && primaryKey.length > 0)
            col_defs.push(`    CONSTRAINT PK_${tableName} PRIMARY KEY (${primaryKey.join(', ')})`);

        const sql = `CREATE TABLE ${tableName} (\n${col_defs.join(',\n')}\n)`;
        await conn.execute(sql, [], { autoCommit: true });

        res.json({ success: true, sql });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    } finally {
        if (conn) await conn.close();
    }
});

app.post('/api/create-view', async (req, res) => {
    const { user, password, host, port, service, viewName, selectSql, orReplace } = req.body;
    let conn;
    try {
        conn = await getConnection(user, password, host, port, service);
        const keyword = orReplace ? 'CREATE OR REPLACE VIEW' : 'CREATE VIEW';
        const sql = `${keyword} ${viewName} AS ${selectSql}`;
        await conn.execute(sql, [], { autoCommit: true });
        res.json({ success: true, sql });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    } finally {
        if (conn) await conn.close();
    }
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
