const bcrypt = require('bcryptjs');

module.exports = function (app, pool) {

    app.post('/api/auth/signup', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    try {
        const connection = await pool.promise().getConnection();
        try {
            const [users] = await connection.query('SELECT * FROM users WHERE email = ?', [email]);

            if (users.length > 0) {
                // To prevent timing attacks, we still perform a fake hash comparison
                await bcrypt.compare('any_password', users[0].password);
                connection.release();
                return res.json({ success: false, error: 'Email already exists' });
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            const [result] = await connection.query('INSERT INTO users (email, password) VALUES (?, ?)', [email, hashedPassword]);

            req.session.userId = result.insertId;
            req.session.userEmail = email;

            req.session.save((err) => {
                connection.release();
                if (err) return res.status(500).json({ success: false, error: 'Session error' });
                res.status(201).json({ success: true, message: 'User created successfully' });
            });
        } catch (e) {
            if (connection) connection.release();
            res.status(500).json({ success: false, error: 'Server error' });
        }
    } catch (e) {
        res.status(500).json({ success: false, error: 'Database connection error' });
    }
});

    app.post('/api/auth/login', async (req, res) => {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, error: 'Email and password are required' });
        }

        try {
            const connection = await pool.promise().getConnection();
            try {
                const [users] = await connection.query('SELECT * FROM users WHERE email = ?', [email]);
                connection.release();

                let isMatch = false;
                if (users.length > 0) {
                    isMatch = await bcrypt.compare(password, users[0].password);
                } else {
                    // To prevent timing attacks, we still perform a fake hash comparison
                    await bcrypt.compare('any_password', '$2a$10$abcdefghijklmnopqrstuv');
                }

                if (!isMatch) {
                    return res.status(401).json({ success: false, error: 'Invalid credentials' });
                }

                const user = users[0];
                req.session.userId = user.id;
                req.session.userEmail = user.email;

                req.session.save((err) => {
                    if (err) return res.status(500).json({ success: false, error: 'Session save failed' });
                    res.json({ success: true, message: 'Logged in successfully', email: user.email });
                });
            } catch (e) {
                if (connection) connection.release();
                res.status(500).json({ success: false, error: 'Server error' });
            }
        } catch (e) {
            res.status(500).json({ success: false, error: 'Database connection error' });
        }
    });

    app.post('/api/auth/logout', (req, res) => {
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

};
