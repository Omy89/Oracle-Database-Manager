const oracledb = require('oracledb');

async function getConnection(user, password, host, port, service) {
    return await oracledb.getConnection({
        user,
        password,
        connectString: host + ':' + port + '/' + service
    });
}

module.exports = { getConnection };