export default {
	async fetch(request, env, ctx) {
		const url = new URL(request.url);
		const path = url.pathname;
		const method = request.method;

		// API Routes
		if (path.startsWith('/api')) {
			const headers = {
				'Content-Type': 'application/json',
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
				'Access-Control-Allow-Headers': 'Content-Type',
			};

			if (method === 'OPTIONS') {
				return new Response(null, { headers });
			}

			try {
				// Helper to get ID from path
				const getPathId = (prefix) => {
					const idStr = path.replace(prefix, '');
					return parseInt(idStr) || null;
				};

				// GET /api
				if (path === '/api' && method === 'GET') {
					return new Response(JSON.stringify({
						message: 'Welcome to Animals CRUD API (Cloudflare Workers)',
						version: '2.0.0'
					}), { headers });
				}

				// Health Check
				if (path === '/api/health' && method === 'GET') {
					return new Response(JSON.stringify({ status: 'OK', database: 'Connected (D1)', timestamp: new Date().toISOString() }), { headers });
				}

				// CATS Routes
				if (path === '/api/cats' && method === 'GET') {
					const { results } = await env.DB.prepare('SELECT * FROM cats ORDER BY id DESC').all();
					return new Response(JSON.stringify({ success: true, count: results.length, data: results }), { headers });
				}
				if (path === '/api/cats' && method === 'POST') {
					const body = await request.json();
					const { name, tag, description, img } = body;
					const result = await env.DB.prepare('INSERT INTO cats (name, tag, description, img) VALUES (?, ?, ?, ?) RETURNING *')
						.bind(name, tag || '', description || '', img || '')
						.first();
					return new Response(JSON.stringify({ success: true, message: 'Cat created successfully', data: result }), { headers, status: 201 });
				}
				if (path.startsWith('/api/cats/') && method === 'PUT') {
					const id = getPathId('/api/cats/');
					const body = await request.json();
					const { name, tag, description, img } = body;
					await env.DB.prepare('UPDATE cats SET name = COALESCE(?, name), tag = COALESCE(?, tag), description = COALESCE(?, description), img = COALESCE(?, img) WHERE id = ?')
						.bind(name, tag, description, img, id)
						.run();
					const updated = await env.DB.prepare('SELECT * FROM cats WHERE id = ?').bind(id).first();
					return new Response(JSON.stringify({ success: true, message: 'Cat updated successfully', data: updated }), { headers });
				}
				if (path.startsWith('/api/cats/') && method === 'DELETE') {
					const id = getPathId('/api/cats/');
					const deleted = await env.DB.prepare('SELECT * FROM cats WHERE id = ?').bind(id).first();
					await env.DB.prepare('DELETE FROM cats WHERE id = ?').bind(id).run();
					return new Response(JSON.stringify({ success: true, message: 'Cat deleted successfully', data: deleted }), { headers });
				}

				// DOGS Routes
				if (path === '/api/dogs' && method === 'GET') {
					const { results } = await env.DB.prepare('SELECT * FROM dogs ORDER BY id DESC').all();
					return new Response(JSON.stringify({ success: true, count: results.length, data: results }), { headers });
				}
				if (path === '/api/dogs' && method === 'POST') {
					const body = await request.json();
					const { name, tag, description, img } = body;
					const result = await env.DB.prepare('INSERT INTO dogs (name, tag, description, img) VALUES (?, ?, ?, ?) RETURNING *')
						.bind(name, tag || '', description || '', img || '')
						.first();
					return new Response(JSON.stringify({ success: true, message: 'Dog created successfully', data: result }), { headers, status: 201 });
				}
				if (path.startsWith('/api/dogs/') && method === 'PUT') {
					const id = getPathId('/api/dogs/');
					const body = await request.json();
					const { name, tag, description, img } = body;
					await env.DB.prepare('UPDATE dogs SET name = COALESCE(?, name), tag = COALESCE(?, tag), description = COALESCE(?, description), img = COALESCE(?, img) WHERE id = ?')
						.bind(name, tag, description, img, id)
						.run();
					const updated = await env.DB.prepare('SELECT * FROM dogs WHERE id = ?').bind(id).first();
					return new Response(JSON.stringify({ success: true, message: 'Dog updated successfully', data: updated }), { headers });
				}
				if (path.startsWith('/api/dogs/') && method === 'DELETE') {
					const id = getPathId('/api/dogs/');
					const deleted = await env.DB.prepare('SELECT * FROM dogs WHERE id = ?').bind(id).first();
					await env.DB.prepare('DELETE FROM dogs WHERE id = ?').bind(id).run();
					return new Response(JSON.stringify({ success: true, message: 'Dog deleted successfully', data: deleted }), { headers });
				}

				// MOUSES Routes
				if (path === '/api/mouses' && method === 'GET') {
					const { results } = await env.DB.prepare('SELECT * FROM mouses ORDER BY id DESC').all();
					return new Response(JSON.stringify({ success: true, count: results.length, data: results }), { headers });
				}
				if (path === '/api/mouses' && method === 'POST') {
					const body = await request.json();
					const { name, tag, description, img } = body;
					const result = await env.DB.prepare('INSERT INTO mouses (name, tag, description, img) VALUES (?, ?, ?, ?) RETURNING *')
						.bind(name, tag || '', description || '', img || '')
						.first();
					return new Response(JSON.stringify({ success: true, message: 'Mouse created successfully', data: result }), { headers, status: 201 });
				}
				if (path.startsWith('/api/mouses/') && method === 'PUT') {
					const id = getPathId('/api/mouses/');
					const body = await request.json();
					const { name, tag, description, img } = body;
					await env.DB.prepare('UPDATE mouses SET name = COALESCE(?, name), tag = COALESCE(?, tag), description = COALESCE(?, description), img = COALESCE(?, img) WHERE id = ?')
						.bind(name, tag, description, img, id)
						.run();
					const updated = await env.DB.prepare('SELECT * FROM mouses WHERE id = ?').bind(id).first();
					return new Response(JSON.stringify({ success: true, message: 'Mouse updated successfully', data: updated }), { headers });
				}
				if (path.startsWith('/api/mouses/') && method === 'DELETE') {
					const id = getPathId('/api/mouses/');
					const deleted = await env.DB.prepare('SELECT * FROM mouses WHERE id = ?').bind(id).first();
					await env.DB.prepare('DELETE FROM mouses WHERE id = ?').bind(id).run();
					return new Response(JSON.stringify({ success: true, message: 'Mouse deleted successfully', data: deleted }), { headers });
				}

				// Unified animals route
				if (path === '/api/animals/all' && method === 'GET') {
					const cats = await env.DB.prepare('SELECT *, "cats" as type FROM cats').all();
					const dogs = await env.DB.prepare('SELECT *, "dogs" as type FROM dogs').all();
					const mouses = await env.DB.prepare('SELECT *, "mouses" as type FROM mouses').all();
					const allAnimals = [...cats.results, ...dogs.results, ...mouses.results].sort((a, b) => b.id - a.id);
					return new Response(JSON.stringify({ success: true, count: allAnimals.length, data: allAnimals }), { headers });
				}

				// ADOPT Route
				if (path === '/api/adopt' && method === 'POST') {
					try {
						const body = await request.json();
						const { animalId, animalType, adopterName, adopterEmail, adopterPhone, message } = body;

						if (!animalId || !animalType || !adopterName || !adopterEmail) {
							return new Response(JSON.stringify({ success: false, error: 'Missing required fields' }), { headers, status: 400 });
						}

						await env.DB.prepare('INSERT INTO adoption_requests (animal_id, animal_type, adopter_name, user_email, adopter_phone, message) VALUES (?, ?, ?, ?, ?, ?)')
							.bind(animalId, animalType, adopterName, adopterEmail, adopterPhone || '', message || '')
							.run();

						return new Response(JSON.stringify({ success: true, message: 'Adoption request submitted successfully' }), { headers, status: 201 });
					} catch (e) {
						return new Response(JSON.stringify({ success: false, error: e.message }), { headers, status: 500 });
					}
				}

				// Stats Route
				if (path === '/api/stats' && method === 'GET') {
					const stats = await env.DB.prepare(`
						SELECT 
							(SELECT COUNT(*) FROM cats) as cats,
							(SELECT COUNT(*) FROM dogs) as dogs,
							(SELECT COUNT(*) FROM mouses) as mouses
					`).first();
					const total = (stats.cats || 0) + (stats.dogs || 0) + (stats.mouses || 0);
					return new Response(JSON.stringify({ success: true, data: { ...stats, total }, timestamp: new Date().toISOString() }), { headers });
				}

				// Tags Route
				if (path === '/api/tags' && method === 'GET') {
					const { results } = await env.DB.prepare(`
						SELECT DISTINCT tag FROM (
							SELECT tag FROM cats WHERE tag IS NOT NULL AND tag != ''
							UNION ALL
							SELECT tag FROM dogs WHERE tag IS NOT NULL AND tag != ''
							UNION ALL
							SELECT tag FROM mouses WHERE tag IS NOT NULL AND tag != ''
						)
					`).all();
					const allTags = new Set();
					results.forEach(row => {
						if (row.tag) {
							row.tag.split(',').forEach(t => allTags.add(t.trim()));
						}
					});
					return new Response(JSON.stringify({ success: true, data: Array.from(allTags).sort() }), { headers });
				}

				// Auth Routes
				// Helper for password hashing (SH-256)
				const hashPassword = async (password) => {
					const msgBuffer = new TextEncoder().encode(password);
					const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
					const hashArray = Array.from(new Uint8Array(hashBuffer));
					return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
				};

				// SIGNUP
				if (path === '/api/auth/signup' && method === 'POST') {
					try {
						const { email, password } = await request.json();
						if (!email || !password) return new Response(JSON.stringify({ success: false, error: 'Email and password required' }), { headers });

						// Check if user exists
						const existing = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();
						if (existing) {
							return new Response(JSON.stringify({ success: false, error: 'Email already exists' }), { headers });
						}

						const hashedPassword = await hashPassword(password);
						await env.DB.prepare('INSERT INTO users (email, password) VALUES (?, ?)').bind(email, hashedPassword).run();

						// Auto-Login: Set Cookie
						const cookie = `auth_token=${btoa(email)}; Path=/; SameSite=Lax; Max-Age=86400`;

						return new Response(JSON.stringify({ success: true, message: 'User created' }), {
							headers: { ...headers, 'Set-Cookie': cookie }
						});
					} catch (e) {
						return new Response(JSON.stringify({ success: false, error: e.message }), { headers });
					}
				}

				// LOGIN
				if (path === '/api/auth/login' && method === 'POST') {
					try {
						const { email, password } = await request.json();
						const hashedPassword = await hashPassword(password);

						const user = await env.DB.prepare('SELECT * FROM users WHERE email = ? AND password = ?').bind(email, hashedPassword).first();

						if (!user) {
							return new Response(JSON.stringify({ success: false, error: 'Invalid credentials' }), { headers });
						}

						// Create a simple session cookie (in a real app Use JWT)
						const cookie = `auth_token=${btoa(user.email)}; Path=/; SameSite=Lax; Max-Age=86400`;

						return new Response(JSON.stringify({ success: true, message: 'Logged in', email: user.email }), {
							headers: { ...headers, 'Set-Cookie': cookie }
						});
					} catch (e) {
						return new Response(JSON.stringify({ success: false, error: e.message }), { headers });
					}
				}

				// LOGOUT
				if (path === '/api/auth/logout' && method === 'POST') {
					const cookie = `auth_token=; Path=/; SameSite=Lax; Max-Age=0`;
					return new Response(JSON.stringify({ success: true, message: 'Logged out' }), {
						headers: { ...headers, 'Set-Cookie': cookie }
					});
				}

				// ME (Check Session)
				if (path === '/api/me' && method === 'GET') {
					const cookie = request.headers.get('Cookie');
					if (cookie && cookie.includes('auth_token=')) {
						// Extract email from simple token
						const match = cookie.match(/auth_token=([^;]+)/);
						if (match) {
							try {
								const email = atob(match[1]);
								return new Response(JSON.stringify({ loggedIn: true, email }), { headers });
							} catch (e) { }
						}
					}
					return new Response(JSON.stringify({ loggedIn: false }), { headers });
				}

				return new Response(JSON.stringify({ success: false, error: 'Route not found' }), { status: 404, headers });

			} catch (error) {
				return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers });
			}
		}

		// Static Assets handled by ASSETS binding, with Protection
		if (env.ASSETS) {
			// Protect Root/Index
			const url = new URL(request.url);
			if (url.pathname === '/') {
				const cookie = request.headers.get('Cookie');
				if (!cookie || !cookie.includes('auth_token=')) {
					return Response.redirect(url.origin + '/login.html', 302);
				}
				return env.ASSETS.fetch(new Request(url.origin + '/index.html', request));
			}

			return env.ASSETS.fetch(request);
		}

		return new Response('Not Found', { status: 404 });
	},
};
