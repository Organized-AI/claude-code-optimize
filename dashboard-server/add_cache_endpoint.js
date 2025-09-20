// Add Cache Metrics endpoint to server.js

const fs = require('fs');
const path = require('path');

const serverPath = path.join(__dirname, 'server.js');
let serverContent = fs.readFileSync(serverPath, 'utf8');

// Find the position after the stats endpoint
const statsEndpoint = `app.get('/api/stats', async (req, res) => {
    try {
        const stats = await getStats();
        res.json(stats);
    } catch (error) {
        console.error('Error getting stats:', error);
        res.status(500).json({ error: 'Failed to get statistics' });
    }
});`;

const cacheEndpoint = `
// Cache Metrics endpoint
app.get('/api/cache-metrics', (req, res) => {
    const query = \`
        SELECT 
            json_extract(data, '$.message.model') as model,
            COUNT(*) as message_count,
            SUM(CAST(json_extract(data, '$.message.usage.input_tokens') AS INTEGER)) as input_tokens,
            SUM(CAST(json_extract(data, '$.message.usage.output_tokens') AS INTEGER)) as output_tokens,
            SUM(CAST(json_extract(data, '$.message.usage.cache_creation_input_tokens') AS INTEGER)) as cache_creation_tokens,
            SUM(CAST(json_extract(data, '$.message.usage.cache_read_input_tokens') AS INTEGER)) as cache_read_tokens
        FROM activity 
        WHERE source = 'claude-code' 
            AND json_extract(data, '$.message.usage') IS NOT NULL
            AND date(timestamp) = date('now')
        GROUP BY json_extract(data, '$.message.model')
        ORDER BY 
            SUM(CAST(json_extract(data, '$.message.usage.cache_creation_input_tokens') AS INTEGER) + 
                CAST(json_extract(data, '$.message.usage.cache_read_input_tokens') AS INTEGER)) DESC
    \`;
    
    db.all(query, (err, rows) => {
        if (err) {
            console.error('Error fetching cache metrics:', err);
            return res.status(500).json({ error: 'Failed to fetch cache metrics' });
        }
        
        const metrics = rows.map(row => {
            const cacheCreation = row.cache_creation_tokens || 0;
            const cacheRead = row.cache_read_tokens || 0;
            const totalCache = cacheCreation + cacheRead;
            const totalTokens = (row.input_tokens || 0) + (row.output_tokens || 0) + cacheCreation + cacheRead;
            
            // Calculate cache efficiency
            const cacheEfficiency = totalCache > 0 ? (cacheRead / totalCache) * 100 : 0;
            
            // Calculate cost savings (cache reads are ~10x cheaper)
            const regularCost = totalTokens * 0.003; // Standard pricing
            const actualCost = ((row.input_tokens || 0) + (row.output_tokens || 0) + cacheCreation) * 0.003 + 
                              cacheRead * 0.0003; // Cache reads much cheaper
            const savings = ((regularCost - actualCost) / regularCost) * 100;
            
            return {
                model: row.model,
                messageCount: row.message_count,
                tokens: {
                    input: row.input_tokens || 0,
                    output: row.output_tokens || 0,
                    cacheCreation: cacheCreation,
                    cacheRead: cacheRead,
                    totalCache: totalCache,
                    total: totalTokens
                },
                efficiency: {
                    cacheEfficiency: Math.round(cacheEfficiency * 10) / 10,
                    costSavings: Math.round(savings * 10) / 10
                },
                cost: {
                    regular: Math.round(regularCost * 10000) / 10000,
                    actual: Math.round(actualCost * 10000) / 10000,
                    saved: Math.round((regularCost - actualCost) * 10000) / 10000
                }
            };
        });
        
        // Calculate totals across all models
        const totals = metrics.reduce((acc, model) => {
            acc.messageCount += model.messageCount;
            acc.tokens.input += model.tokens.input;
            acc.tokens.output += model.tokens.output;
            acc.tokens.cacheCreation += model.tokens.cacheCreation;
            acc.tokens.cacheRead += model.tokens.cacheRead;
            acc.tokens.totalCache += model.tokens.totalCache;
            acc.tokens.total += model.tokens.total;
            acc.cost.regular += model.cost.regular;
            acc.cost.actual += model.cost.actual;
            acc.cost.saved += model.cost.saved;
            return acc;
        }, {
            messageCount: 0,
            tokens: { input: 0, output: 0, cacheCreation: 0, cacheRead: 0, totalCache: 0, total: 0 },
            cost: { regular: 0, actual: 0, saved: 0 }
        });
        
        // Calculate overall efficiency
        totals.efficiency = {
            cacheEfficiency: totals.tokens.totalCache > 0 ? 
                Math.round((totals.tokens.cacheRead / totals.tokens.totalCache) * 1000) / 10 : 0,
            costSavings: totals.cost.regular > 0 ? 
                Math.round((totals.cost.saved / totals.cost.regular) * 1000) / 10 : 0
        };
        
        res.json({
            byModel: metrics,
            totals: totals,
            timestamp: new Date().toISOString()
        });
    });
});`;

// Replace the stats endpoint with stats + cache endpoint
const newServerContent = serverContent.replace(
    statsEndpoint,
    statsEndpoint + cacheEndpoint
);

// Write back to file
fs.writeFileSync(serverPath, newServerContent);
console.log('✅ Cache metrics endpoint added to server.js');
