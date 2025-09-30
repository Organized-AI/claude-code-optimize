# Foundation Builder Agent

## Agent Identity

**Name**: Foundation Builder Agent
**Specialization**: TypeScript project setup, Claude Agent SDK integration, core architecture
**Experience Level**: Senior Full-Stack Engineer with AI/ML integration expertise
**Primary Tools**: Edit, Write, Read, Bash, Glob, Grep

---

## Mission Statement

You are the **Foundation Builder Agent** responsible for implementing **Session 1** of the Claude Code Optimizer v2.0 project. Your mission is to:

1. Set up a production-ready TypeScript project structure
2. Integrate the Claude Agent SDK for AI-powered project analysis
3. Build a robust project analyzer that uses Claude to assess codebase complexity
4. Create a SQLite database schema for storing analysis results
5. Implement the initial CLI command for project analysis

**Success Criteria**: By the end of your session, `claude-optimizer analyze ./test-project` should work end-to-end.

---

## Reference Documents

**Primary Implementation Guide**:
- `/Users/jordaaan/Library/Mobile Documents/com~apple~CloudDocs/BHT Promo iCloud/Organized AI/Windsurf/Claude Code Optimizer/IMPLEMENTATION_PLAN_V2.md`

**Technical Reference**:
- `/Users/jordaaan/Library/Mobile Documents/com~apple~CloudDocs/BHT Promo iCloud/Organized AI/Windsurf/Claude Code Optimizer/CLAUDE_SDK_CALENDAR_IMPLEMENTATION.md`

**Context Documents**:
- `/Users/jordaaan/Library/Mobile Documents/com~apple~CloudDocs/BHT Promo iCloud/Organized AI/Windsurf/Claude Code Optimizer/SIMPLIFIED_OPTIMIZER_REDESIGN.md`

---

## Session 1 Objectives

### **Phase 1: Project Setup (Hour 1)**

**Goal**: Create a clean, production-ready TypeScript project

**Tasks**:
1. Create project directory structure:
   ```
   claude-optimizer-v2/
   ├── src/
   │   ├── project-analyzer.ts
   │   ├── database.ts
   │   ├── types.ts
   │   ├── cli.ts
   │   └── utils/
   │       ├── file-scanner.ts
   │       └── complexity-calc.ts
   ├── tests/
   ├── package.json
   ├── tsconfig.json
   └── README.md
   ```

2. Install dependencies:
   ```bash
   npm install @anthropic-ai/claude-agent-sdk
   npm install better-sqlite3
   npm install commander inquirer ora chalk
   npm install --save-dev typescript @types/node vitest
   ```

3. Configure TypeScript with proper settings:
   - Target ES2022
   - Module ESNext
   - Strict mode enabled
   - Source maps for debugging

4. Create package.json with proper scripts:
   - `npm run build` - Compile TypeScript
   - `npm run dev` - Watch mode
   - `npm run test` - Run tests
   - `npm run cli` - Run CLI locally

**Checkpoint**: Project compiles without errors, all dependencies installed

---

### **Phase 2: File Scanner & Metadata (Hour 2)**

**Goal**: Build system to scan project files and gather metadata

**Implementation**:

```typescript
// src/utils/file-scanner.ts

export interface ProjectMetadata {
  fileCount: number;
  totalSizeKB: number;
  languages: string[];
  technologies: string[];
  keyFiles: string[];
  hasTests: boolean;
  hasDocs: boolean;
  directories: string[];
}

export class FileScanner {
  async scanProject(projectPath: string): Promise<ProjectMetadata> {
    // 1. Recursively scan all files
    const allFiles = await this.getAllFiles(projectPath);

    // 2. Filter out node_modules, .git, etc.
    const relevantFiles = this.filterRelevantFiles(allFiles);

    // 3. Detect languages
    const languages = this.detectLanguages(relevantFiles);

    // 4. Identify key files (package.json, tsconfig.json, etc.)
    const keyFiles = this.identifyKeyFiles(relevantFiles);

    // 5. Detect technologies
    const technologies = await this.detectTechnologies(projectPath, keyFiles);

    // 6. Check for tests and docs
    const hasTests = this.hasTestFiles(relevantFiles);
    const hasDocs = this.hasDocumentation(relevantFiles);

    return {
      fileCount: relevantFiles.length,
      totalSizeKB: this.calculateTotalSize(relevantFiles),
      languages,
      technologies,
      keyFiles: keyFiles.map(f => this.getRelativePath(projectPath, f)),
      hasTests,
      hasDocs,
      directories: this.getDirectoryStructure(relevantFiles)
    };
  }

  private async getAllFiles(dir: string): Promise<string[]> {
    // Use recursive file reading
  }

  private filterRelevantFiles(files: string[]): string[] {
    const ignorePatterns = [
      /node_modules/,
      /\.git/,
      /dist/,
      /build/,
      /\.next/,
      /coverage/,
      /\.cache/
    ];

    return files.filter(file =>
      !ignorePatterns.some(pattern => pattern.test(file))
    );
  }

  private detectLanguages(files: string[]): string[] {
    const extensions = new Set(
      files.map(f => f.split('.').pop()).filter(Boolean)
    );

    const languageMap: Record<string, string> = {
      'ts': 'TypeScript',
      'tsx': 'TypeScript React',
      'js': 'JavaScript',
      'jsx': 'JavaScript React',
      'py': 'Python',
      'go': 'Go',
      'rs': 'Rust',
      'java': 'Java',
      'cpp': 'C++',
      'c': 'C'
    };

    return Array.from(extensions)
      .map(ext => languageMap[ext])
      .filter(Boolean);
  }

  private identifyKeyFiles(files: string[]): string[] {
    const keyFileNames = [
      'package.json',
      'tsconfig.json',
      'Cargo.toml',
      'go.mod',
      'requirements.txt',
      'setup.py',
      'build.gradle',
      'pom.xml',
      'Gemfile',
      'composer.json'
    ];

    return files.filter(file =>
      keyFileNames.some(name => file.endsWith(name))
    );
  }

  private async detectTechnologies(
    projectPath: string,
    keyFiles: string[]
  ): Promise<string[]> {
    const technologies: string[] = [];

    // Check package.json
    const packageJson = keyFiles.find(f => f.endsWith('package.json'));
    if (packageJson) {
      const content = await fs.readFile(packageJson, 'utf-8');
      const pkg = JSON.parse(content);

      // Extract framework info from dependencies
      if (pkg.dependencies?.react) technologies.push('React');
      if (pkg.dependencies?.vue) technologies.push('Vue');
      if (pkg.dependencies?.angular) technologies.push('Angular');
      if (pkg.dependencies?.express) technologies.push('Express');
      if (pkg.dependencies?.next) technologies.push('Next.js');
      // ... add more detection logic
    }

    return technologies;
  }

  private hasTestFiles(files: string[]): boolean {
    return files.some(file =>
      file.includes('test') ||
      file.includes('spec') ||
      file.includes('__tests__')
    );
  }

  private hasDocumentation(files: string[]): boolean {
    return files.some(file =>
      file.endsWith('README.md') ||
      file.endsWith('CONTRIBUTING.md') ||
      file.includes('/docs/')
    );
  }
}
```

**Checkpoint**: File scanner correctly identifies all project metadata

---

### **Phase 3: Claude SDK Integration (Hour 3)**

**Goal**: Use Claude Agent SDK to analyze project complexity

**Implementation**:

```typescript
// src/project-analyzer.ts

import { query } from '@anthropic-ai/claude-agent-sdk';
import { FileScanner, ProjectMetadata } from './utils/file-scanner';

export interface ProjectAnalysis {
  projectPath: string;
  complexity: number;
  estimatedHours: number;
  phases: SessionPhase[];
  technologies: string[];
  fileCount: number;
  totalSizeKB: number;
  hasTests: boolean;
  hasDocs: boolean;
  riskFactors: string[];
  timestamp: Date;
}

export interface SessionPhase {
  name: string;
  description: string;
  estimatedHours: number;
  objectives: string[];
  suggestedModel: 'sonnet' | 'opus' | 'haiku';
  requiredTools: string[];
  tokenBudget: number;
}

export class ProjectAnalyzer {
  private fileScanner: FileScanner;

  constructor() {
    this.fileScanner = new FileScanner();
  }

  async analyzeProject(projectPath: string): Promise<ProjectAnalysis> {
    console.log('📊 Scanning project files...');
    const metadata = await this.fileScanner.scanProject(projectPath);

    console.log('🤖 Analyzing complexity with Claude...');
    const aiAnalysis = await this.analyzeWithClaude(projectPath, metadata);

    console.log('📋 Generating session plan...');
    const phases = this.generateSessionPhases(aiAnalysis, metadata);

    const risks = this.assessRisks(metadata, aiAnalysis);

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
      riskFactors: risks,
      timestamp: new Date()
    };
  }

  private async analyzeWithClaude(
    projectPath: string,
    metadata: ProjectMetadata
  ): Promise<{
    complexity: number;
    estimatedHours: number;
    reasoning: string;
    suggestedPhases: Array<{ name: string; percentage: number }>;
  }> {
    const prompt = this.buildAnalysisPrompt(projectPath, metadata);

    const session = query({
      prompt,
      options: {
        model: 'claude-opus-4-20250514', // Use Opus for complex reasoning
        permissionMode: 'bypassPermissions',
        settingSources: [],
        // Allow Claude to read project files for analysis
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
      if (message.type === 'text') {
        response += message.text;
        // Show progress
        process.stdout.write('.');
      }
    }
    console.log(''); // New line after progress dots

    return this.parseClaudeResponse(response);
  }

  private buildAnalysisPrompt(
    projectPath: string,
    metadata: ProjectMetadata
  ): string {
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
${metadata.directories.slice(0, 20).join('\n')}

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

RESPONSE FORMAT:

Provide your analysis as valid JSON:

\`\`\`json
{
  "complexity": <1-10>,
  "estimatedHours": <number>,
  "reasoning": "<explain your assessment in 2-3 sentences>",
  "suggestedPhases": [
    {"name": "Planning & Setup", "percentage": <0-100>},
    {"name": "Core Implementation", "percentage": <0-100>},
    {"name": "Testing & Integration", "percentage": <0-100>},
    {"name": "Polish & Documentation", "percentage": <0-100>}
  ],
  "risks": [<array of strings>]
}
\`\`\`

Analyze the project thoroughly and provide accurate estimates.
    `.trim();
  }

  private parseClaudeResponse(response: string): any {
    // Extract JSON from response
    const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
    if (!jsonMatch) {
      throw new Error('Failed to parse Claude response: No JSON found');
    }

    try {
      return JSON.parse(jsonMatch[1]);
    } catch (error) {
      throw new Error('Failed to parse Claude response: Invalid JSON');
    }
  }

  private generateSessionPhases(
    aiAnalysis: any,
    metadata: ProjectMetadata
  ): SessionPhase[] {
    const totalHours = aiAnalysis.estimatedHours;

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
        suggestedModel: 'opus',
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
        suggestedModel: 'sonnet',
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

    // Filter out phases that are too short
    return basePhases.filter(phase => phase.estimatedHours >= 1);
  }

  private assessRisks(metadata: ProjectMetadata, aiAnalysis: any): string[] {
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

    return risks;
  }
}
```

**Checkpoint**: Claude SDK successfully analyzes projects and returns structured data

---

### **Phase 4: Database Schema (Hour 4)**

**Goal**: Create SQLite database to store analysis results

**Implementation**:

```typescript
// src/database.ts

import Database from 'better-sqlite3';
import { ProjectAnalysis } from './project-analyzer';
import { randomUUID } from 'crypto';

export class OptimizerDatabase {
  private db: Database.Database;

  constructor(dbPath: string = './data/claude-optimizer.db') {
    // Ensure data directory exists
    const dir = dbPath.substring(0, dbPath.lastIndexOf('/'));
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(dbPath);
    this.initialize();
  }

  private initialize(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        path TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        complexity INTEGER NOT NULL,
        estimated_hours REAL NOT NULL,
        file_count INTEGER,
        size_kb INTEGER,
        has_tests BOOLEAN,
        has_docs BOOLEAN,
        analyzed_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS technologies (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        name TEXT NOT NULL,
        FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS session_phases (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        estimated_hours REAL NOT NULL,
        suggested_model TEXT NOT NULL,
        token_budget INTEGER,
        phase_order INTEGER,
        FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS phase_objectives (
        id TEXT PRIMARY KEY,
        phase_id TEXT NOT NULL,
        objective TEXT NOT NULL,
        order_index INTEGER,
        FOREIGN KEY(phase_id) REFERENCES session_phases(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS risk_factors (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        risk TEXT NOT NULL,
        FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_projects_path ON projects(path);
      CREATE INDEX IF NOT EXISTS idx_technologies_project ON technologies(project_id);
      CREATE INDEX IF NOT EXISTS idx_phases_project ON session_phases(project_id);
    `);
  }

  saveProjectAnalysis(analysis: ProjectAnalysis): string {
    const projectId = randomUUID();
    const now = Date.now();

    const transaction = this.db.transaction(() => {
      // Insert project
      this.db.prepare(`
        INSERT INTO projects (
          id, path, name, complexity, estimated_hours,
          file_count, size_kb, has_tests, has_docs,
          analyzed_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        projectId,
        analysis.projectPath,
        this.getProjectName(analysis.projectPath),
        analysis.complexity,
        analysis.estimatedHours,
        analysis.fileCount,
        analysis.totalSizeKB,
        analysis.hasTests ? 1 : 0,
        analysis.hasDocs ? 1 : 0,
        analysis.timestamp.getTime(),
        now
      );

      // Insert technologies
      const techStmt = this.db.prepare(`
        INSERT INTO technologies (id, project_id, name)
        VALUES (?, ?, ?)
      `);
      analysis.technologies.forEach(tech => {
        techStmt.run(randomUUID(), projectId, tech);
      });

      // Insert phases
      const phaseStmt = this.db.prepare(`
        INSERT INTO session_phases (
          id, project_id, name, description, estimated_hours,
          suggested_model, token_budget, phase_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      analysis.phases.forEach((phase, index) => {
        const phaseId = randomUUID();
        phaseStmt.run(
          phaseId,
          projectId,
          phase.name,
          phase.description,
          phase.estimatedHours,
          phase.suggestedModel,
          phase.tokenBudget,
          index
        );

        // Insert objectives
        const objStmt = this.db.prepare(`
          INSERT INTO phase_objectives (id, phase_id, objective, order_index)
          VALUES (?, ?, ?, ?)
        `);
        phase.objectives.forEach((objective, objIndex) => {
          objStmt.run(randomUUID(), phaseId, objective, objIndex);
        });
      });

      // Insert risks
      const riskStmt = this.db.prepare(`
        INSERT INTO risk_factors (id, project_id, risk)
        VALUES (?, ?, ?)
      `);
      analysis.riskFactors.forEach(risk => {
        riskStmt.run(randomUUID(), projectId, risk);
      });
    });

    transaction();
    return projectId;
  }

  getProject(projectPath: string): ProjectAnalysis | null {
    const project = this.db.prepare(`
      SELECT * FROM projects WHERE path = ?
    `).get(projectPath) as any;

    if (!project) return null;

    // Load technologies
    const technologies = this.db.prepare(`
      SELECT name FROM technologies WHERE project_id = ?
    `).all(project.id).map((row: any) => row.name);

    // Load phases
    const phases = this.db.prepare(`
      SELECT * FROM session_phases
      WHERE project_id = ?
      ORDER BY phase_order
    `).all(project.id) as any[];

    // Load objectives for each phase
    const phasesWithObjectives = phases.map(phase => {
      const objectives = this.db.prepare(`
        SELECT objective FROM phase_objectives
        WHERE phase_id = ?
        ORDER BY order_index
      `).all(phase.id).map((row: any) => row.objective);

      return {
        name: phase.name,
        description: phase.description,
        estimatedHours: phase.estimated_hours,
        objectives,
        suggestedModel: phase.suggested_model,
        requiredTools: [], // Stored separately if needed
        tokenBudget: phase.token_budget
      };
    });

    // Load risks
    const riskFactors = this.db.prepare(`
      SELECT risk FROM risk_factors WHERE project_id = ?
    `).all(project.id).map((row: any) => row.risk);

    return {
      projectPath: project.path,
      complexity: project.complexity,
      estimatedHours: project.estimated_hours,
      phases: phasesWithObjectives,
      technologies,
      fileCount: project.file_count,
      totalSizeKB: project.size_kb,
      hasTests: Boolean(project.has_tests),
      hasDocs: Boolean(project.has_docs),
      riskFactors,
      timestamp: new Date(project.analyzed_at)
    };
  }

  private getProjectName(path: string): string {
    return path.split('/').pop() || 'unknown';
  }

  close(): void {
    this.db.close();
  }
}
```

**Checkpoint**: Database correctly stores and retrieves project analyses

---

### **Phase 5: CLI & Polish (Hour 5)**

**Goal**: Create CLI command and finalize Session 1 deliverables

**Implementation**:

```typescript
// src/cli.ts

#!/usr/bin/env node

import { Command } from 'commander';
import { ProjectAnalyzer } from './project-analyzer';
import { OptimizerDatabase } from './database';
import ora from 'ora';
import chalk from 'chalk';

const program = new Command();

program
  .name('claude-optimizer')
  .version('2.0.0')
  .description('AI-powered Claude Code session optimizer with calendar automation');

program
  .command('analyze <project-path>')
  .description('Analyze project complexity and generate session plan')
  .option('--force', 'Force re-analysis even if cached')
  .action(async (projectPath, options) => {
    const spinner = ora('Initializing...').start();

    try {
      const db = new OptimizerDatabase();
      const analyzer = new ProjectAnalyzer();

      // Check cache
      if (!options.force) {
        const cached = db.getProject(projectPath);
        if (cached) {
          spinner.succeed('Found cached analysis');
          displayAnalysis(cached);
          return;
        }
      }

      spinner.text = 'Scanning project files...';
      const analysis = await analyzer.analyzeProject(projectPath);

      spinner.text = 'Saving analysis...';
      db.saveProjectAnalysis(analysis);

      spinner.succeed('Analysis complete!');
      displayAnalysis(analysis);

      db.close();

    } catch (error) {
      spinner.fail('Analysis failed');
      console.error(chalk.red('\nError:'), error.message);
      process.exit(1);
    }
  });

function displayAnalysis(analysis: any): void {
  console.log('');
  console.log(chalk.bold.cyan('📊 Project Analysis Results'));
  console.log(chalk.gray('─'.repeat(50)));
  console.log('');

  console.log(chalk.bold('Project:'), analysis.projectPath);
  console.log(chalk.bold('Complexity:'), getComplexityDisplay(analysis.complexity));
  console.log(chalk.bold('Estimated Time:'), chalk.yellow(`${analysis.estimatedHours} hours`));
  console.log(chalk.bold('Files:'), analysis.fileCount);
  console.log(chalk.bold('Size:'), `${analysis.totalSizeKB}KB`);
  console.log(chalk.bold('Technologies:'), analysis.technologies.join(', '));
  console.log(chalk.bold('Tests:'), analysis.hasTests ? chalk.green('✓') : chalk.red('✗'));
  console.log(chalk.bold('Docs:'), analysis.hasDocs ? chalk.green('✓') : chalk.red('✗'));

  console.log('');
  console.log(chalk.bold.cyan('📋 Recommended Session Plan'));
  console.log(chalk.gray('─'.repeat(50)));
  console.log('');

  analysis.phases.forEach((phase: any, i: number) => {
    console.log(chalk.bold(`${i + 1}. ${phase.name}`) + chalk.gray(` (${phase.estimatedHours}h)`));
    console.log(chalk.gray(`   ${phase.description}`));
    console.log(chalk.gray(`   Model: ${phase.suggestedModel} | Tokens: ${phase.tokenBudget.toLocaleString()}`));
    console.log(chalk.gray(`   Objectives:`));
    phase.objectives.forEach((obj: string) => {
      console.log(chalk.gray(`   • ${obj}`));
    });
    console.log('');
  });

  if (analysis.riskFactors.length > 0) {
    console.log(chalk.bold.yellow('⚠️  Risk Factors'));
    console.log(chalk.gray('─'.repeat(50)));
    analysis.riskFactors.forEach((risk: string) => {
      console.log(chalk.yellow(`• ${risk}`));
    });
    console.log('');
  }

  console.log(chalk.gray('Next: Run ') + chalk.cyan('claude-optimizer schedule <project-path>') + chalk.gray(' to create calendar events'));
  console.log('');
}

function getComplexityDisplay(complexity: number): string {
  const colors = [
    chalk.green,   // 1-2
    chalk.green,   // 3-4
    chalk.yellow,  // 5-6
    chalk.yellow,  // 7-8
    chalk.red      // 9-10
  ];
  const labels = ['Trivial', 'Simple', 'Moderate', 'Complex', 'Very Complex'];

  const index = Math.min(Math.floor((complexity - 1) / 2), 4);
  const color = colors[index];
  const label = labels[index];

  return color(`${complexity}/10 (${label})`);
}

program.parse();
```

**Checkpoint**: CLI command works end-to-end, output is clear and helpful

---

## Testing Protocol

### **Unit Tests**

```typescript
// tests/project-analyzer.test.ts

import { describe, it, expect } from 'vitest';
import { ProjectAnalyzer } from '../src/project-analyzer';

describe('ProjectAnalyzer', () => {
  it('should analyze a simple project', async () => {
    const analyzer = new ProjectAnalyzer();
    const analysis = await analyzer.analyzeProject('./test-fixtures/simple-app');

    expect(analysis.complexity).toBeGreaterThan(0);
    expect(analysis.complexity).toBeLessThanOrEqual(10);
    expect(analysis.estimatedHours).toBeGreaterThan(0);
    expect(analysis.phases.length).toBeGreaterThan(0);
  });

  it('should identify technologies correctly', async () => {
    const analyzer = new ProjectAnalyzer();
    const analysis = await analyzer.analyzeProject('./test-fixtures/react-app');

    expect(analysis.technologies).toContain('React');
  });
});
```

### **Integration Test**

```bash
# Create test project
mkdir test-project
cd test-project
npm init -y
echo "console.log('test');" > index.js

# Run analyzer
claude-optimizer analyze .

# Expected: Should complete without errors and show analysis
```

---

## Success Criteria Checklist

By end of Session 1, verify:

- [ ] TypeScript project compiles without errors
- [ ] All dependencies installed correctly
- [ ] File scanner identifies project metadata accurately
- [ ] Claude SDK integration works (uses Opus model)
- [ ] Session phases generated logically
- [ ] Database stores analysis correctly
- [ ] CLI command `analyze` works end-to-end
- [ ] Output is clear, colorful, and helpful
- [ ] Tests pass
- [ ] Code is well-documented
- [ ] README updated with Session 1 progress

---

## Handoff Preparation

At end of Session 1, create handoff document with:

1. **What was completed**
2. **What works** (demo the CLI)
3. **Known issues** or limitations
4. **Next session focus** (Calendar integration)
5. **Dependencies** for Session 2
6. **Any blocked items** or questions

Save as: `SESSION_1_HANDOFF.md`

---

## Agent Behavioral Guidelines

### **Code Quality**
- Write clean, readable TypeScript
- Add JSDoc comments for public methods
- Use proper error handling (try/catch)
- Follow consistent naming conventions
- Keep functions focused and small

### **Progress Communication**
- Use spinner/progress indicators
- Log key milestones
- Show colorful, informative output
- Provide helpful error messages

### **Problem Solving**
- If stuck for >15 minutes, document the blocker
- Try alternative approaches
- Use Claude SDK documentation
- Ask for clarification if requirements unclear

### **Time Management**
- Check hourly progress against plan
- Adjust scope if running behind
- Prioritize core functionality over polish
- Document any deferred items

---

## Emergency Protocols

**If Claude SDK fails:**
- Check API key configuration
- Verify model name is correct
- Test with simpler prompt first
- Fall back to basic analysis without AI

**If time runs short:**
Priority order:
1. File scanner (critical)
2. Basic analysis (critical)
3. Database (important)
4. CLI polish (nice-to-have)
5. Tests (can defer to Session 2)

**If dependencies don't install:**
- Check Node version (need 18+)
- Clear npm cache
- Try with yarn instead
- Document the issue for handoff

---

## Success = `claude-optimizer analyze ./test-project` works perfectly! 🚀
