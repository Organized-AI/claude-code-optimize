#!/usr/bin/env node

/**
 * Memory Report Command
 * Generate beautiful HTML report from project memory
 */

import * as fs from 'fs';
import * as path from 'path';
import * as process from 'process';
import chalk from 'chalk';
import open from 'open';
import { SessionMemoryManager, SessionHistory } from '../session-memory.js';
import { MemoryStats } from './memory-stats.js';

export class MemoryReport {
  constructor(private memoryManager: SessionMemoryManager) {}

  async generate(
    projectPath: string,
    outputPath?: string
  ): Promise<string> {
    const memory = await this.memoryManager.loadProjectMemory(projectPath);
    const stats = await new MemoryStats(this.memoryManager).getStats(projectPath);

    const html = this.generateHTML(memory, stats);

    const reportPath = outputPath || path.join(projectPath, 'memory-report.html');
    fs.writeFileSync(reportPath, html, 'utf8');

    return reportPath;
  }

  private generateHTML(memory: any, stats: any): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Memory Report - ${memory.projectName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      line-height: 1.6;
      color: #1f2937;
      background: #f9fafb;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem 1rem;
    }

    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 3rem 2rem;
      border-radius: 12px;
      margin-bottom: 2rem;
      box-shadow: 0 10px 25px rgba(102, 126, 234, 0.3);
    }

    .header h1 {
      font-size: 2.5rem;
      margin-bottom: 0.5rem;
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .header p {
      opacity: 0.9;
      font-size: 1.1rem;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .stat-card {
      background: white;
      padding: 2rem;
      border-radius: 10px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .stat-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
    }

    .stat-card h3 {
      font-size: 0.9rem;
      color: #6b7280;
      margin-bottom: 0.5rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .stat-card .value {
      font-size: 2.5rem;
      font-weight: bold;
      color: #667eea;
    }

    .stat-card .subtext {
      font-size: 0.9rem;
      color: #9ca3af;
      margin-top: 0.25rem;
    }

    .section {
      background: white;
      padding: 2rem;
      border-radius: 10px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      margin-bottom: 2rem;
    }

    .section h2 {
      font-size: 1.5rem;
      margin-bottom: 1.5rem;
      color: #374151;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding-bottom: 0.75rem;
      border-bottom: 2px solid #e5e7eb;
    }

    .tech-stack {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      margin-top: 1rem;
    }

    .tech-badge {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 0.5rem 1rem;
      border-radius: 20px;
      font-size: 0.9rem;
      font-weight: 500;
    }

    .timeline {
      position: relative;
      padding-left: 2rem;
    }

    .timeline::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 3px;
      background: linear-gradient(180deg, #667eea 0%, #764ba2 100%);
      border-radius: 2px;
    }

    .session {
      position: relative;
      margin-bottom: 2rem;
      padding-left: 2rem;
    }

    .session::before {
      content: '';
      position: absolute;
      left: -2.375rem;
      top: 0.5rem;
      width: 12px;
      height: 12px;
      background: #667eea;
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 0 0 2px #667eea;
    }

    .session h3 {
      color: #667eea;
      margin-bottom: 0.5rem;
      font-size: 1.1rem;
    }

    .session .meta {
      display: flex;
      gap: 1.5rem;
      flex-wrap: wrap;
      margin-bottom: 0.75rem;
      font-size: 0.9rem;
      color: #6b7280;
    }

    .session .meta span {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .session ul {
      margin-left: 1.5rem;
      margin-top: 0.5rem;
    }

    .session li {
      margin-bottom: 0.25rem;
      color: #4b5563;
    }

    .decisions-list {
      counter-reset: decision;
      list-style: none;
      margin-left: 0;
    }

    .decisions-list li {
      counter-increment: decision;
      margin-bottom: 1rem;
      padding-left: 2rem;
      position: relative;
      line-height: 1.5;
    }

    .decisions-list li::before {
      content: counter(decision);
      position: absolute;
      left: 0;
      top: 0;
      background: #667eea;
      color: white;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      font-weight: bold;
    }

    .empty-state {
      text-align: center;
      padding: 3rem;
      color: #9ca3af;
    }

    .footer {
      text-align: center;
      color: #6b7280;
      margin-top: 3rem;
      padding-top: 2rem;
      border-top: 1px solid #e5e7eb;
    }

    .trend {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.85rem;
      font-weight: 600;
    }

    .trend.improving {
      background: #d1fae5;
      color: #065f46;
    }

    .trend.declining {
      background: #fee2e2;
      color: #991b1b;
    }

    .trend.stable {
      background: #fef3c7;
      color: #92400e;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📚 ${this.escapeHtml(memory.projectName)}</h1>
      <p>Project Memory Report • Generated ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
    </div>

    ${this.renderStats(stats)}
    ${this.renderTechStack(memory)}
    ${this.renderDecisions(memory)}
    ${this.renderTimeline(memory)}

    <div class="footer">
      <p>Generated by Claude Code Optimizer v2.0</p>
      <p style="font-size: 0.85rem; margin-top: 0.5rem;">Session Memory System</p>
    </div>
  </div>
</body>
</html>`;
  }

  private renderStats(stats: any): string {
    const trendClass = stats.efficiency.trend;
    const trendIcons: { [key: string]: string } = {
      improving: '↗️',
      declining: '↘️',
      stable: '→'
    };
    const trendIcon = trendIcons[trendClass] || '→';

    return `
    <div class="stats-grid">
      <div class="stat-card">
        <h3>Total Sessions</h3>
        <div class="value">${stats.totalSessions}</div>
        <div class="subtext">${stats.dateRange.durationDays} days</div>
      </div>
      <div class="stat-card">
        <h3>Total Tokens</h3>
        <div class="value">${(stats.totalTokens / 1000).toFixed(0)}k</div>
        <div class="subtext">avg ${(stats.avgTokensPerSession / 1000).toFixed(1)}k per session</div>
      </div>
      <div class="stat-card">
        <h3>Key Decisions</h3>
        <div class="value">${stats.totalDecisions}</div>
        <div class="subtext">${stats.filesModified} files modified</div>
      </div>
      <div class="stat-card">
        <h3>Efficiency</h3>
        <div class="value">${(stats.efficiency.tokensPerTask / 1000).toFixed(1)}k</div>
        <div class="subtext">
          <span class="trend ${trendClass}">${trendIcon} ${trendClass}</span>
        </div>
      </div>
    </div>`;
  }

  private renderTechStack(memory: any): string {
    if (memory.cumulativeContext.techStack.length === 0) {
      return '';
    }

    const badges = memory.cumulativeContext.techStack
      .map((tech: string) => `<span class="tech-badge">${this.escapeHtml(tech)}</span>`)
      .join('');

    return `
    <div class="section">
      <h2>🛠 Tech Stack</h2>
      <div class="tech-stack">${badges}</div>
      <div style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid #e5e7eb;">
        <p><strong>Architecture:</strong> ${this.escapeHtml(memory.cumulativeContext.architecture)}</p>
        <p><strong>Testing:</strong> ${this.escapeHtml(memory.cumulativeContext.testingFramework)}</p>
        <p><strong>Build:</strong> ${this.escapeHtml(memory.cumulativeContext.buildSystem)}</p>
      </div>
    </div>`;
  }

  private renderDecisions(memory: any): string {
    if (memory.cumulativeContext.keyDecisions.length === 0) {
      return `
      <div class="section">
        <h2>💡 Key Decisions</h2>
        <div class="empty-state">No decisions recorded yet</div>
      </div>`;
    }

    const decisions = memory.cumulativeContext.keyDecisions
      .map((decision: string) => `<li>${this.escapeHtml(decision)}</li>`)
      .join('');

    return `
    <div class="section">
      <h2>💡 Key Decisions</h2>
      <ol class="decisions-list">${decisions}</ol>
    </div>`;
  }

  private renderTimeline(memory: any): string {
    if (memory.sessions.length === 0) {
      return `
      <div class="section">
        <h2>📝 Session Timeline</h2>
        <div class="empty-state">No sessions recorded yet</div>
      </div>`;
    }

    const sessions = memory.sessions
      .map((session: SessionHistory) => {
        const objectives = session.objectives
          .map(obj => `<li>${this.escapeHtml(obj)}</li>`)
          .join('');

        const tasks = session.completedTasks
          .map(task => `<li>${this.escapeHtml(task)}</li>`)
          .join('');

        const decisions = session.keyDecisions.length > 0
          ? `<div style="margin-top: 0.75rem;">
               <strong>Decisions:</strong>
               <ul>${session.keyDecisions.map(d => `<li>${this.escapeHtml(d)}</li>`).join('')}</ul>
             </div>`
          : '';

        return `
        <div class="session">
          <h3>Session ${session.sessionNumber}</h3>
          <div class="meta">
            <span>📅 ${new Date(session.startTime).toLocaleDateString()}</span>
            <span>🎯 ${session.tokensUsed.toLocaleString()} tokens</span>
            <span>📄 ${session.filesModified.length} files</span>
          </div>
          <div>
            <strong>Objectives:</strong>
            <ul>${objectives}</ul>
          </div>
          <div style="margin-top: 0.5rem;">
            <strong>Completed:</strong>
            <ul>${tasks}</ul>
          </div>
          ${decisions}
        </div>`;
      })
      .join('');

    return `
    <div class="section">
      <h2>📝 Session Timeline</h2>
      <div class="timeline">${sessions}</div>
    </div>`;
  }

  private escapeHtml(text: string): string {
    const map: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }
}

// CLI Entry Point
async function main() {
  const args = process.argv.slice(2);

  const noOpen = args.includes('--no-open');
  const outputArg = args.indexOf('--output');
  const outputPath = outputArg !== -1 ? args[outputArg + 1] : undefined;

  // Get project path
  let projectPath = process.cwd();
  const pathArg = args.find(arg => !arg.startsWith('--') && arg !== outputPath);
  if (pathArg) {
    projectPath = path.resolve(pathArg);
  }

  const memoryManager = new SessionMemoryManager();
  const reporter = new MemoryReport(memoryManager);

  try {
    console.log(chalk.blue('📊 Generating memory report...'));
    console.log(chalk.gray(`  Project: ${projectPath}`));
    console.log();

    const reportPath = await reporter.generate(projectPath, outputPath);

    console.log(chalk.green('✅ Report generated!'));
    console.log(chalk.cyan(`  ${reportPath}`));
    console.log();

    if (!noOpen) {
      console.log(chalk.gray('Opening in browser...'));
      await open(reportPath);
    } else {
      console.log(chalk.gray('Use --no-open to skip browser launch'));
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error(chalk.red('❌ Error:'), error.message);
    }
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
