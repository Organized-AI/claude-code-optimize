#!/usr/bin/env ts-node

/**
 * Token Capture Test Prototype
 * 
 * This prototype tests multiple approaches to capture actual token usage
 * from Claude Code for comparison with estimates.
 * 
 * Usage: npx ts-node prototypes/token-capture-test.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface TokenCaptureResult {
  method: string;
  success: boolean;
  tokenCount: number | null;
  confidence: number; // 0-1
  timestamp: Date;
  notes: string;
}

interface TestSession {
  sessionId: string;
  startTime: Date;
  endTime?: Date;
  captures: TokenCaptureResult[];
  manualTokenCount?: number; // For validation
}

class ClaudeCodeTokenCapture {
  private session: TestSession;
  
  constructor() {
    this.session = {
      sessionId: `test-${Date.now()}`,
      startTime: new Date(),
      captures: []
    };
  }

  /**
   * Test all available token capture methods
   */
  async testAllMethods(): Promise<TokenCaptureResult[]> {
    console.log('🔍 Testing Claude Code token capture methods...\n');
    
    const methods = [
      this.testScreenshotMethod.bind(this),
      this.testProcessMonitoring.bind(this),
      this.testFileSystemMonitoring.bind(this),
      this.testEnvironmentVariables.bind(this),
      this.testWindowTitleMethod.bind(this),
      this.testClipboardMethod.bind(this)
    ];
    
    const results: TokenCaptureResult[] = [];
    
    for (const method of methods) {
      try {
        const result = await method();
        results.push(result);
        this.logResult(result);
      } catch (error) {
        console.log(`❌ Method failed: ${error.message}`);
      }
    }
    
    this.session.captures = results;
    return results;
  }

  /**
   * Method 1: Screenshot-based token extraction
   */
  private async testScreenshotMethod(): Promise<TokenCaptureResult> {
    try {
      // Take screenshot of Claude Code window
      const screenshotPath = '/tmp/claude-code-screenshot.png';
      
      // Try to find Claude Code window and screenshot it
      await execAsync(`osascript -e 'tell application "System Events" to tell process "Claude Code" to set frontmost to true'`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for window focus
      
      // Take screenshot of specific region where tokens are displayed
      await execAsync(`screencapture -R 0,0,400,100 "${screenshotPath}"`);
      
      // OCR or pattern recognition on screenshot
      const tokenCount = await this.extractTokensFromImage(screenshotPath);
      
      return {
        method: 'Screenshot + OCR',
        success: tokenCount !== null,
        tokenCount,
        confidence: tokenCount ? 0.7 : 0,
        timestamp: new Date(),
        notes: 'Screenshot-based token extraction'
      };
    } catch (error) {
      return {
        method: 'Screenshot + OCR',
        success: false,
        tokenCount: null,
        confidence: 0,
        timestamp: new Date(),
        notes: `Failed: ${error.message}`
      };
    }
  }

  /**
   * Method 2: Process monitoring
   */
  private async testProcessMonitoring(): Promise<TokenCaptureResult> {
    try {
      // Find Claude Code process
      const { stdout } = await execAsync('ps aux | grep -i "claude"');
      const processes = stdout.split('\n').filter(line => 
        line.includes('Claude') && !line.includes('grep')
      );
      
      if (processes.length === 0) {
        throw new Error('Claude Code process not found');
      }
      
      // Analyze process memory/CPU for patterns
      const processInfo = processes[0];
      const pid = processInfo.split(/\s+/)[1];
      
      // Get detailed process information
      const { stdout: processDetails } = await execAsync(`ps -p ${pid} -o pid,ppid,cpu,mem,time,command`);
      
      // Heuristic: Estimate tokens based on memory usage
      const memoryMatch = processDetails.match(/(\d+\.\d+)%/);
      const estimatedTokens = memoryMatch ? Math.round(parseFloat(memoryMatch[1]) * 1000) : null;
      
      return {
        method: 'Process Monitoring',
        success: estimatedTokens !== null,
        tokenCount: estimatedTokens,
        confidence: 0.3, // Low confidence for heuristic approach
        timestamp: new Date(),
        notes: `Based on process memory usage: ${processDetails.trim()}`
      };
    } catch (error) {
      return {
        method: 'Process Monitoring',
        success: false,
        tokenCount: null,
        confidence: 0,
        timestamp: new Date(),
        notes: `Failed: ${error.message}`
      };
    }
  }

  /**
   * Method 3: File system monitoring
   */
  private async testFileSystemMonitoring(): Promise<TokenCaptureResult> {
    const possiblePaths = [
      '~/Library/Application Support/Claude Code/',
      '~/.claude-code/',
      '/tmp/claude-code/',
      '~/.config/claude-code/',
      '~/Library/Preferences/com.anthropic.claude-code.plist',
      '~/Library/Caches/Claude Code/'
    ];
    
    let tokenCount: number | null = null;
    let foundPath = '';
    
    for (const pathPattern of possiblePaths) {
      try {
        const expandedPath = pathPattern.replace('~', process.env.HOME || '');
        
        if (fs.existsSync(expandedPath)) {
          console.log(`📁 Found Claude Code directory: ${expandedPath}`);
          
          // Search for files containing token data
          const files = await this.findFilesRecursively(expandedPath, ['.json', '.log', '.txt', '.plist']);
          
          for (const file of files) {
            const tokens = await this.extractTokensFromFile(file);
            if (tokens) {
              tokenCount = tokens;
              foundPath = file;
              break;
            }
          }
        }
      } catch (error) {
        // Continue to next path
      }
    }
    
    return {
      method: 'File System Monitoring',
      success: tokenCount !== null,
      tokenCount,
      confidence: tokenCount ? 0.8 : 0,
      timestamp: new Date(),
      notes: foundPath ? `Found in: ${foundPath}` : 'No token data found in filesystem'
    };
  }

  /**
   * Method 4: Environment variables
   */
  private async testEnvironmentVariables(): Promise<TokenCaptureResult> {
    const tokenEnvVars = [
      'CLAUDE_CODE_TOKENS',
      'CLAUDE_TOKEN_COUNT',
      'ANTHROPIC_TOKENS',
      'CC_TOKENS',
      'CLAUDE_USAGE'
    ];
    
    let tokenCount: number | null = null;
    let foundVar = '';
    
    for (const envVar of tokenEnvVars) {
      const value = process.env[envVar];
      if (value) {
        const parsed = parseInt(value);
        if (!isNaN(parsed)) {
          tokenCount = parsed;
          foundVar = envVar;
          break;
        }
      }
    }
    
    return {
      method: 'Environment Variables',
      success: tokenCount !== null,
      tokenCount,
      confidence: tokenCount ? 0.9 : 0,
      timestamp: new Date(),
      notes: foundVar ? `Found in ${foundVar}` : 'No token environment variables found'
    };
  }

  /**
   * Method 5: Window title analysis
   */
  private async testWindowTitleMethod(): Promise<TokenCaptureResult> {
    try {
      // Get window titles for Claude Code
      const { stdout } = await execAsync(`osascript -e 'tell application "System Events" to get name of every window of every process whose name contains "Claude"'`);
      
      const windowTitles = stdout.trim();
      const tokenMatch = windowTitles.match(/(\d+(?:,\d{3})*)\s*tokens?/i);
      const tokenCount = tokenMatch ? parseInt(tokenMatch[1].replace(/,/g, '')) : null;
      
      return {
        method: 'Window Title Analysis',
        success: tokenCount !== null,
        tokenCount,
        confidence: tokenCount ? 0.6 : 0,
        timestamp: new Date(),
        notes: `Window titles: ${windowTitles}`
      };
    } catch (error) {
      return {
        method: 'Window Title Analysis',
        success: false,
        tokenCount: null,
        confidence: 0,
        timestamp: new Date(),
        notes: `Failed: ${error.message}`
      };
    }
  }

  /**
   * Method 6: Clipboard monitoring (manual copy)
   */
  private async testClipboardMethod(): Promise<TokenCaptureResult> {
    try {
      // Get current clipboard content
      const { stdout } = await execAsync('pbpaste');
      const clipboardContent = stdout.trim();
      
      // Look for token patterns in clipboard
      const tokenPatterns = [
        /(\d+(?:,\d{3})*)\s*tokens?/i,
        /tokens?\s*:\s*(\d+(?:,\d{3})*)/i,
        /usage\s*:\s*(\d+(?:,\d{3})*)/i
      ];
      
      let tokenCount: number | null = null;
      for (const pattern of tokenPatterns) {
        const match = clipboardContent.match(pattern);
        if (match) {
          tokenCount = parseInt(match[1].replace(/,/g, ''));
          break;
        }
      }
      
      return {
        method: 'Clipboard Analysis',
        success: tokenCount !== null,
        tokenCount,
        confidence: tokenCount ? 0.5 : 0,
        timestamp: new Date(),
        notes: `Clipboard content: ${clipboardContent.slice(0, 100)}...`
      };
    } catch (error) {
      return {
        method: 'Clipboard Analysis',
        success: false,
        tokenCount: null,
        confidence: 0,
        timestamp: new Date(),
        notes: `Failed: ${error.message}`
      };
    }
  }

  /**
   * Extract tokens from image using simple pattern recognition
   */
  private async extractTokensFromImage(imagePath: string): Promise<number | null> {
    try {
      // This would require OCR library like tesseract
      // For now, return null as placeholder
      console.log(`📸 Would analyze image: ${imagePath}`);
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Extract tokens from file content
   */
  private async extractTokensFromFile(filePath: string): Promise<number | null> {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      const tokenPatterns = [
        /["\']?tokens?["\']?\s*:\s*(\d+)/i,
        /["\']?token[_\s]?count["\']?\s*:\s*(\d+)/i,
        /["\']?usage["\']?\s*:\s*(\d+)/i,
        /(\d+)\s*tokens?\s*used/i,
        /<integer>(\d+)<\/integer>/i // plist format
      ];
      
      for (const pattern of tokenPatterns) {
        const match = content.match(pattern);
        if (match) {
          const tokenCount = parseInt(match[1]);
          if (tokenCount > 0 && tokenCount < 10000000) { // Reasonable range
            return tokenCount;
          }
        }
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Find files recursively with specific extensions
   */
  private async findFilesRecursively(dir: string, extensions: string[]): Promise<string[]> {
    const files: string[] = [];
    
    try {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          // Recursively search subdirectories
          const subFiles = await this.findFilesRecursively(fullPath, extensions);
          files.push(...subFiles);
        } else if (stat.isFile()) {
          // Check if file has matching extension
          const ext = path.extname(fullPath).toLowerCase();
          if (extensions.includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    } catch (error) {
      // Directory access denied or doesn't exist
    }
    
    return files;
  }

  /**
   * Log test result
   */
  private logResult(result: TokenCaptureResult): void {
    const statusIcon = result.success ? '✅' : '❌';
    const confidenceBar = '▓'.repeat(Math.round(result.confidence * 10)) + '░'.repeat(10 - Math.round(result.confidence * 10));
    
    console.log(`${statusIcon} ${result.method}`);
    console.log(`   Tokens: ${result.tokenCount?.toLocaleString() || 'None'}`);
    console.log(`   Confidence: ${confidenceBar} ${Math.round(result.confidence * 100)}%`);
    console.log(`   Notes: ${result.notes}`);
    console.log('');
  }

  /**
   * Generate test report
   */
  generateReport(): string {
    this.session.endTime = new Date();
    const duration = this.session.endTime.getTime() - this.session.startTime.getTime();
    
    const successfulMethods = this.session.captures.filter(c => c.success);
    const bestMethod = successfulMethods.reduce((best, current) => 
      current.confidence > best.confidence ? current : best,
      { confidence: 0 } as TokenCaptureResult
    );
    
    return `
# 🎯 Claude Code Token Capture Test Report

**Session ID**: ${this.session.sessionId}
**Duration**: ${Math.round(duration / 1000)} seconds
**Timestamp**: ${new Date().toISOString()}

## 📊 Results Summary

**Methods Tested**: ${this.session.captures.length}
**Successful**: ${successfulMethods.length}
**Success Rate**: ${Math.round((successfulMethods.length / this.session.captures.length) * 100)}%

## 🏆 Best Method

${bestMethod.confidence > 0 ? `
**Method**: ${bestMethod.method}
**Token Count**: ${bestMethod.tokenCount?.toLocaleString() || 'N/A'}
**Confidence**: ${Math.round(bestMethod.confidence * 100)}%
**Notes**: ${bestMethod.notes}
` : 'No successful methods found'}

## 📋 Detailed Results

${this.session.captures.map(result => `
### ${result.method}
- **Success**: ${result.success ? 'Yes' : 'No'}
- **Token Count**: ${result.tokenCount?.toLocaleString() || 'None'}
- **Confidence**: ${Math.round(result.confidence * 100)}%
- **Notes**: ${result.notes}
- **Timestamp**: ${result.timestamp.toISOString()}
`).join('\n')}

## 🔬 Recommendations

${this.generateRecommendations(successfulMethods)}

---

*Next steps: Implement the most promising method(s) for production use*
    `;
  }

  private generateRecommendations(successfulMethods: TokenCaptureResult[]): string {
    if (successfulMethods.length === 0) {
      return `
1. **Contact Anthropic Support**: Ask about official Claude Code token API
2. **Community Research**: Check Discord/forums for integration solutions  
3. **Alternative Approaches**: Consider manual logging with slash commands
4. **Future Monitoring**: Watch for Claude Code updates with integration features
      `;
    }
    
    const highConfidence = successfulMethods.filter(m => m.confidence >= 0.7);
    const mediumConfidence = successfulMethods.filter(m => m.confidence >= 0.4 && m.confidence < 0.7);
    
    return `
1. **Primary Integration**: ${highConfidence.length > 0 ? `Use ${highConfidence[0].method} for production` : 'No high-confidence methods found'}
2. **Fallback Methods**: ${mediumConfidence.length > 0 ? `Implement ${mediumConfidence.map(m => m.method).join(', ')} as backups` : 'Consider manual input options'}
3. **Validation**: Cross-reference multiple methods for accuracy
4. **Monitoring**: Set up continuous validation against displayed tokens
5. **Improvement**: Iterate on promising approaches to increase confidence
    `;
  }

  /**
   * Save test results to file
   */
  async saveResults(outputPath: string): Promise<void> {
    const report = this.generateReport();
    fs.writeFileSync(outputPath, report, 'utf8');
    console.log(`📄 Test report saved to: ${outputPath}`);
  }
}

// Main execution
async function main(): Promise<void> {
  console.log('🚀 Claude Code Token Capture Test\n');
  console.log('This test will attempt to capture actual token usage from Claude Code');
  console.log('using multiple different approaches.\n');
  
  const tester = new ClaudeCodeTokenCapture();
  
  // Run all tests
  const results = await tester.testAllMethods();
  
  // Generate and display report
  const report = tester.generateReport();
  console.log(report);
  
  // Save results
  const outputPath = path.join(__dirname, '..', 'test-results', `token-capture-test-${Date.now()}.md`);
  await tester.saveResults(outputPath);
  
  // Prompt for manual validation
  console.log('\n🔍 MANUAL VALIDATION NEEDED:');
  console.log('1. Check Claude Code interface for current token count');
  console.log('2. Compare with results above');
  console.log('3. Note which method(s) were most accurate');
  console.log('4. Update test results with manual validation data\n');
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { ClaudeCodeTokenCapture };
