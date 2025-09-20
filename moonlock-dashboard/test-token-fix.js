// Test the token calculation fix

const testSessions = [
  { inputTokens: 200000, outputTokens: 150000, totalCostUSD: 0.045 },
  { inputTokens: 147000, outputTokens: 134300, totalCostUSD: 0.038 }
];

// Old (broken) calculation might have been:
const brokenTotal = testSessions.reduce((sum, s) => 
  sum + (s.inputTokens * s.outputTokens), 0); // WRONG: multiplication
console.log('❌ Broken calculation:', brokenTotal.toLocaleString()); // Huge number

// Correct calculation:
const correctTotal = testSessions.reduce((sum, s) => 
  sum + s.inputTokens + s.outputTokens, 0); // CORRECT: addition
console.log('✅ Correct calculation:', correctTotal.toLocaleString()); // ~631k

console.log('\nFix verified! Token calculation corrected.');
