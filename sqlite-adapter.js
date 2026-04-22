const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class SQLitePool {
    constructor() {
        this.db = new sqlite3.Database(path.join(__dirname, 'database.sqlite'), (err) => {
            if (err) {
                console.error('❌ SQLite connection error:', err.message);
            } else {
                console.log('✅ Connected to SQLite database');
            }
        });
    }

    // Mock mysql2 pool interface
    getConnection(callback) {
        // Return a mock connection object
        const connection = {
            query: (sql, params, queryCallback) => {
                if (typeof params === 'function') {
                    queryCallback = params;
                    params = [];
                }
                
                // Handle MySQL specific syntax ??
                // This is a very basic replacement for table names
                let processedSql = sql;
                let remainingParams = [...(params || [])];
                
                while (processedSql.includes('??') && remainingParams.length > 0) {
                    const param = remainingParams.shift();
                    processedSql = processedSql.replace('??', param);
                }
                
                // SQLite uses ? for placeholders, which is the same as MySQL
                if (processedSql.trim().toUpperCase().startsWith('SELECT') || 
                    processedSql.trim().toUpperCase().startsWith('SHOW')) {
                    this.db.all(processedSql, remainingParams, (err, rows) => {
                        queryCallback(err, rows);
                    });
                } else {
                    this.db.run(processedSql, remainingParams, function(err) {
                        // MySQL result for INSERT has insertId and affectedRows
                        const result = {
                            insertId: this.lastID,
                            affectedRows: this.changes
                        };
                        queryCallback(err, result);
                    });
                }
            },
            release: () => {},
            promise: () => {
                const promisedConn = {
                    query: (sql, params) => {
                        return new Promise((resolve, reject) => {
                            connection.query(sql, params, (err, results) => {
                                if (err) reject(err);
                                else resolve([results]);
                            });
                        });
                    },
                    release: () => connection.release(),
                    getConnection: async () => {
                        return promisedConn;
                    }
                };
                return promisedConn;
            }
        };
        connection.release = () => {};
        callback(null, connection);
    }

    promise() {
        return {
            query: (sql, params) => {
                return new Promise((resolve, reject) => {
                    this.getConnection((err, connection) => {
                        if (err) return reject(err);
                        connection.query(sql, params, (err, results) => {
                            if (err) reject(err);
                            else resolve([results]);
                        });
                    });
                });
            },
            getConnection: async () => {
                return new Promise((resolve, reject) => {
                    this.getConnection((err, connection) => {
                        if (err) reject(err);
                        else resolve(connection.promise());
                    });
                });
            }
        };
    }
}

module.exports = new SQLitePool();
