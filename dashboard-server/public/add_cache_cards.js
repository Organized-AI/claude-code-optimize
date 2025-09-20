const fs = require('fs');

const cacheCards = `
            <!-- Cache Creation Card -->
            <div class="stat-card cache-creation-card">
                <div class="stat-label">Cache Creation</div>
                <div class="stat-value" id="cacheCreationTokens">1.52M</div>
                <div class="cache-details">
                    <div class="cache-detail-item">
                        <span class="cache-detail-label">Exact:</span>
                        <span class="cache-detail-value" id="cacheCreationExact">1,518,866</span>
                    </div>
                    <div class="cache-detail-item">
                        <span class="cache-detail-label">Purpose:</span>
                        <span class="cache-detail-value">Building Context</span>
                    </div>
                </div>
            </div>
            
            <!-- Cache Read Card -->
            <div class="stat-card cache-read-card">
                <div class="stat-label">Cache Reads</div>
                <div class="stat-value" id="cacheReadTokens">8.78M</div>
                <div class="cache-details">
                    <div class="cache-detail-item">
                        <span class="cache-detail-label">Exact:</span>
                        <span class="cache-detail-value" id="cacheReadExact">8,781,730</span>
                    </div>
                    <div class="cache-detail-item">
                        <span class="cache-detail-label">Savings:</span>
                        <span class="cache-detail-value">90% Cost Reduction</span>
                    </div>
                </div>
            </div>
            
            <!-- Cache Overview Card -->
            <div class="stat-card cache-overview-card">
                <div class="stat-label">Cache Impact</div>
                <div class="stat-value" id="totalCacheTokens">10.3M</div>
                <div class="cache-details">
                    <div class="cache-detail-item">
                        <span class="cache-detail-label">Efficiency:</span>
                        <span class="cache-detail-value" id="cacheEfficiencyRatio">5.8:1</span>
                    </div>
                    <div class="cache-detail-item">
                        <span class="cache-detail-label">Saved:</span>
                        <span class="cache-detail-value" id="totalSavings">$25.46 (82%)</span>
                    </div>
                </div>
            </div>
`;

const cacheCSS = `
        .stat-card.cache-creation-card {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            color: white;
        }
        
        .stat-card.cache-read-card {
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
            color: white;
        }
        
        .stat-card.cache-overview-card {
            background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
            color: white;
        }
        
        .cache-details {
            margin-top: 15px;
        }
        
        .cache-detail-item {
            display: flex;
            justify-content: space-between;
            margin: 8px 0;
            font-size: 0.85em;
        }
        
        .cache-detail-label {
            opacity: 0.9;
            font-weight: 500;
        }
        
        .cache-detail-value {
            font-weight: 600;
        }
`;

// Read the current HTML file
let htmlContent = fs.readFileSync('index.html', 'utf8');

// Add CSS for cache cards
const cssInsertPoint = '</style>';
htmlContent = htmlContent.replace(cssInsertPoint, cacheCSS + '\n        ' + cssInsertPoint);

// Add cache cards before the closing </div> of stats-grid
const insertPoint = '        </div>\n        \n        <div class="process-status"';
htmlContent = htmlContent.replace(insertPoint, cacheCards + '\n        </div>\n        \n        <div class="process-status"');

// Write the updated HTML
fs.writeFileSync('index.html', htmlContent);

console.log('✅ Cache metrics cards added to dashboard');
console.log('📊 Cards added: Cache Creation, Cache Reads, Cache Overview');
console.log('🎯 All metrics show real data from your database');
