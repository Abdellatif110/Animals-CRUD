module.exports = function (app, pool) {
    app.post('/api/adopt', async (req, res) => {
        if (!req.session.userId) {
            return res.status(401).json({ success: false, error: 'Not logged in' });
        }
        
        const { animalId, animalType, adopterName, adopterPhone, message } = req.body;
        const adopterEmail = req.session.userEmail;

        if (!animalId || !animalType || !adopterName || !adopterEmail) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }

        try {
            const [result] = await pool.promise().query(
                'INSERT INTO adoption_requests (animal_id, animal_type, adopter_name, user_email, adopter_phone, message) VALUES (?, ?, ?, ?, ?, ?)',
                [animalId, animalType, adopterName, adopterEmail, adopterPhone, message]
            );

            res.status(201).json({
                success: true,
                message: 'Adoption request submitted successfully',
                requestId: result.insertId
            });
        } catch (error) {
            console.error('Error submitting adoption request:', error);
            res.status(500).json({ success: false, error: 'Database error' });
        }
    });

    app.get('/api/adopt/my-requests', async (req, res) => {
        if (!req.session.userId) {
            return res.status(401).json({ success: false, error: 'Not logged in' });
        }

        try {
            const sql = `
                SELECT ar.*, c.name, c.description, c.img, c.tag 
                FROM adoption_requests ar 
                JOIN cats c ON ar.animal_id = c.id AND ar.animal_type = 'cats'
                WHERE ar.user_email = ?
                UNION
                SELECT ar.*, d.name, d.description, d.img, d.tag 
                FROM adoption_requests ar 
                JOIN dogs d ON ar.animal_id = d.id AND ar.animal_type = 'dogs'
                WHERE ar.user_email = ?
                UNION
                SELECT ar.*, m.name, m.description, m.img, m.tag 
                FROM adoption_requests ar 
                JOIN mouses m ON ar.animal_id = m.id AND ar.animal_type = 'mouses'
                WHERE ar.user_email = ?
                ORDER BY created_at DESC
            `;
            const [requests] = await pool.promise().query(sql, [req.session.userEmail, req.session.userEmail, req.session.userEmail]);
            res.json({ success: true, data: requests });
        } catch (error) {
            console.error('Error fetching adoption requests:', error);
            res.status(500).json({ success: false, error: 'Database error' });
        }
    });
};
