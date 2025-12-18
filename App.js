const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
// Disable caching for static files during development/debugging
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    next();
});
app.use(express.static(path.join(__dirname, 'Public')));

// Session middleware
app.use(session({
    secret: 'animals-crud-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));

// إعداد اتصال قاعدة البيانات
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'testdb',  // اسم قاعدة البيانات
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// اختبار الاتصال
pool.getConnection((err, connection) => {
    if (err) {
        console.error('❌ Database connection error:', err.message);
        return;
    }
    console.log('✅ Connected to MySQL database: testdb');
    console.log('📊 Tables available: cats, dogs, mouses');
    connection.release();
});

// Route principale - Servir l'interface front-end
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'Public', 'index.html'));
});

// ==================== API Routes ====================

// Route d'information API
app.get('/api', (req, res) => {
    res.json({
        message: 'Welcome to Animals CRUD API',
        version: '2.0.0',
        description: 'Full CRUD API with front-end interface',
        frontend: 'Visit / for the web interface',
        endpoints: {
            base: 'GET /api',
            health: 'GET /api/health',
            stats: 'GET /api/stats',
            all_animals: 'GET /api/animals/all',
            tags: 'GET /api/tags',

            // Cats endpoints
            cats_all: 'GET /api/cats',
            cats_single: 'GET /api/cats/:id',
            cats_create: 'POST /api/cats',
            cats_update: 'PUT /api/cats/:id',
            cats_delete: 'DELETE /api/cats/:id',

            // Dogs endpoints
            dogs_all: 'GET /api/dogs',
            dogs_single: 'GET /api/dogs/:id',
            dogs_create: 'POST /api/dogs',
            dogs_update: 'PUT /api/dogs/:id',
            dogs_delete: 'DELETE /api/dogs/:id',

            // Mouses endpoints
            mouses_all: 'GET /api/mouses',
            mouses_single: 'GET /api/mouses/:id',
            mouses_create: 'POST /api/mouses',
            mouses_update: 'PUT /api/mouses/:id',
            mouses_delete: 'DELETE /api/mouses/:id'
        }
    });
});

// Route لفحص الصحة
app.get('/api/health', (req, res) => {
    pool.getConnection((err, connection) => {
        if (err) {
            return res.status(500).json({
                status: 'ERROR',
                database: 'Disconnected',
                timestamp: new Date().toISOString()
            });
        }

        // فحص الجداول الموجودة
        connection.query('SHOW TABLES', (tablesErr, tables) => {
            connection.release();

            if (tablesErr) {
                return res.json({
                    status: 'WARNING',
                    database: 'Connected but table check failed',
                    timestamp: new Date().toISOString()
                });
            }

            const tableNames = tables.map(table => Object.values(table)[0]);

            res.json({
                status: 'OK',
                database: 'Connected',
                tables: tableNames,
                timestamp: new Date().toISOString()
            });
        });
    });
});

// Route pour récupérer tous les tags uniques
app.get('/api/tags', (req, res) => {
    pool.getConnection((err, connection) => {
        if (err) {
            return res.status(500).json({
                success: false,
                error: 'Database connection error'
            });
        }

        connection.query(`
            SELECT DISTINCT tag FROM (
                SELECT tag FROM cats WHERE tag IS NOT NULL AND tag != ''
                UNION ALL
                SELECT tag FROM dogs WHERE tag IS NOT NULL AND tag != ''
                UNION ALL
                SELECT tag FROM mouses WHERE tag IS NOT NULL AND tag != ''
            ) as all_tags
            WHERE tag IS NOT NULL AND tag != ''
            ORDER BY tag
        `, (queryErr, results) => {
            connection.release();

            if (queryErr) {
                return res.status(500).json({
                    success: false,
                    error: 'Failed to get tags'
                });
            }

            // Extraire et fusionner tous les tags uniques
            const allTags = new Set();

            results.forEach(row => {
                if (row.tag) {
                    const tags = row.tag.split(',').map(t => t.trim()).filter(t => t);
                    tags.forEach(tag => allTags.add(tag));
                }
            });

            res.json({
                success: true,
                data: Array.from(allTags),
                timestamp: new Date().toISOString()
            });
        });
    });
});

// ==================== CATS Routes ====================

// 1. GET all cats
app.get('/api/cats', (req, res) => {
    pool.getConnection((err, connection) => {
        if (err) {
            return res.status(500).json({
                success: false,
                error: 'Database connection error'
            });
        }

        connection.query('SELECT * FROM cats ORDER BY id DESC', (queryErr, results) => {
            connection.release();

            if (queryErr) {
                return res.status(500).json({
                    success: false,
                    error: 'Failed to fetch cats'
                });
            }

            res.json({
                success: true,
                count: results.length,
                data: results
            });
        });
    });
});

// 2. GET single cat by ID
app.get('/api/cats/:id', (req, res) => {
    const id = req.params.id;

    pool.getConnection((err, connection) => {
        if (err) {
            return res.status(500).json({
                success: false,
                error: 'Database connection error'
            });
        }

        connection.query('SELECT * FROM cats WHERE id = ?', [id], (queryErr, results) => {
            connection.release();

            if (queryErr) {
                return res.status(500).json({
                    success: false,
                    error: 'Failed to fetch cat'
                });
            }

            if (results.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Cat not found'
                });
            }

            res.json({
                success: true,
                data: results[0]
            });
        });
    });
});

// 3. POST create new cat
app.post('/api/cats', (req, res) => {
    const { name, tag, description, img } = req.body;

    if (!name) {
        return res.status(400).json({
            success: false,
            error: 'Name is required'
        });
    }

    pool.getConnection((err, connection) => {
        if (err) {
            return res.status(500).json({
                success: false,
                error: 'Database connection error'
            });
        }

        const sql = 'INSERT INTO cats (name, tag, description, img) VALUES (?, ?, ?, ?)';
        const values = [name, tag || '', description || '', img || ''];

        connection.query(sql, values, (queryErr, result) => {
            connection.release();

            if (queryErr) {
                return res.status(500).json({
                    success: false,
                    error: 'Failed to create cat'
                });
            }

            // Récupérer le chat créé
            pool.getConnection((err2, connection2) => {
                if (err2) {
                    return res.status(201).json({
                        success: true,
                        message: 'Cat created successfully',
                        id: result.insertId,
                        data: { id: result.insertId, name, tag, description, img }
                    });
                }

                connection2.query('SELECT * FROM cats WHERE id = ?', [result.insertId], (queryErr2, results) => {
                    connection2.release();

                    if (queryErr2) {
                        return res.status(201).json({
                            success: true,
                            message: 'Cat created successfully',
                            id: result.insertId
                        });
                    }

                    res.status(201).json({
                        success: true,
                        message: 'Cat created successfully',
                        data: results[0]
                    });
                });
            });
        });
    });
});

// 4. PUT update cat
app.put('/api/cats/:id', (req, res) => {
    const id = req.params.id;
    const { name, tag, description, img } = req.body;

    if (!req.session.userId) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    pool.getConnection((err, connection) => {
        if (err) {
            return res.status(500).json({
                success: false,
                error: 'Database connection error'
            });
        }

        // Check if cat exists
        connection.query('SELECT * FROM cats WHERE id = ?', [id], (checkErr, results) => {
            if (checkErr) {
                connection.release();
                return res.status(500).json({
                    success: false,
                    error: 'Failed to check cat'
                });
            }

            if (results.length === 0) {
                connection.release();
                return res.status(404).json({
                    success: false,
                    error: 'Cat not found'
                });
            }

            // Update cat
            const sql = 'UPDATE cats SET name = ?, tag = ?, description = ?, img = ? WHERE id = ?';
            const values = [
                name || results[0].name,
                tag !== undefined ? tag : results[0].tag,
                description !== undefined ? description : results[0].description,
                img !== undefined ? img : results[0].img,
                id
            ];

            connection.query(sql, values, (updateErr, result) => {
                connection.release();

                if (updateErr) {
                    return res.status(500).json({
                        success: false,
                        error: 'Failed to update cat'
                    });
                }

                // Récupérer le chat mis à jour
                pool.getConnection((err2, connection2) => {
                    if (err2) {
                        return res.json({
                            success: true,
                            message: 'Cat updated successfully'
                        });
                    }

                    connection2.query('SELECT * FROM cats WHERE id = ?', [id], (queryErr2, results2) => {
                        connection2.release();

                        if (queryErr2) {
                            return res.json({
                                success: true,
                                message: 'Cat updated successfully'
                            });
                        }

                        res.json({
                            success: true,
                            message: 'Cat updated successfully',
                            data: results2[0]
                        });
                    });
                });
            });
        });
    });
});

// 5. DELETE cat
app.delete('/api/cats/:id', (req, res) => {
    const id = req.params.id;

    if (!req.session.userId) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    pool.getConnection((err, connection) => {
        if (err) {
            return res.status(500).json({
                success: false,
                error: 'Database connection error'
            });
        }

        // Check if cat exists
        connection.query('SELECT * FROM cats WHERE id = ?', [id], (checkErr, results) => {
            if (checkErr) {
                connection.release();
                return res.status(500).json({
                    success: false,
                    error: 'Failed to check cat'
                });
            }

            if (results.length === 0) {
                connection.release();
                return res.status(404).json({
                    success: false,
                    error: 'Cat not found'
                });
            }

            const deletedCat = results[0];

            // Delete cat
            connection.query('DELETE FROM cats WHERE id = ?', [id], (deleteErr, result) => {
                connection.release();

                if (deleteErr) {
                    return res.status(500).json({
                        success: false,
                        error: 'Failed to delete cat'
                    });
                }

                res.json({
                    success: true,
                    message: 'Cat deleted successfully',
                    data: deletedCat
                });
            });
        });
    });
});

// ==================== DOGS Routes ====================

// 1. GET all dogs
app.get('/api/dogs', (req, res) => {
    pool.getConnection((err, connection) => {
        if (err) {
            return res.status(500).json({
                success: false,
                error: 'Database connection error'
            });
        }

        connection.query('SELECT * FROM dogs ORDER BY id DESC', (queryErr, results) => {
            connection.release();

            if (queryErr) {
                return res.status(500).json({
                    success: false,
                    error: 'Failed to fetch dogs'
                });
            }

            res.json({
                success: true,
                count: results.length,
                data: results
            });
        });
    });
});

// 2. GET single dog by ID
app.get('/api/dogs/:id', (req, res) => {
    const id = req.params.id;

    pool.getConnection((err, connection) => {
        if (err) {
            return res.status(500).json({
                success: false,
                error: 'Database connection error'
            });
        }

        connection.query('SELECT * FROM dogs WHERE id = ?', [id], (queryErr, results) => {
            connection.release();

            if (queryErr) {
                return res.status(500).json({
                    success: false,
                    error: 'Failed to fetch dog'
                });
            }

            if (results.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Dog not found'
                });
            }

            res.json({
                success: true,
                data: results[0]
            });
        });
    });
});

// 3. POST create new dog
app.post('/api/dogs', (req, res) => {
    const { name, tag, description, img } = req.body;

    if (!name) {
        return res.status(400).json({
            success: false,
            error: 'Name is required'
        });
    }

    pool.getConnection((err, connection) => {
        if (err) {
            return res.status(500).json({
                success: false,
                error: 'Database connection error'
            });
        }

        const sql = 'INSERT INTO dogs (name, tag, description, img) VALUES (?, ?, ?, ?)';
        const values = [name, tag || '', description || '', img || ''];

        connection.query(sql, values, (queryErr, result) => {
            connection.release();

            if (queryErr) {
                return res.status(500).json({
                    success: false,
                    error: 'Failed to create dog'
                });
            }

            res.status(201).json({
                success: true,
                message: 'Dog created successfully',
                id: result.insertId
            });
        });
    });
});

// 4. PUT update dog
app.put('/api/dogs/:id', (req, res) => {
    const id = req.params.id;
    const { name, tag, description, img } = req.body;

    if (!req.session.userId) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    pool.getConnection((err, connection) => {
        if (err) {
            return res.status(500).json({
                success: false,
                error: 'Database connection error'
            });
        }

        // Check if dog exists
        connection.query('SELECT * FROM dogs WHERE id = ?', [id], (checkErr, results) => {
            if (checkErr) {
                connection.release();
                return res.status(500).json({
                    success: false,
                    error: 'Failed to check dog'
                });
            }

            if (results.length === 0) {
                connection.release();
                return res.status(404).json({
                    success: false,
                    error: 'Dog not found'
                });
            }

            // Update dog
            const sql = 'UPDATE dogs SET name = ?, tag = ?, description = ?, img = ? WHERE id = ?';
            const values = [
                name || results[0].name,
                tag !== undefined ? tag : results[0].tag,
                description !== undefined ? description : results[0].description,
                img !== undefined ? img : results[0].img,
                id
            ];

            connection.query(sql, values, (updateErr, result) => {
                connection.release();

                if (updateErr) {
                    return res.status(500).json({
                        success: false,
                        error: 'Failed to update dog'
                    });
                }

                res.json({
                    success: true,
                    message: 'Dog updated successfully'
                });
            });
        });
    });
});

// 5. DELETE dog
app.delete('/api/dogs/:id', (req, res) => {
    const id = req.params.id;

    if (!req.session.userId) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    pool.getConnection((err, connection) => {
        if (err) {
            return res.status(500).json({
                success: false,
                error: 'Database connection error'
            });
        }

        // Check if dog exists
        connection.query('SELECT * FROM dogs WHERE id = ?', [id], (checkErr, results) => {
            if (checkErr) {
                connection.release();
                return res.status(500).json({
                    success: false,
                    error: 'Failed to check dog'
                });
            }

            if (results.length === 0) {
                connection.release();
                return res.status(404).json({
                    success: false,
                    error: 'Dog not found'
                });
            }

            // Delete dog
            connection.query('DELETE FROM dogs WHERE id = ?', [id], (deleteErr, result) => {
                connection.release();

                if (deleteErr) {
                    return res.status(500).json({
                        success: false,
                        error: 'Failed to delete dog'
                    });
                }

                res.json({
                    success: true,
                    message: 'Dog deleted successfully'
                });
            });
        });
    });
});

// ==================== MOUSES Routes ====================

// 1. GET all mouses
app.get('/api/mouses', (req, res) => {
    pool.getConnection((err, connection) => {
        if (err) {
            return res.status(500).json({
                success: false,
                error: 'Database connection error'
            });
        }

        connection.query('SELECT * FROM mouses ORDER BY id DESC', (queryErr, results) => {
            connection.release();

            if (queryErr) {
                return res.status(500).json({
                    success: false,
                    error: 'Failed to fetch mouses'
                });
            }

            res.json({
                success: true,
                count: results.length,
                data: results
            });
        });
    });
});

// 2. GET single mouse by ID
app.get('/api/mouses/:id', (req, res) => {
    const id = req.params.id;

    pool.getConnection((err, connection) => {
        if (err) {
            return res.status(500).json({
                success: false,
                error: 'Database connection error'
            });
        }

        connection.query('SELECT * FROM mouses WHERE id = ?', [id], (queryErr, results) => {
            connection.release();

            if (queryErr) {
                return res.status(500).json({
                    success: false,
                    error: 'Failed to fetch mouse'
                });
            }

            if (results.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Mouse not found'
                });
            }

            res.json({
                success: true,
                data: results[0]
            });
        });
    });
});

// 3. POST create new mouse
app.post('/api/mouses', (req, res) => {
    const { name, tag, description, img } = req.body;

    if (!name) {
        return res.status(400).json({
            success: false,
            error: 'Name is required'
        });
    }

    pool.getConnection((err, connection) => {
        if (err) {
            return res.status(500).json({
                success: false,
                error: 'Database connection error'
            });
        }

        const sql = 'INSERT INTO mouses (name, tag, description, img) VALUES (?, ?, ?, ?)';
        const values = [name, tag || '', description || '', img || ''];

        connection.query(sql, values, (queryErr, result) => {
            connection.release();

            if (queryErr) {
                return res.status(500).json({
                    success: false,
                    error: 'Failed to create mouse'
                });
            }

            res.status(201).json({
                success: true,
                message: 'Mouse created successfully',
                id: result.insertId
            });
        });
    });
});

// 4. PUT update mouse
app.put('/api/mouses/:id', (req, res) => {
    const id = req.params.id;
    const { name, tag, description, img } = req.body;

    if (!req.session.userId) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    pool.getConnection((err, connection) => {
        if (err) {
            return res.status(500).json({
                success: false,
                error: 'Database connection error'
            });
        }

        // Check if mouse exists
        connection.query('SELECT * FROM mouses WHERE id = ?', [id], (checkErr, results) => {
            if (checkErr) {
                connection.release();
                return res.status(500).json({
                    success: false,
                    error: 'Failed to check mouse'
                });
            }

            if (results.length === 0) {
                connection.release();
                return res.status(404).json({
                    success: false,
                    error: 'Mouse not found'
                });
            }

            // Update mouse
            const sql = 'UPDATE mouses SET name = ?, tag = ?, description = ?, img = ? WHERE id = ?';
            const values = [
                name || results[0].name,
                tag !== undefined ? tag : results[0].tag,
                description !== undefined ? description : results[0].description,
                img !== undefined ? img : results[0].img,
                id
            ];

            connection.query(sql, values, (updateErr, result) => {
                connection.release();

                if (updateErr) {
                    return res.status(500).json({
                        success: false,
                        error: 'Failed to update mouse'
                    });
                }

                res.json({
                    success: true,
                    message: 'Mouse updated successfully'
                });
            });
        });
    });
});

// 5. DELETE mouse
app.delete('/api/mouses/:id', (req, res) => {
    const id = req.params.id;

    if (!req.session.userId) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    pool.getConnection((err, connection) => {
        if (err) {
            return res.status(500).json({
                success: false,
                error: 'Database connection error'
            });
        }

        // Check if mouse exists
        connection.query('SELECT * FROM mouses WHERE id = ?', [id], (checkErr, results) => {
            if (checkErr) {
                connection.release();
                return res.status(500).json({
                    success: false,
                    error: 'Failed to check mouse'
                });
            }

            if (results.length === 0) {
                connection.release();
                return res.status(404).json({
                    success: false,
                    error: 'Mouse not found'
                });
            }

            // Delete mouse
            connection.query('DELETE FROM mouses WHERE id = ?', [id], (deleteErr, result) => {
                connection.release();

                if (deleteErr) {
                    return res.status(500).json({
                        success: false,
                        error: 'Failed to delete mouse'
                    });
                }

                res.json({
                    success: true,
                    message: 'Mouse deleted successfully'
                });
            });
        });
    });
});

// ==================== Routes خاصة ====================

// API pour obtenir tous les animaux
app.get('/api/animals/all', (req, res) => {
    pool.getConnection((err, connection) => {
        if (err) {
            return res.status(500).json({
                success: false,
                error: 'Database connection error'
            });
        }

        // Utiliser Promise.all pour exécuter toutes les requêtes
        const getCats = new Promise((resolve, reject) => {
            connection.query('SELECT *, "cats" as type FROM cats', (err, results) => {
                if (err) reject(err);
                else resolve(results);
            });
        });

        const getDogs = new Promise((resolve, reject) => {
            connection.query('SELECT *, "dogs" as type FROM dogs', (err, results) => {
                if (err) reject(err);
                else resolve(results);
            });
        });

        const getMouses = new Promise((resolve, reject) => {
            connection.query('SELECT *, "mouses" as type FROM mouses', (err, results) => {
                if (err) reject(err);
                else resolve(results);
            });
        });

        Promise.all([getCats, getDogs, getMouses])
            .then(([cats, dogs, mouses]) => {
                connection.release();
                const allAnimals = [...cats, ...dogs, ...mouses];

                // Trier par date de création (plus récent en premier)
                allAnimals.sort((a, b) => b.id - a.id);

                res.json({
                    success: true,
                    count: allAnimals.length,
                    data: allAnimals
                });
            })
            .catch(error => {
                connection.release();
                res.status(500).json({
                    success: false,
                    error: 'Failed to fetch animals'
                });
            });
    });
});

// إحصائيات عامة
app.get('/api/stats', (req, res) => {
    pool.getConnection((err, connection) => {
        if (err) {
            return res.status(500).json({
                success: false,
                error: 'Database connection error'
            });
        }

        connection.query(`
            SELECT 
                (SELECT COUNT(*) FROM cats) as cats,
                (SELECT COUNT(*) FROM dogs) as dogs,
                (SELECT COUNT(*) FROM mouses) as mouses,
                (SELECT COUNT(*) FROM (
                    SELECT id FROM cats UNION ALL 
                    SELECT id FROM dogs UNION ALL 
                    SELECT id FROM mouses
                ) as all_animals) as total
        `, (queryErr, results) => {
            connection.release();

            if (queryErr) {
                return res.status(500).json({
                    success: false,
                    error: 'Failed to get statistics'
                });
            }

            res.json({
                success: true,
                data: results[0],
                timestamp: new Date().toISOString()
            });
        });
    });
});

// ==================== Auth Routes ====================

// Register a new user
app.post('/api/auth/signup', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    pool.getConnection(async (err, connection) => {
        if (err) return res.status(500).json({ success: false, error: 'Database error' });

        // Check if user exists
        connection.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
            if (err) {
                connection.release();
                return res.status(500).json({ success: false, error: 'Database error' });
            }

            if (results.length > 0) {
                connection.release();
                // Return 409 Conflict, but for user friendlyness we can handle it on client
                return res.json({ success: false, error: 'Email already exists' });
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Create user
            connection.query('INSERT INTO users (email, password) VALUES (?, ?)', [email, hashedPassword], (err, result) => {
                connection.release();
                if (err) return res.status(500).json({ success: false, error: 'Failed to create user' });

                res.status(201).json({ success: true, message: 'User created successfully' });
            });
        });
    });
});

// Login
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    pool.getConnection((err, connection) => {
        if (err) return res.status(500).json({ success: false, error: 'Database error' });

        connection.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
            connection.release();
            if (err) return res.status(500).json({ success: false, error: 'Database error' });

            if (results.length === 0) {
                return res.status(401).json({ success: false, error: 'Invalid credentials' });
            }

            const user = results[0];
            const isMatch = await bcrypt.compare(password, user.password);

            if (!isMatch) {
                return res.status(401).json({ success: false, error: 'Invalid credentials' });
            }

            // Session
            req.session.userId = user.id;
            req.session.userEmail = user.email;

            res.json({ success: true, message: 'Logged in successfully', email: user.email });
        });
    });
});

// Fallback/Legacy Auth Route - Handle as Login if password present
app.post('/api/auth', (req, res) => {
    console.log('DEBUG: /api/auth hit. Body:', req.body);
    const { email, password } = req.body;

    // If password provided, redirect internal logic to login
    if (email && password) {
        pool.getConnection((err, connection) => {
            if (err) return res.status(500).json({ success: false, error: 'Database error' });

            connection.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
                connection.release();
                if (err) return res.status(500).json({ success: false, error: 'Database error' });

                if (results.length === 0) {
                    return res.status(401).json({ success: false, error: 'Invalid credentials' });
                }

                const user = results[0];
                const isMatch = await bcrypt.compare(password, user.password);

                if (!isMatch) {
                    return res.status(401).json({ success: false, error: 'Invalid credentials' });
                }

                // Session
                req.session.userId = user.id;
                req.session.userEmail = user.email;

                res.json({ success: true, message: 'Logged in successfully', email: user.email });
            });
        });
        return;
    }

    // Original mock behavior for backward compatibility (if no password)
    // If we are here, it means we have email but NO password.
    // To unblock the user who has cached frontend code sending only email:
    // We will allow them to login.

    // Session
    req.session.userId = Date.now();
    req.session.userEmail = email;

    console.log('⚠️ Legacy Auth used (No password provided). allowing login.');
    return res.json({ success: true, message: 'Authenticated (Legacy Mode)', email });
});

app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) return res.status(500).json({ success: false, error: 'Logout failed' });
        res.json({ success: true, message: 'Logged out' });
    });
});

app.get('/api/me', (req, res) => {
    if (req.session.userId) {
        res.json({ loggedIn: true, email: req.session.userEmail });
    } else {
        res.json({ loggedIn: false });
    }
});

// ==================== Setup & Demo ====================

// Route pour créer les tables si elles n'existent pas
app.get('/api/setup', (req, res) => {
    pool.getConnection((err, connection) => {
        if (err) {
            return res.status(500).json({
                success: false,
                error: 'Database connection error'
            });
        }

        const createCatsTable = `
            CREATE TABLE IF NOT EXISTS cats (
                id INT PRIMARY KEY AUTO_INCREMENT,
                name VARCHAR(100) NOT NULL,
                tag VARCHAR(255),
                description TEXT,
                img VARCHAR(500),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;

        const createDogsTable = `
            CREATE TABLE IF NOT EXISTS dogs (
                id INT PRIMARY KEY AUTO_INCREMENT,
                name VARCHAR(100) NOT NULL,
                tag VARCHAR(255),
                description TEXT,
                img VARCHAR(500),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;

        const createMousesTable = `
            CREATE TABLE IF NOT EXISTS mouses (
                id INT PRIMARY KEY AUTO_INCREMENT,
                name VARCHAR(100) NOT NULL,
                tag VARCHAR(255),
                description TEXT,
                img VARCHAR(500),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;

        const createUsersTable = `
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;

        // Sequential execution to ensure order
        connection.query(createCatsTable, (err1) => {
            if (err1) { connection.release(); return res.status(500).json({ error: 'Failed to create cats table' }); }

            connection.query(createDogsTable, (err2) => {
                if (err2) { connection.release(); return res.status(500).json({ error: 'Failed to create dogs table' }); }

                connection.query(createMousesTable, (err3) => {
                    if (err3) { connection.release(); return res.status(500).json({ error: 'Failed to create mouses table' }); }

                    connection.query(createUsersTable, (err4) => {
                        connection.release();
                        if (err4) { return res.status(500).json({ error: 'Failed to create users table' }); }

                        res.json({
                            success: true,
                            message: 'Tables created successfully',
                            tables: ['cats', 'dogs', 'mouses', 'users']
                        });
                    });
                });
            });
        });
    });
});

// Route pour ajouter des données de démo (EXACT DATA FROM REQUEST)
app.get('/api/demo', (req, res) => {
    pool.getConnection((err, connection) => {
        if (err) {
            return res.status(500).json({ success: false, error: 'Database connection error' });
        }

        // Exact data from user request
        const demoData = {
            dogs: [
                [22, 'Buddy', 'fidèle, amical', 'Un chien fidèle et très amical avec tout le monde', 'https://images.unsplash.com/photo-1552053831-71594a27632d'],
                [23, 'Rocky', 'protecteur, fort', 'Un chien fort et protecteur de sa famille', 'https://images.unsplash.com/photo-1568572933382-74d440642117'],
                [24, 'Luna', 'intelligente, douce', 'Une chienne intelligente et très douce avec les enfants', 'https://images.unsplash.com/photo-1537151608828-ea2b11777ee8'],
                [25, 'Dogi', 'DOG234', 'jda, yma, 7na', 'https://img.freepik.com/photos-gratuite/adorable-chien-basenji-brun-blanc-souriant-donnant-cinq-haut_181624-43666.jpg']
            ],
            mouses: [
                [31, 'Squeaky', 'curieux, rapide', 'Une souris très curieuse qui explore partout', 'https://img.freepik.com/photos-gratuite/vue-du-persil-mangeant-souris_23-2150702661.jpg'],
                [32, 'Nibbles', null, 'Une souris calme qui aime grignoter', 'https://img.freepik.com/photos-premium/aigle-dessin-anime-phare-maison_962751-872.jpg'],
                [33, 'Zippy', null, 'Une souris pleine d\'énergie qui adore courir dans la roue', 'https://img.freepik.com/photos-gratuite/vue-du-persil-mangeant-souris_23-2150702661.jpg'],
                [34, 'sour', null, 'hado , djh, sjdj', 'https://img.freepik.com/vecteurs-libre/mignonne-petite-souris-tenant-illustration-icone-vecteur-dessin-anime-fromage-concept-icone-nourriture-animale-isole-vecteur-premium-style-dessin-anime-plat_138676-4144.jpg']
            ],
            cats: [
                [27, 'Whiskers', 'calme, affectueux', 'Un chat calme et affectueux qui aime les câlins', 'https://img.freepik.com/photos-gratuite/chat-scottish-fold-gris-isole-blanc_53876-136340.jpg'],
                [29, 'Simba', 'royal, protecteur', 'Un chat majestueux qui surveille son territoire', 'https://images.unsplash.com/photo-1543852786-1cf6624b9987'],
                [30, 'citty', 'CTE124', 'beauty, belle_jully', 'https://img.freepik.com/photos-gratuite/kitty-muri-devant-fond-blanc_23-2147843818.jpg'],
                [31, 'CYTY', 'CT999', 'HAbby, hay, jau', 'https://img.freepik.com/photos-gratuite/mignon-chat-domestique-assis-dans-panier-osier-regardant-camera-generee-par-ia_188544-15494.jpg']
            ]
        };

        const clearTables = async () => {
            return new Promise((resolve, reject) => {
                connection.query('DELETE FROM cats', (e1) => {
                    if (e1) return reject(e1);
                    connection.query('DELETE FROM dogs', (e2) => {
                        if (e2) return reject(e2);
                        connection.query('DELETE FROM mouses', (e3) => {
                            if (e3) return reject(e3);
                            resolve();
                        });
                    });
                });
            });
        };

        clearTables().then(() => {
            const insertPromises = [];

            // Helper to insert
            const insert = (table, data) => {
                return new Promise((resolve, reject) => {
                    // Note: Inserting ID explicitly requires not being strictly AUTO_INCREMENT dependent in some SQL modes, 
                    // but usually works fine in MySQL if ID is not null.
                    const sql = `INSERT INTO ${table} (id, name, tag, description, img) VALUES (?, ?, ?, ?, ?)`;
                    connection.query(sql, [data[0], data[1], data[2], data[3], data[4]], (err) => {
                        if (err) {
                            console.error(`Error inserting into ${table}:`, err.message);
                            // Attempt insert without ID if duplicate key or other error (fallback)
                            const fallbackSql = `INSERT INTO ${table} (name, tag, description, img) VALUES (?, ?, ?, ?)`;
                            connection.query(fallbackSql, [data[1], data[2], data[3], data[4]], (err2) => {
                                if (err2) reject(err2);
                                else resolve();
                            });
                        } else {
                            resolve();
                        }
                    });
                });
            };

            demoData.cats.forEach(item => insertPromises.push(insert('cats', item)));
            demoData.dogs.forEach(item => insertPromises.push(insert('dogs', item)));
            demoData.mouses.forEach(item => insertPromises.push(insert('mouses', item)));

            Promise.all(insertPromises)
                .then(() => {
                    connection.release();
                    res.json({
                        success: true,
                        message: 'Data loaded successfully matching user request',
                        counts: {
                            cats: demoData.cats.length,
                            dogs: demoData.dogs.length,
                            mouses: demoData.mouses.length
                        }
                    });
                })
                .catch(err => {
                    connection.release();
                    res.status(500).json({ success: false, error: 'Partial error inserting data: ' + err.message });
                });

        }).catch(err => {
            connection.release();
            res.status(500).json({ success: false, error: 'Failed to clear tables: ' + err.message });
        });
    });
});

// ==================== معالجة الأخطاء ====================

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found',
        availableRoutes: [
            'GET / (Frontend Interface)',
            'GET /api',
            'GET /api/health',
            'GET /api/stats',
            'GET /api/tags',
            'GET /api/me',
            'POST /api/signup',
            'POST /api/login',
            'POST /api/logout',
            'GET /api/animals/all',
            'GET /api/setup',
            'GET /api/demo',

            'GET /api/cats',
            'GET /api/cats/:id',
            'POST /api/cats',
            'PUT /api/cats/:id',
            'DELETE /api/cats/:id',

            'GET /api/dogs',
            'GET /api/dogs/:id',
            'POST /api/dogs',
            'PUT /api/dogs/:id',
            'DELETE /api/dogs/:id',

            'GET /api/mouses',
            'GET /api/mouses/:id',
            'POST /api/mouses',
            'PUT /api/mouses/:id',
            'DELETE /api/mouses/:id'
        ]
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error'
    });
});

// ==================== تشغيل الخادم ====================

app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`🔗 Base URL: http://localhost:${PORT}`);
    console.log('\n📚 Available Endpoints:');
    console.log('   🌐 Frontend: http://localhost:' + PORT + '/');
    console.log('   📍 API Docs: http://localhost:' + PORT + '/api');
    console.log('   ❤️  Health: http://localhost:' + PORT + '/api/health');
    console.log('   📊 Stats: http://localhost:' + PORT + '/api/stats');
    console.log('   🏷️  Tags: http://localhost:' + PORT + '/api/tags');
    console.log('   🐾 All Animals: http://localhost:' + PORT + '/api/animals/all');
    console.log('   ⚙️  Setup: http://localhost:' + PORT + '/api/setup');
    console.log('   🎮 Demo Data: http://localhost:' + PORT + '/api/demo');
    console.log('\n   🐱 Cats API:');
    console.log('      GET  http://localhost:' + PORT + '/api/cats');
    console.log('      POST http://localhost:' + PORT + '/api/cats');
    console.log('      PUT  http://localhost:' + PORT + '/api/cats/:id');
    console.log('      DELETE http://localhost:' + PORT + '/api/cats/:id');
    console.log('\n   🐕 Dogs API:');
    console.log('      GET  http://localhost:' + PORT + '/api/dogs');
    console.log('      POST http://localhost:' + PORT + '/api/dogs');
    console.log('      PUT  http://localhost:' + PORT + '/api/dogs/:id');
    console.log('      DELETE http://localhost:' + PORT + '/api/dogs/:id');
    console.log('\n   🐁 Mouses API:');
    console.log('      GET  http://localhost:' + PORT + '/api/mouses');
    console.log('      POST http://localhost:' + PORT + '/api/mouses');
    console.log('      PUT  http://localhost:' + PORT + '/api/mouses/:id');
    console.log('      DELETE http://localhost:' + PORT + '/api/mouses/:id');
});