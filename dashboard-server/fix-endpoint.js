const fs = require('fs');

// Read the file
let content = fs.readFileSync('server.js', 'utf8');

// Find and replace the incomplete endpoint
const incompletePattern = 'app.get("/api/token-metrics", (req, res) => {\n\n// Model usage breakdown endpoint';

const completeEndpoint = `app.get("/api/token-metrics", (req, res) => {
    const query = \`
        SELECT 
            COALESCE(SUM(json_extract(data, "$.message.usage.input_tokens")), 0) as total_input,
            COALESCE(SUM(json_extract(data, "$.message.usage.output_tokens")), 0) as total_output,
            COALESCE(SUM(json_extract(data, "$.message.usage.cache_creation_input_tokens")), 0) as total_cache_creation,
            COALESCE(SUM(json_extract(data, "$.message.usage.cache_read_input_tokens")), 0) as total_cache_read
        FROM activity 
        WHERE source="claude-code" 
            AND type="message" 
            AND json_extract(data, "$.message.usage") IS NOT NULL
    \`;
    
    db.get(query, (err, row) => {
        if (err) {
            console.error('Error fetching token metrics:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        const metrics = {
            input: row ? (row.total_input || 0) : 0,
            output: row ? (row.total_output || 0) : 0,
            cacheCreation: row ? (row.total_cache_creation || 0) : 0,
            cacheRead: row ? (row.total_cache_read || 0) : 0,
            total: row ? ((row.total_input || 0) + (row.total_output || 0) + (row.total_cache_creation || 0) + (row.total_cache_read || 0)) : 0
        };
        
        res.json(metrics);
    });
});

// Model usage breakdown endpoint`;

// Replace the incomplete implementation
content = content.replace(incompletePattern, completeEndpoint);

// Write back to file
fs.writeFileSync('server.js', content);
console.log('✅ Token metrics endpoint fixed successfully');
