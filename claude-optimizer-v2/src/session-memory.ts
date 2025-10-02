/**
 * Session Memory System
 * Preserves cumulative project knowledge across all sessions
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as os from 'os';

export interface SessionHistory {
  sessionId: string;
  sessionNumber: number;
  startTime: Date;
  endTime?: Date;
  objectives: string[];
  completedTasks: string[];
  keyDecisions: string[];
  tokensUsed: number;
  filesModified: string[];
}

export interface ProjectMemory {
  projectPath: string;
  projectName: string;
  createdAt: Date;
  lastSessionAt: Date;
  totalSessions: number;
  sessions: SessionHistory[];
  cumulativeContext: {
    techStack: string[];
    architecture: string;
    testingFramework: string;
    buildSystem: string;
    keyDecisions: string[];
    commonPatterns: string[];
  };
}

export class SessionMemoryManager {
  private readonly MEMORY_DIR: string;

  constructor(dataDir?: string) {
    const home = os.homedir();
    this.MEMORY_DIR = path.join(dataDir || path.join(home, '.claude'), 'project-memory');

    // Ensure directory exists
    if (!fs.existsSync(this.MEMORY_DIR)) {
      fs.mkdirSync(this.MEMORY_DIR, { recursive: true });
    }
  }

  /**
   * Save session to project memory
   */
  async saveSessionMemory(
    projectPath: string,
    session: SessionHistory
  ): Promise<void> {
    const memory = await this.loadProjectMemory(projectPath);
    memory.sessions.push(session);
    memory.lastSessionAt = session.endTime || new Date();
    memory.totalSessions++;

    await this.updateCumulativeContext(memory, session);
    await this.persistMemory(memory);
  }

  /**
   * Load project memory (create if first session)
   */
  async loadProjectMemory(projectPath: string): Promise<ProjectMemory> {
    const memoryFile = this.getMemoryFilePath(projectPath);

    if (!fs.existsSync(memoryFile)) {
      return await this.initializeProjectMemory(projectPath);
    }

    const content = fs.readFileSync(memoryFile, 'utf8');
    const memory = JSON.parse(content);

    // Convert date strings back to Date objects
    memory.createdAt = new Date(memory.createdAt);
    memory.lastSessionAt = new Date(memory.lastSessionAt);
    memory.sessions = memory.sessions.map((s: any) => ({
      ...s,
      startTime: new Date(s.startTime),
      endTime: s.endTime ? new Date(s.endTime) : undefined
    }));

    return memory;
  }

  /**
   * Update cumulative context from session
   */
  private async updateCumulativeContext(
    memory: ProjectMemory,
    session: SessionHistory
  ): Promise<void> {
    // Add key decisions (avoid duplicates)
    session.keyDecisions.forEach(decision => {
      if (!memory.cumulativeContext.keyDecisions.includes(decision)) {
        memory.cumulativeContext.keyDecisions.push(decision);
      }
    });

    // Detect tech stack changes
    const detectedStack = await this.detectTechStack(memory.projectPath);
    memory.cumulativeContext.techStack = detectedStack;

    // Update testing framework and build system
    const { testing, build } = await this.detectTooling(memory.projectPath);
    memory.cumulativeContext.testingFramework = testing;
    memory.cumulativeContext.buildSystem = build;
  }

  /**
   * Generate context injection for session start
   */
  injectContextOnStart(memory: ProjectMemory): string {
    const recentSessions = memory.sessions.slice(-5);
    const recentDecisions = memory.cumulativeContext.keyDecisions.slice(-10);

    let context = `# 📚 Project Memory: ${memory.projectName}\n\n`;

    context += `## 📊 Session History\n`;
    context += `- **Total Sessions**: ${memory.totalSessions}\n`;
    context += `- **First Session**: ${memory.createdAt.toLocaleDateString()}\n`;
    context += `- **Last Session**: ${memory.lastSessionAt.toLocaleDateString()}\n\n`;

    context += `## 🛠 Tech Stack\n`;
    if (memory.cumulativeContext.techStack.length > 0) {
      memory.cumulativeContext.techStack.forEach(tech => {
        context += `- ${tech}\n`;
      });
    } else {
      context += `- Detecting...\n`;
    }
    context += `\n`;

    context += `## 🏗 Architecture\n`;
    context += `${memory.cumulativeContext.architecture}\n\n`;
    context += `**Testing**: ${memory.cumulativeContext.testingFramework}\n`;
    context += `**Build**: ${memory.cumulativeContext.buildSystem}\n\n`;

    context += `## 💡 Key Decisions\n`;
    if (recentDecisions.length > 0) {
      recentDecisions.forEach((decision, i) => {
        context += `${i + 1}. ${decision}\n`;
      });
    } else {
      context += `No decisions recorded yet\n`;
    }
    context += `\n`;

    context += `## 📝 Recent Sessions\n`;
    if (recentSessions.length > 0) {
      recentSessions.forEach(session => {
        context += `\n### Session ${session.sessionNumber} (${new Date(session.startTime).toLocaleDateString()})\n`;
        context += `- **Objectives**: ${session.objectives.join(', ')}\n`;
        context += `- **Completed**: ${session.completedTasks.length} tasks\n`;
        context += `- **Tokens Used**: ${session.tokensUsed.toLocaleString()}\n`;
        context += `- **Files Modified**: ${session.filesModified.length}\n`;
        if (session.keyDecisions.length > 0) {
          context += `- **Decisions**: ${session.keyDecisions.join('; ')}\n`;
        }
      });
    } else {
      context += `No sessions recorded yet\n`;
    }
    context += `\n---\n\n`;
    context += `**This context is automatically injected. All previous session knowledge is preserved.**\n\n`;

    return context;
  }

  /**
   * Detect tech stack from project files
   */
  private async detectTechStack(projectPath: string): Promise<string[]> {
    const stack: string[] = [];

    // Node.js / JavaScript / TypeScript
    if (this.fileExists(projectPath, 'package.json')) {
      stack.push('Node.js');

      const pkgPath = path.join(projectPath, 'package.json');
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

      // Framework detection
      if (pkg.dependencies?.react || pkg.devDependencies?.react) stack.push('React');
      if (pkg.dependencies?.vue || pkg.devDependencies?.vue) stack.push('Vue');
      if (pkg.dependencies?.express || pkg.devDependencies?.express) stack.push('Express');
      if (pkg.dependencies?.next || pkg.devDependencies?.next) stack.push('Next.js');
      if (pkg.dependencies?.['@angular/core']) stack.push('Angular');
      if (pkg.dependencies?.svelte || pkg.devDependencies?.svelte) stack.push('Svelte');

      // TypeScript
      if (pkg.devDependencies?.typescript || this.fileExists(projectPath, 'tsconfig.json')) {
        stack.push('TypeScript');
      }

      // Testing frameworks
      if (pkg.devDependencies?.jest) stack.push('Jest');
      if (pkg.devDependencies?.vitest) stack.push('Vitest');
      if (pkg.devDependencies?.mocha) stack.push('Mocha');
      if (pkg.devDependencies?.['@playwright/test']) stack.push('Playwright');
    }

    // Python
    if (this.fileExists(projectPath, 'requirements.txt') ||
        this.fileExists(projectPath, 'pyproject.toml') ||
        this.fileExists(projectPath, 'setup.py')) {
      stack.push('Python');
    }

    // Rust
    if (this.fileExists(projectPath, 'Cargo.toml')) {
      stack.push('Rust');
    }

    // Go
    if (this.fileExists(projectPath, 'go.mod')) {
      stack.push('Go');
    }

    // Build systems
    if (this.fileExists(projectPath, 'Makefile')) {
      stack.push('Make');
    }

    if (this.fileExists(projectPath, 'docker-compose.yml') ||
        this.fileExists(projectPath, 'Dockerfile')) {
      stack.push('Docker');
    }

    return [...new Set(stack)]; // Remove duplicates
  }

  /**
   * Detect testing framework and build system
   */
  private async detectTooling(projectPath: string): Promise<{ testing: string; build: string }> {
    let testing = 'Unknown';
    let build = 'Unknown';

    if (this.fileExists(projectPath, 'package.json')) {
      const pkgPath = path.join(projectPath, 'package.json');
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

      // Testing
      if (pkg.devDependencies?.jest) testing = 'Jest';
      else if (pkg.devDependencies?.vitest) testing = 'Vitest';
      else if (pkg.devDependencies?.mocha) testing = 'Mocha';
      else if (pkg.devDependencies?.['@playwright/test']) testing = 'Playwright';
      else if (pkg.devDependencies?.cypress) testing = 'Cypress';

      // Build
      if (pkg.scripts?.build) {
        if (pkg.scripts.build.includes('webpack')) build = 'Webpack';
        else if (pkg.scripts.build.includes('vite')) build = 'Vite';
        else if (pkg.scripts.build.includes('rollup')) build = 'Rollup';
        else if (pkg.scripts.build.includes('tsc')) build = 'TypeScript Compiler';
        else build = 'npm scripts';
      }
    }

    if (this.fileExists(projectPath, 'Makefile')) {
      build = 'Make';
    }

    if (this.fileExists(projectPath, 'Cargo.toml')) {
      testing = 'Cargo test';
      build = 'Cargo';
    }

    if (this.fileExists(projectPath, 'go.mod')) {
      testing = 'go test';
      build = 'go build';
    }

    return { testing, build };
  }

  /**
   * Check if file exists in project
   */
  private fileExists(projectPath: string, filename: string): boolean {
    return fs.existsSync(path.join(projectPath, filename));
  }

  /**
   * Get memory file path with project hash
   */
  private getMemoryFilePath(projectPath: string): string {
    // Hash project path for consistent ID
    const hash = crypto
      .createHash('md5')
      .update(path.resolve(projectPath))
      .digest('hex');

    return path.join(this.MEMORY_DIR, `${hash}.json`);
  }

  /**
   * Initialize memory for new project
   */
  private async initializeProjectMemory(
    projectPath: string
  ): Promise<ProjectMemory> {
    const projectName = path.basename(projectPath);
    const techStack = await this.detectTechStack(projectPath);
    const { testing, build } = await this.detectTooling(projectPath);

    // Try to detect architecture from README or project structure
    let architecture = 'Detecting...';
    const readmePath = path.join(projectPath, 'README.md');
    if (fs.existsSync(readmePath)) {
      const readme = fs.readFileSync(readmePath, 'utf8').toLowerCase();
      if (readme.includes('cli') || readme.includes('command')) {
        architecture = 'CLI tool';
      } else if (readme.includes('api') || readme.includes('server')) {
        architecture = 'API/Server';
      } else if (readme.includes('library') || readme.includes('package')) {
        architecture = 'Library/Package';
      } else if (readme.includes('web app') || readme.includes('dashboard')) {
        architecture = 'Web Application';
      }
    }

    const memory: ProjectMemory = {
      projectPath,
      projectName,
      createdAt: new Date(),
      lastSessionAt: new Date(),
      totalSessions: 0,
      sessions: [],
      cumulativeContext: {
        techStack,
        architecture,
        testingFramework: testing,
        buildSystem: build,
        keyDecisions: [],
        commonPatterns: []
      }
    };

    // Save initial memory
    await this.persistMemory(memory);

    return memory;
  }

  /**
   * Persist memory to disk
   */
  private async persistMemory(memory: ProjectMemory): Promise<void> {
    const memoryFile = this.getMemoryFilePath(memory.projectPath);
    const memoryDir = path.dirname(memoryFile);

    // Ensure directory exists
    if (!fs.existsSync(memoryDir)) {
      fs.mkdirSync(memoryDir, { recursive: true });
    }

    // Write memory with pretty formatting
    fs.writeFileSync(
      memoryFile,
      JSON.stringify(memory, null, 2),
      'utf8'
    );
  }

  /**
   * Generate unique session ID
   */
  generateSessionId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `session-${timestamp}-${random}`;
  }
}
