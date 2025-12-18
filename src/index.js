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

				// Auth Mock
				if (path === '/api/auth' && method === 'POST') {
					const { email } = await request.json();
					return new Response(JSON.stringify({ success: true, message: 'Authenticated', email }), { headers });
				}
				if (path === '/api/me' && method === 'GET') {
					return new Response(JSON.stringify({ loggedIn: true, email: 'user@example.com' }), { headers });
				}

				return new Response(JSON.stringify({ success: false, error: 'Route not found' }), { status: 404, headers });

			} catch (error) {
				return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers });
			}
		}

		// Static Assets handled by ASSETS binding
		if (env.ASSETS) {
			return env.ASSETS.fetch(request);
		}

		return new Response('Not Found', { status: 404 });
	},
};
