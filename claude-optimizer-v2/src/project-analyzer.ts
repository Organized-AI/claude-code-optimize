/**
 * Project Analyzer
 * Uses Claude Agent SDK to analyze project complexity and generate session plans
 */

import { query } from '@anthropic-ai/claude-agent-sdk';
import { FileScanner } from './utils/file-scanner.js';
import type {
  ProjectAnalysis,
  ProjectMetadata,
  SessionPhase,
  AIAnalysisResult
} from './types.js';

export class ProjectAnalyzer {
  private fileScanner: FileScanner;

  constructor() {
    this.fileScanner = new FileScanner();
  }

  /**
   * Main analysis method: Scan project and use Claude to analyze complexity
   */
  async analyzeProject(projectPath: string): Promise<ProjectAnalysis> {
    console.log('📊 Analyzing project...\n');

    // Step 1: Gather file system metadata
    const metadata = await this.fileScanner.scanProject(projectPath);

    console.log(`\n  Languages: ${metadata.languages.join(', ')}`);
    console.log(`  Technologies: ${metadata.technologies.join(', ') || 'None detected'}`);
    console.log(`  Files: ${metadata.fileCount}, Size: ${metadata.totalSizeKB}KB`);
    console.log(`  Tests: ${metadata.hasTests ? '✓' : '✗'}, Docs: ${metadata.hasDocs ? '✓' : '✗'}\n`);

    // Step 2: Use Claude SDK to analyze complexity
    console.log('  🤖 Analyzing complexity with Claude Opus...');
    const aiAnalysis = await this.analyzeWithClaude(projectPath, metadata);

    console.log(`  ✓ Complexity: ${aiAnalysis.complexity}/10`);
    console.log(`  ✓ Estimated: ${aiAnalysis.estimatedHours} hours\n`);

    // Step 3: Generate session phases
    console.log('  📋 Generating session plan...');
    const phases = this.generateSessionPhases(aiAnalysis, metadata);

    // Step 4: Assess risk factors
    const riskFactors = this.assessRisks(metadata, aiAnalysis);

    return {
      projectPath,
      complexity: aiAnalysis.complexity,
      estimatedHours: aiAnalysis.estimatedHours,
      phases,
      technologies: metadata.technologies,
      fileCount: metadata.fileCount,
      totalSizeKB: metadata.totalSizeKB,
      hasTests: metadata.hasTests,
      hasDocs: metadata.hasDocs,
      riskFactors,
      timestamp: new Date()
    };
  }

  /**
   * Use Claude SDK to perform deep complexity analysis
   */
  private async analyzeWithClaude(
    projectPath: string,
    metadata: ProjectMetadata
  ): Promise<AIAnalysisResult> {
    const prompt = this.buildAnalysisPrompt(projectPath, metadata);

    try {
      const session = query({
        prompt,
        options: {
          model: 'claude-opus-4-20250514', // Use Opus for complex reasoning
          permissionMode: 'bypassPermissions',
          settingSources: [],
          // Allow Claude to read project files for deeper analysis
          allowedTools: [
            'Read',
            'Glob',
            'Grep',
            'Bash(ls:*,find:*,wc:*,head:*,tail:*)'
          ]
        }
      });

      let response = '';
      for await (const message of session) {
        // Handle different message types from Claude Agent SDK
        // The SDK returns messages of type 'assistant' or 'result'
        if (message.type === 'assistant') {
          // Assistant message with text content
          const content = (message as any).content;
          if (typeof content === 'string') {
            response += content;
            process.stdout.write('.');
          } else if (Array.isArray(content)) {
            // Content blocks array
            for (const block of content) {
              if (block.type === 'text' && block.text) {
                response += block.text;
                process.stdout.write('.');
              }
            }
          }
        } else if (message.type === 'result') {
          // Final result message
          const text = (message as any).text || (message as any).content;
          if (typeof text === 'string') {
            response += text;
            process.stdout.write('.');
          }
        }
      }
      console.log(''); // New line after progress dots

      // If we got a response, parse it; otherwise fall back
      if (response.trim().length === 0) {
        throw new Error('No response received from Claude SDK');
      }

      return this.parseClaudeResponse(response);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`  ⚠️  Claude SDK error: ${errorMessage}`);
      console.error('  📊 Using fallback heuristic analysis instead\n');

      // Log full error in debug mode
      if (process.env.DEBUG) {
        console.error('Full error:', error);
      }

      // Fallback to basic analysis if SDK fails
      return this.basicAnalysis(metadata);
    }
  }

  /**
   * Build comprehensive analysis prompt for Claude
   */
  private buildAnalysisPrompt(projectPath: string, metadata: ProjectMetadata): string {
    return `
You are analyzing a software project to estimate complexity and development time.

PROJECT INFORMATION:
- Path: ${projectPath}
- Files: ${metadata.fileCount}
- Total Size: ${metadata.totalSizeKB}KB
- Languages: ${metadata.languages.join(', ')}
- Technologies: ${metadata.technologies.join(', ')}
- Has Tests: ${metadata.hasTests ? 'Yes' : 'No'}
- Has Documentation: ${metadata.hasDocs ? 'Yes' : 'No'}

KEY FILES:
${metadata.keyFiles.map(f => `- ${f}`).join('\n')}

DIRECTORY STRUCTURE:
${metadata.directories.slice(0, 20).map(d => `- ${d}/`).join('\n')}

ANALYSIS TASK:

1. **Complexity Assessment** (1-10 scale):
   - 1-2: Trivial (single file scripts, simple utilities)
   - 3-4: Simple (small apps, basic CRUD, simple libraries)
   - 5-6: Moderate (standard web apps, APIs, medium codebases)
   - 7-8: Complex (large systems, multiple services, complex logic)
   - 9-10: Very Complex (distributed systems, ML frameworks, compilers)

   Consider:
   - Codebase size and file count
   - Number of technologies and frameworks
   - Architectural complexity
   - Missing tests or documentation
   - Code quality indicators

2. **Time Estimation** (in hours):
   - Assume an experienced developer working efficiently
   - Include time for testing and documentation
   - Account for integration complexity
   - Consider learning curve for unfamiliar tech

3. **Development Phases**:
   Suggest a logical breakdown:
   - Planning & Setup (typically 10-15%)
   - Core Implementation (typically 40-50%)
   - Testing & Integration (typically 20-30%)
   - Polish & Documentation (typically 10-15%)

4. **Risk Factors**:
   Identify potential challenges:
   - Missing documentation
   - No test coverage
   - Deprecated dependencies
   - Complex architecture
   - Unfamiliar technologies

5. **Technologies**:
   List key frameworks, libraries, and tools detected

RESPONSE FORMAT:

Provide your analysis as valid JSON in a code block:

\`\`\`json
{
  "complexity": <1-10>,
  "estimatedHours": <number>,
  "reasoning": "<explain your assessment in 2-3 sentences>",
  "suggestedPhases": [
    {"name": "Planning & Setup", "percentage": 15},
    {"name": "Core Implementation", "percentage": 50},
    {"name": "Testing & Integration", "percentage": 25},
    {"name": "Polish & Documentation", "percentage": 10}
  ],
  "risks": ["<risk1>", "<risk2>", ...],
  "technologies": ["<tech1>", "<tech2>", ...]
}
\`\`\`

Analyze the project thoroughly and provide accurate estimates.
    `.trim();
  }

  /**
   * Parse Claude's JSON response
   */
  private parseClaudeResponse(response: string): AIAnalysisResult {
    // Extract JSON from code block
    const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/) ||
                      response.match(/```\n([\s\S]*?)\n```/);

    if (!jsonMatch) {
      if (process.env.DEBUG) {
        console.error('Response content:', response.substring(0, 500));
      }
      throw new Error('No JSON code block found in Claude response. Expected ```json...``` format.');
    }

    try {
      const parsed = JSON.parse(jsonMatch[1]);

      // Validate required fields
      if (typeof parsed.complexity !== 'number' || parsed.complexity < 1 || parsed.complexity > 10) {
        throw new Error(`Invalid complexity value: ${parsed.complexity}. Expected number between 1-10.`);
      }

      if (typeof parsed.estimatedHours !== 'number' || parsed.estimatedHours <= 0) {
        throw new Error(`Invalid estimatedHours value: ${parsed.estimatedHours}. Expected positive number.`);
      }

      return {
        complexity: parsed.complexity,
        estimatedHours: parsed.estimatedHours,
        reasoning: parsed.reasoning || 'No reasoning provided',
        suggestedPhases: parsed.suggestedPhases || [],
        risks: parsed.risks || [],
        technologies: parsed.technologies || []
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown parsing error';
      throw new Error(`Failed to parse Claude response JSON: ${errorMsg}`);
    }
  }

  /**
   * Generate session phases based on AI analysis
   */
  private generateSessionPhases(
    aiAnalysis: AIAnalysisResult,
    _metadata: ProjectMetadata
  ): SessionPhase[] {
    const totalHours = aiAnalysis.estimatedHours;

    // Base phases with descriptions
    const basePhases: SessionPhase[] = [
      {
        name: 'Planning & Setup',
        description: 'Analyze architecture, create implementation plan, configure environment',
        estimatedHours: totalHours * 0.15,
        objectives: [
          'Understand existing codebase architecture',
          'Create detailed implementation roadmap',
          'Set up development environment and dependencies',
          'Identify key integration points'
        ],
        suggestedModel: 'opus', // Complex reasoning needed
        requiredTools: ['Read', 'Glob', 'Grep', 'Bash'],
        tokenBudget: Math.floor(totalHours * 0.15 * 30000)
      },
      {
        name: 'Core Implementation',
        description: 'Build main features, write core logic, implement integrations',
        estimatedHours: totalHours * 0.5,
        objectives: [
          'Implement primary features',
          'Write integration logic',
          'Create utility functions and helpers',
          'Build core business logic'
        ],
        suggestedModel: 'sonnet', // Fast, capable coding
        requiredTools: ['Edit', 'Write', 'Read', 'Bash'],
        tokenBudget: Math.floor(totalHours * 0.5 * 30000)
      },
      {
        name: 'Testing & Integration',
        description: 'Write tests, fix bugs, ensure components work together',
        estimatedHours: totalHours * 0.25,
        objectives: [
          'Write comprehensive test coverage',
          'Fix identified bugs and issues',
          'Verify all components integrate properly',
          'Perform integration testing'
        ],
        suggestedModel: 'sonnet',
        requiredTools: ['Edit', 'Bash', 'Read'],
        tokenBudget: Math.floor(totalHours * 0.25 * 30000)
      },
      {
        name: 'Polish & Documentation',
        description: 'Refactor code, optimize performance, write documentation',
        estimatedHours: totalHours * 0.1,
        objectives: [
          'Code cleanup and refactoring',
          'Performance optimization',
          'Write user documentation',
          'Create developer guides'
        ],
        suggestedModel: 'sonnet',
        requiredTools: ['Edit', 'Write', 'Read'],
        tokenBudget: Math.floor(totalHours * 0.1 * 30000)
      }
    ];

    // Filter out phases that are too short (less than 1 hour)
    const validPhases = basePhases.filter(phase => phase.estimatedHours >= 1);

    // If no valid phases, return at least one
    if (validPhases.length === 0) {
      return [{
        name: 'Implementation',
        description: 'Complete project implementation',
        estimatedHours: totalHours,
        objectives: ['Complete all project objectives'],
        suggestedModel: 'sonnet',
        requiredTools: ['Edit', 'Write', 'Read', 'Bash'],
        tokenBudget: Math.floor(totalHours * 30000)
      }];
    }

    return validPhases;
  }

  /**
   * Assess risk factors
   */
  private assessRisks(metadata: ProjectMetadata, aiAnalysis: AIAnalysisResult): string[] {
    const risks: string[] = [...aiAnalysis.risks];

    if (!metadata.hasTests) {
      risks.push('No existing test coverage - will need to write tests from scratch');
    }

    if (!metadata.hasDocs) {
      risks.push('Limited documentation - may require more time to understand codebase');
    }

    if (metadata.technologies.length > 5) {
      risks.push('Multiple technologies in use - integration complexity may be high');
    }

    if (metadata.fileCount > 500) {
      risks.push('Large codebase - analysis and refactoring may take longer');
    }

    return risks;
  }

  /**
   * Fallback basic analysis when Claude SDK fails
   */
  private basicAnalysis(metadata: ProjectMetadata): AIAnalysisResult {
    // Simple heuristic-based estimation
    let complexity = 1;

    // File count factor
    if (metadata.fileCount > 500) complexity += 3;
    else if (metadata.fileCount > 200) complexity += 2;
    else if (metadata.fileCount > 50) complexity += 1;

    // Technology factor
    if (metadata.technologies.length > 5) complexity += 2;
    else if (metadata.technologies.length > 2) complexity += 1;

    // Size factor
    if (metadata.totalSizeKB > 10000) complexity += 1;

    // Missing tests/docs
    if (!metadata.hasTests) complexity += 1;
    if (!metadata.hasDocs) complexity += 1;

    complexity = Math.min(10, complexity); // Cap at 10

    // Estimate hours based on complexity
    const estimatedHours = Math.round(complexity * 2.5);

    return {
      complexity,
      estimatedHours,
      reasoning: 'Basic heuristic analysis based on file count, size, and technologies',
      suggestedPhases: [
        { name: 'Planning & Setup', percentage: 15 },
        { name: 'Core Implementation', percentage: 50 },
        { name: 'Testing & Integration', percentage: 25 },
        { name: 'Polish & Documentation', percentage: 10 }
      ],
      risks: [
        'Basic analysis used - manual review recommended',
        'Estimates may not account for specific complexities'
      ],
      technologies: metadata.technologies
    };
  }
}
