const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const validator = require('validator');
const bcrypt = require('bcrypt'); // Added bcrypt for password hashing
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// ========== DATABASE CONNECTION ==========
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DATABASE || 'testdb',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test connection
pool.getConnection((err, connection) => {
    if (err) {
        console.error('❌ Database connection error:', err.message);
        return;
    }
    console.log('✅ Connected to MySQL database: testdb');
    connection.release();
});

// ========== MIDDLEWARE ==========
app.use(cors({
    origin: true,
    credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Session configuration
const sessionStore = new MySQLStore({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DATABASE || 'testdb',
    port: process.env.DB_PORT || 3306,
    createDatabaseTable: true,
    schema: {
        tableName: 'sessions'
    }
}, pool);

// Session middleware
app.use(session({
    secret: 'your-secret-key-here',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        httpOnly: true,
        secure: false, // Set to true in production with HTTPS
        sameSite: 'lax'
    }
}));

// Cache control
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    next();
});

// Serve static files from Public directory
app.use(express.static(path.join(__dirname, 'Public'), { 
    index: false,
    setHeaders: (res, path) => {
        // Set proper content type for HTML files
        if (path.endsWith('.html')) {
            res.setHeader('Content-Type', 'text/html');
        }
    }
}));

// Root route - redirect to login if not authenticated
app.get('/', (req, res) => {
    if (req.session && req.session.userId) {
        return res.redirect('/index.html');
    }
    return res.redirect('/login.html');
});

// Explicit route for login page
app.get('/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'Public', 'login.html'));
});

// ========== AUTHENTICATION MIDDLEWARE ==========
const requireAuth = (req, res, next) => {
    if (req.session.userId) {
        return next();
    }
    
    // Only redirect if not already on login page or API auth endpoints
    if (req.path === '/login.html' || req.path.startsWith('/api/auth/') || req.path === '/api/me') {
        return next();
    }
    
    res.redirect('/login.html');
};

// Apply authentication middleware to HTML pages and specific API routes that require auth
app.use((req, res, next) => {
    // Apply auth to HTML files (except login.html)
    if (req.path.endsWith('.html') && req.path !== '/login.html') {
        requireAuth(req, res, next);
    } 
    // Apply auth to API routes that require authentication
    else if (req.path.startsWith('/api/') && 
             !req.path.startsWith('/api/auth/') && 
             req.path !== '/api/me' &&
             req.path !== '/api/animals/all' &&
             req.path !== '/api/stats' &&
             req.path !== '/api/tags' &&
             !req.path.startsWith('/api/cats') &&
             !req.path.startsWith('/api/dogs') &&
             !req.path.startsWith('/api/mouses') &&
             req.path !== '/api/health' &&
             req.path !== '/api/setup' &&
             req.path !== '/api/demo' &&
             req.path !== '/api/adopt/my-requests') {
        requireAuth(req, res, next);
    } else {
        return next();
    }
});

// ========== CREATE REQUIRED ROUTES FILES ==========
// Create auth.js in routes folder if it doesn't exist
const routesDir = path.join(__dirname, 'routes');

if (!fs.existsSync(routesDir)) {
    fs.mkdirSync(routesDir);
}

// Create basic auth.js file
const authRouteContent = `module.exports = (app, pool) => {
    // Auth routes
    app.post('/api/signup', async (req, res) => {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ success: false, error: 'Email and password required' });
        }
        
        if (!validator.isEmail(email)) {
            return res.status(400).json({ success: false, error: 'Invalid email' });
        }
        
        try {
            // Check if user exists
            const [existing] = await pool.promise().query('SELECT * FROM users WHERE email = ?', [email]);
            
            if (existing.length > 0) {
                return res.status(400).json({ success: false, error: 'User already exists' });
            }
            
            // Hash the password before storing it
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(password, saltRounds);
            
            // Insert new user with hashed password
            await pool.promise().query(
                'INSERT INTO users (email, password) VALUES (?, ?)',
                [email, hashedPassword]
            );
            
            req.session.userId = email;
            
            res.json({
                success: true,
                message: 'Signup successful',
                user: { email }
            });
        } catch (error) {
            console.error('Signup error:', error);
            res.status(500).json({ success: false, error: 'Server error' });
        }
    });
    
    app.post('/api/login', async (req, res) => {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ success: false, error: 'Email and password required' });
        }
        
        try {
            const [users] = await pool.promise().query(
                'SELECT * FROM users WHERE email = ?',
                [email]
            );
            
            if (users.length === 0) {
                return res.status(401).json({ success: false, error: 'Invalid credentials' });
            }
            
            // Compare the provided password with the hashed password in the database
            const isMatch = await bcrypt.compare(password, users[0].password);
            
            if (!isMatch) {
                return res.status(401).json({ success: false, error: 'Invalid credentials' });
            }
            
            req.session.userId = email;
            
            res.json({
                success: true,
                message: 'Login successful',
                user: { email }
            });
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ success: false, error: 'Server error' });
        }
    });
    
    app.post('/api/logout', (req, res) => {
        req.session.destroy(err => {
            if (err) {
                return res.status(500).json({ success: false, error: 'Logout failed' });
            }
            res.json({ success: true, message: 'Logged out successfully' });
        });
    });
    
    app.get('/api/me', (req, res) => {
        if (!req.session.userId) {
            return res.status(401).json({ success: false, error: 'Not authenticated' });
        }
        res.json({
            success: true,
            user: { email: req.session.userId }
        });
    });
};`;

// Create basic adopt.js file
const adoptRouteContent = `module.exports = (app, pool) => {
    // Adoption routes
    app.post('/api/adopt', async (req, res) => {
        const { animal_id, animal_type, adopter_name, user_email, adopter_phone, message } = req.body;
        
        // Validate required fields
        if (!animal_id || !animal_type || !adopter_name || !user_email) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required fields: animal_id, animal_type, adopter_name, user_email' 
            });
        }
        
        // Validate animal type
        const allowedTypes = ['cats', 'dogs', 'mouses'];
        if (!allowedTypes.includes(animal_type)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid animal type. Must be: cats, dogs, or mouses' 
            });
        }
        
        // Validate email
        if (!validator.isEmail(user_email)) {
            return res.status(400).json({ success: false, error: 'Invalid email address' });
        }
        
        try {
            // Check if animal exists
            const [animal] = await pool.promise().query(
                \`SELECT * FROM ?? WHERE id = ?\`,
                [animal_type, animal_id]
            );
            
            if (animal.length === 0) {
                return res.status(404).json({ success: false, error: 'Animal not found' });
            }
            
            // Insert adoption request
            const [result] = await pool.promise().query(
                \`INSERT INTO adoption_requests 
                 (animal_id, animal_type, adopter_name, user_email, adopter_phone, message) 
                 VALUES (?, ?, ?, ?, ?, ?)\`,
                [animal_id, animal_type, adopter_name, user_email, adopter_phone || null, message || '']
            );
            
            res.status(201).json({
                success: true,
                message: 'Adoption request submitted successfully',
                request_id: result.insertId
            });
        } catch (error) {
            console.error('Adoption request error:', error);
            res.status(500).json({ success: false, error: 'Failed to submit adoption request' });
        }
    });
    
    app.get('/api/adoption-requests', async (req, res) => {
        try {
            const [requests] = await pool.promise().query(
                'SELECT * FROM adoption_requests ORDER BY created_at DESC'
            );
            
            res.json({
                success: true,
                data: requests
            });
        } catch (error) {
            console.error('Error fetching adoption requests:', error);
            res.status(500).json({ success: false, error: 'Failed to fetch adoption requests' });
        }
    });
};`;

// Write route files if they don't exist
if (!fs.existsSync(path.join(routesDir, 'auth.js'))) {
    fs.writeFileSync(path.join(routesDir, 'auth.js'), authRouteContent);
    console.log('✅ Created auth.js route file');
}

if (!fs.existsSync(path.join(routesDir, 'adopt.js'))) {
    fs.writeFileSync(path.join(routesDir, 'adopt.js'), adoptRouteContent);
    console.log('✅ Created adopt.js route file');
}

// ========== LOAD ROUTES ==========
require('./routes/auth.js')(app, pool);
require('./routes/adopt.js')(app, pool);

// ========== ROUTES ==========
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
            me: 'GET /api/me',
            signup: 'POST /api/signup',
            login: 'POST /api/login',
            logout: 'POST /api/logout',
            adopt: 'POST /api/adopt',
            adoption_requests: 'GET /api/adoption-requests',

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

app.get('/api/health', async (req, res) => {
    try {
        const connection = await pool.promise().getConnection();
        try {
            const [tables] = await connection.promise().query('SHOW TABLES');
            connection.release();
            
            const tableNames = tables.map(table => Object.values(table)[0]);
            
            res.json({
                status: 'OK',
                database: 'Connected',
                tables: tableNames,
                timestamp: new Date().toISOString()
            });
        } catch (tablesErr) {
            connection.release();
            return res.json({
                status: 'WARNING',
                database: 'Connected but table check failed',
                timestamp: new Date().toISOString()
            });
        }
    } catch (err) {
        return res.status(500).json({
            status: 'ERROR',
            database: 'Disconnected',
            timestamp: new Date().toISOString()
        });
    }
});

// GET all animals combined
app.get('/api/animals/all', async (req, res) => {
    try {
        const [cats] = await pool.promise().query('SELECT *, "cats" as type FROM cats');
        const [dogs] = await pool.promise().query('SELECT *, "dogs" as type FROM dogs');
        const [mouses] = await pool.promise().query('SELECT *, "mouses" as type FROM mouses');
        
        const allAnimals = [...cats, ...dogs, ...mouses];
        allAnimals.sort((a, b) => b.id - a.id);
        
        res.json({
            success: true,
            count: allAnimals.length,
            data: allAnimals
        });
    } catch (error) {
        console.error('Error fetching all animals:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch animals: ' + error.message
        });
    }
});

app.get('/api/stats', async (req, res) => {
    try {
        const [results] = await pool.promise().query(`
            SELECT 
                (SELECT COUNT(*) FROM cats) as cats,
                (SELECT COUNT(*) FROM dogs) as dogs,
                (SELECT COUNT(*) FROM mouses) as mouses,
                (SELECT COUNT(*) FROM (
                    SELECT id FROM cats UNION ALL 
                    SELECT id FROM dogs UNION ALL 
                    SELECT id FROM mouses
                ) as all_animals) as total
        `);
        
        res.json({
            success: true,
            data: results[0],
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get statistics: ' + error.message
        });
    }
});

app.get('/api/tags', async (req, res) => {
    try {
        const [results] = await pool.promise().query(`
            SELECT DISTINCT tag FROM (
                SELECT tag FROM cats WHERE tag IS NOT NULL AND tag != ''
                UNION ALL
                SELECT tag FROM dogs WHERE tag IS NOT NULL AND tag != ''
                UNION ALL
                SELECT tag FROM mouses WHERE tag IS NOT NULL AND tag != ''
            ) as all_tags
            WHERE tag IS NOT NULL AND tag != ''
            ORDER BY tag
        `);

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
    } catch (error) {
        console.error('Error fetching tags:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get tags: ' + error.message
        });
    }
});

// Generic CRUD routes for all animal types
app.get('/api/:type', (req, res) => {
    const type = req.params.type;
    const allowedTypes = ['cats', 'dogs', 'mouses'];

    if (!allowedTypes.includes(type)) {
        return res.status(400).json({ success: false, error: 'Invalid type' });
    }

    pool.getConnection((err, connection) => {
        if (err) return res.status(500).json({ success: false, error: 'Database connection error' });

        connection.query(`SELECT * FROM ?? ORDER BY id DESC`, [type], (queryErr, results) => {
            connection.release();
            if (queryErr) return res.status(500).json({ success: false, error: `Failed to fetch ${type}: ${queryErr.message}` });
            res.json({ success: true, count: results.length, data: results });
        });
    });
});

app.get('/api/:type/:id', (req, res) => {
    const { type, id } = req.params;
    const allowedTypes = ['cats', 'dogs', 'mouses'];
    if (!allowedTypes.includes(type)) return res.status(400).json({ success: false, error: 'Invalid type' });
    if (isNaN(id) || id <= 0) return res.status(400).json({ success: false, error: 'Invalid ID' });

    pool.getConnection((err, connection) => {
        if (err) return res.status(500).json({ success: false, error: 'Database connection error' });
        connection.query(`SELECT * FROM ?? WHERE id = ?`, [type, id], (queryErr, results) => {
            connection.release();
            if (queryErr) return res.status(500).json({ success: false, error: `Failed to fetch ${type}: ${queryErr.message}` });
            if (results.length === 0) return res.status(404).json({ success: false, error: 'Not found' });
            res.json({ success: true, data: results[0] });
        });
    });
});

app.post('/api/:type', (req, res) => {
    const { type } = req.params;
    const { name, tag, description, img } = req.body;
    const allowedTypes = ['cats', 'dogs', 'mouses'];
    
    if (!allowedTypes.includes(type)) return res.status(400).json({ success: false, error: 'Invalid type' });
    if (!name || typeof name !== 'string' || name.trim().length === 0) return res.status(400).json({ success: false, error: 'Name is required' });
    
    // Validate inputs
    if (name && name.trim().length > 100) return res.status(400).json({ success: false, error: 'Name must be less than 100 characters' });
    if (tag && tag.trim().length > 255) return res.status(400).json({ success: false, error: 'Tag must be less than 255 characters' });
    if (description && description.trim().length > 1000) return res.status(400).json({ success: false, error: 'Description must be less than 1000 characters' });
    if (img && img.trim().length > 500) return res.status(400).json({ success: false, error: 'Image URL must be less than 500 characters' });
    if (img && img.trim() !== '' && !validator.isURL(img.trim())) return res.status(400).json({ success: false, error: 'Image URL must be a valid URL' });

    const sanitizedName = validator.escape(name.trim());
    const sanitizedTag = tag ? validator.escape(tag.trim()) : '';
    const sanitizedDescription = description ? validator.escape(description.trim()) : '';
    const sanitizedImg = img ? validator.escape(img.trim()) : '';

    pool.getConnection((err, connection) => {
        if (err) return res.status(500).json({ success: false, error: 'Database connection error' });
        const sql = `INSERT INTO ?? (name, tag, description, img) VALUES (?, ?, ?, ?)`;
        connection.query(sql, [type, sanitizedName, sanitizedTag, sanitizedDescription, sanitizedImg], (queryErr, result) => {
            connection.release();
            if (queryErr) return res.status(500).json({ success: false, error: `Failed to create: ${queryErr.message}` });
            res.status(201).json({ success: true, message: 'Created successfully', id: result.insertId });
        });
    });
});

app.put('/api/:type/:id', (req, res) => {
    const { type, id } = req.params;
    const { name, tag, description, img } = req.body;
    const allowedTypes = ['cats', 'dogs', 'mouses'];
    
    if (!allowedTypes.includes(type)) return res.status(400).json({ success: false, error: 'Invalid type' });
    if (isNaN(id) || id <= 0) return res.status(400).json({ success: false, error: 'Invalid ID' });
    
    pool.getConnection((err, connection) => {
        if (err) return res.status(500).json({ success: false, error: 'Database connection error' });
        connection.query(`SELECT * FROM ?? WHERE id = ?`, [type, id], (checkErr, results) => {
            if (checkErr || results.length === 0) {
                connection.release();
                return res.status(404).json({ success: false, error: 'Not found' });
            }
            
            const current = results[0];
            const sanitizedName = name ? validator.escape(name.trim()) : current.name;
            const sanitizedTag = tag !== undefined ? (tag ? validator.escape(tag.trim()) : '') : current.tag;
            const sanitizedDescription = description !== undefined ? (description ? validator.escape(description.trim()) : '') : current.description;
            const sanitizedImg = img !== undefined ? (img ? validator.escape(img.trim()) : '') : current.img;
            
            const sql = `UPDATE ?? SET name = ?, tag = ?, description = ?, img = ? WHERE id = ?`;
            connection.query(sql, [type, sanitizedName, sanitizedTag, sanitizedDescription, sanitizedImg, id], (updateErr) => {
                connection.release();
                if (updateErr) return res.status(500).json({ success: false, error: `Failed to update: ${updateErr.message}` });
                res.json({ success: true, message: 'Updated successfully' });
            });
        });
    });
});

app.delete('/api/:type/:id', (req, res) => {
    const { type, id } = req.params;
    const allowedTypes = ['cats', 'dogs', 'mouses'];
    
    if (!allowedTypes.includes(type)) return res.status(400).json({ success: false, error: 'Invalid type' });
    if (isNaN(id) || id <= 0) return res.status(400).json({ success: false, error: 'Invalid ID' });

    pool.getConnection((err, connection) => {
        if (err) return res.status(500).json({ success: false, error: 'Database connection error' });
        connection.query(`DELETE FROM ?? WHERE id = ?`, [type, id], (deleteErr, result) => {
            connection.release();
            if (deleteErr) return res.status(500).json({ success: false, error: `Failed to delete: ${deleteErr.message}` });
            if (result.affectedRows === 0) return res.status(404).json({ success: false, error: 'Not found' });
            res.json({ success: true, message: 'Deleted successfully' });
        });
    });
});

// Setup database tables
app.get('/api/setup', async (req, res) => {
    try {
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

        const createAdoptionRequestsTable = `
            CREATE TABLE IF NOT EXISTS adoption_requests (
                id INT PRIMARY KEY AUTO_INCREMENT,
                animal_id INT NOT NULL,
                animal_type VARCHAR(50) NOT NULL,
                adopter_name VARCHAR(100) NOT NULL,
                user_email VARCHAR(255) NOT NULL,
                adopter_phone VARCHAR(20),
                message TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;

        await Promise.all([
            pool.promise().query(createCatsTable),
            pool.promise().query(createDogsTable),
            pool.promise().query(createMousesTable),
            pool.promise().query(createUsersTable),
            pool.promise().query(createAdoptionRequestsTable)
        ]);

        res.json({
            success: true,
            message: 'Tables created successfully',
            tables: ['cats', 'dogs', 'mouses', 'users', 'adoption_requests']
        });
    } catch (error) {
        console.error('Error setting up database:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to create tables: ' + error.message 
        });
    }
});

// Load demo data
app.get('/api/demo', async (req, res) => {
    try {
        const demoData = {
            dogs: [
                [22, 'Buddy', 'fidèle, amical', 'Un chien fidèle et très amical avec tout le monde', 'https://images.unsplash.com/photo-1552053831-71594a27632d'],
                [23, 'Rocky', 'protecteur, fort', 'Un chien fort et protecteur de sa famille', 'https://images.unsplash.com/photo-1568572931-71594a27632d'],
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
                [31, 'CYTY', 'CT999', 'HAbby, hay, jau', 'https://img.freepik.com/photos-gratuite/mignon-chat-domestique-assis-dans-panier-osier-regardant-camera-generee-par-ai_188544-15494.jpg']
            ]
        };

        // Clear tables
        await Promise.all([
            pool.promise().query('DELETE FROM cats'),
            pool.promise().query('DELETE FROM dogs'),
            pool.promise().query('DELETE FROM mouses')
        ]);

        // Insert data
        const insertPromises = [];
        
        const insert = (table, data) => {
            const sql = `INSERT INTO ${table} (id, name, tag, description, img) VALUES (?, ?, ?, ?, ?)`;
            return pool.promise().query(sql, data).catch(err => {
                // Try without ID if duplicate
                const fallbackSql = `INSERT INTO ${table} (name, tag, description, img) VALUES (?, ?, ?, ?)`;
                return pool.promise().query(fallbackSql, [data[1], data[2], data[3], data[4]]);
            });
        };

        demoData.cats.forEach(item => insertPromises.push(insert('cats', item)));
        demoData.dogs.forEach(item => insertPromises.push(insert('dogs', item)));
        demoData.mouses.forEach(item => insertPromises.push(insert('mouses', item)));

        await Promise.all(insertPromises);

        res.json({
            success: true,
            message: 'Data loaded successfully',
            counts: {
                cats: demoData.cats.length,
                dogs: demoData.dogs.length,
                mouses: demoData.mouses.length
            }
        });
    } catch (error) {
        console.error('Error loading demo data:', error);
        res.status(500).json({ success: false, error: 'Failed to load demo data: ' + error.message });
    }
});

// ========== ERROR HANDLING ==========
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
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error'
    });
});

// ========== START SERVER ==========
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
})