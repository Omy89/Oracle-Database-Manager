const { getConnection } = require('./db/connection');
const express = require('express');
const cors = require('cors');
require('dotenv').config();

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