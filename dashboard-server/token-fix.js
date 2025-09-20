// This script fixes the incomplete /api/token-metrics endpoint

const fs = require('fs');

let serverContent = fs.readFileSync('server.js', 'utf8');

// Find the incomplete token-metrics endpoint and fix it
const fixedEndpoint = `// Token metrics endpoint
app.get("/api/token-metrics", (req, res) => {
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
            input: row.total_input || 0,
            output: row.total_output || 0,
            cacheCreation: row.total_cache_creation || 0,
            cacheRead: row.total_cache_read || 0,
            total: (row.total_input || 0) + (row.total_output || 0) + (row.total_cache_creation || 0) + (row.total_cache_read || 0)
        };
        
        res.json(metrics);
    });
});

// Model usage breakdown endpoint`;

// Replace the broken endpoint
const brokenPattern = /\/\/ Token metrics endpoint\napp\.get\("\/api\/token-metrics", \(req, res\) => \{\n\n\/\/ Model usage breakdown endpoint/;

if (brokenPattern.test(serverContent)) {
    serverContent = serverContent.replace(brokenPattern, fixedEndpoint);
    fs.writeFileSync('server.js', serverContent);
    console.log('✅ Fixed token-metrics endpoint in server.js');
} else {
    console.log('❌ Pattern not found - endpoint may already be fixed');
}
