const bcrypt = require('bcryptjs');

module.exports = function (app, pool) {

    // Register a new user
    app.post('/api/auth/signup', (req, res) => {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, error: 'Email and password are required' });
        }

        pool.getConnection((err, connection) => {
            if (err) return res.status(500).json({ success: false, error: 'Database error' });

            // Check if user exists
            connection.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
                if (err) {
                    connection.release();
                    return res.status(500).json({ success: false, error: 'Database error' });
                }

                if (results.length > 0) {
                    connection.release();
                    return res.json({ success: false, error: 'Email already exists' });
                }

                // Hash password
                try {
                    const hashedPassword = await bcrypt.hash(password, 10);

                    // Create user
                    connection.query('INSERT INTO users (email, password) VALUES (?, ?)', [email, hashedPassword], (err, result) => {
                        connection.release();
                        if (err) return res.status(500).json({ success: false, error: 'Failed to create user' });

                        // Auto-login after signup
                        req.session.userId = result.insertId;
                        req.session.userEmail = email;

                        req.session.save((err) => {
                            if (err) return res.status(500).json({ success: false, error: 'Session error' });
                            res.status(201).json({ success: true, message: 'User created successfully' });
                        });
                    });
                } catch (e) {
                    connection.release();
                    return res.status(500).json({ success: false, error: 'Encryption error' });
                }
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

                // Explicit save to ensure race conditions don't prevent login
                req.session.save((err) => {
                    if (err) return res.status(500).json({ success: false, error: 'Session save failed' });
                    res.json({ success: true, message: 'Logged in successfully', email: user.email });
                });
            });
        });
    });

    // Logout
    app.post('/api/auth/logout', (req, res) => {
        req.session.destroy((err) => {
            if (err) return res.status(500).json({ success: false, error: 'Logout failed' });
            res.json({ success: true, message: 'Logged out' });
        });
    });

    // Check Session (Me)
    app.get('/api/me', (req, res) => {

        if (req.session.userId) {
            res.json({ loggedIn: true, email: req.session.userEmail });
        } else {
            res.json({ loggedIn: false });
        }
    });

};
