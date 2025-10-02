#!/usr/bin/env node

/**
 * Advanced Planning Session Tool
 *
 * Reads session plans from docs/planning/, analyzes dependencies,
 * estimates tokens, and orchestrates multi-session workflows.
 *
 * Features:
 * - Automatic session plan discovery
 * - Dependency analysis (prerequisites, can-run-in-parallel)
 * - Token budget validation
 * - Multi-session scheduling
 * - Progress tracking across sessions
 */

import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';

interface SessionPlan {
  filename: string;
  sessionNumber: string;
  title: string;
  status: 'NOT STARTED' | 'IN PROGRESS' | 'COMPLETE';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  estimatedTime: string;
  estimatedTokens: string;
  tokenRange: { min: number; max: number } | null;
  fitsProQuota: boolean;
  prerequisites: string[];
  canRunInParallel: boolean;
  objectives: string[];
  phases: Array<{
    name: string;
    estimatedTokens: string;
    duration: string;
  }>;
}

interface DependencyGraph {
  [key: string]: {
    plan: SessionPlan;
    dependsOn: string[];
    blockedBy: string[];
    canSchedule: boolean;
  };
}

class AdvancedPlanningSession {
  private planningDir: string;
  private plans: Map<string, SessionPlan> = new Map();
  private dependencyGraph: DependencyGraph = {};

  constructor() {
    const projectRoot = process.cwd();
    this.planningDir = path.join(projectRoot, 'docs', 'planning');
  }

  /**
   * Main execution flow
   */
  async execute(): Promise<void> {
    console.log('');
    console.log(chalk.bold.cyan('🎯 Advanced Session Orchestration'));
    console.log(chalk.gray('━'.repeat(80)));
    console.log('');

    // Step 1: Discover session plans
    await this.discoverSessionPlans();

    // Step 2: Build dependency graph
    this.buildDependencyGraph();

    // Step 3: Analyze what can be scheduled
    const schedulable = this.findSchedulableSessions();

    // Step 4: Display recommendations
    this.displayRecommendations(schedulable);

    // Step 5: Show full orchestration plan
    this.displayOrchestrationPlan();

    console.log('');
  }

  /**
   * Discover all session plan files
   */
  private async discoverSessionPlans(): Promise<void> {
    console.log(chalk.cyan('📁 Discovering Session Plans'));
    console.log(chalk.gray('─'.repeat(80)));

    if (!fs.existsSync(this.planningDir)) {
      console.log(chalk.red(`✗ Planning directory not found: ${this.planningDir}`));
      process.exit(1);
    }

    const files = fs.readdirSync(this.planningDir)
      .filter(f => f.match(/SESSION_\d+[AB]?_PLAN\.md$/))
      .sort();

    if (files.length === 0) {
      console.log(chalk.yellow('⚠ No session plans found'));
      return;
    }

    console.log(`Found ${chalk.bold(files.length)} session plans:`);
    console.log('');

    for (const file of files) {
      const plan = await this.parseSessionPlan(file);
      if (plan) {
        this.plans.set(plan.sessionNumber, plan);

        const statusIcon = plan.status === 'COMPLETE' ? '✓' :
                          plan.status === 'IN PROGRESS' ? '●' : '○';
        const statusColor = plan.status === 'COMPLETE' ? chalk.green :
                           plan.status === 'IN PROGRESS' ? chalk.yellow : chalk.gray;

        console.log(`  ${statusColor(statusIcon)} ${chalk.bold(plan.sessionNumber)}: ${plan.title}`);
        console.log(`     Status: ${statusColor(plan.status)} | Priority: ${plan.priority}`);
        console.log(`     Tokens: ${plan.estimatedTokens} | Time: ${plan.estimatedTime}`);
        if (plan.prerequisites.length > 0) {
          console.log(`     Prerequisites: ${plan.prerequisites.join(', ')}`);
        }
        console.log('');
      }
    }
  }

  /**
   * Parse a session plan markdown file
   */
  private async parseSessionPlan(filename: string): Promise<SessionPlan | null> {
    const filepath = path.join(this.planningDir, filename);
    const content = fs.readFileSync(filepath, 'utf-8');

    // Extract session number from filename
    const sessionMatch = filename.match(/SESSION_(\d+[AB]?)_PLAN/);
    if (!sessionMatch) return null;
    const sessionNumber = sessionMatch[1];

    // Parse frontmatter metadata
    const titleMatch = content.match(/^# Session \d+[AB]?: (.+)$/m);
    const statusMatch = content.match(/\*\*Status\*\*:\s*[🟢🟡🔴⚪]\s*(\w+\s*\w*)\s*-\s*(.+?)$/m);
    const timeMatch = content.match(/\*\*Estimated Time\*\*:\s*(.+?)$/m);
    const tokensMatch = content.match(/\*\*Estimated Tokens\*\*:\s*(.+?)$/m);
    const quotaMatch = content.match(/\*\*Fits Pro Quota\*\*:\s*([✅❌])\s*(\w+)/m);
    const prereqMatch = content.match(/\*\*Prerequisites\*\*:\s*(.+?)$/m);
    const parallelMatch = content.match(/\*\*Can Run in Parallel\*\*:\s*([✅❌])\s*(\w+)/m);

    // Extract token range
    let tokenRange: { min: number; max: number } | null = null;
    if (tokensMatch) {
      const rangeMatch = tokensMatch[1].match(/(\d+)-(\d+)k/);
      if (rangeMatch) {
        tokenRange = {
          min: parseInt(rangeMatch[1]) * 1000,
          max: parseInt(rangeMatch[2]) * 1000
        };
      }
    }

    // Extract objectives
    const objectives: string[] = [];
    const objectivesSection = content.match(/## Session Objectives\s+### Primary Goals\s+([\s\S]+?)(?=###|---)/);
    if (objectivesSection) {
      const lines = objectivesSection[1].split('\n');
      for (const line of lines) {
        const match = line.match(/\d+\.\s*[✅❌]?\s*(.+)/);
        if (match) objectives.push(match[1].trim());
      }
    }

    // Extract phases
    const phases: Array<{ name: string; estimatedTokens: string; duration: string }> = [];
    const phasesSection = content.match(/## Token Estimation Breakdown\s+([\s\S]+?)(?=##|---|\n\n\n)/);
    if (phasesSection) {
      const phaseMatches = phasesSection[1].matchAll(/### Phase \d+: (.+?) \((.+?)\)\s+\*\*Estimated Tokens\*\*:\s*(.+?)$/gm);
      for (const match of phaseMatches) {
        phases.push({
          name: match[1],
          duration: match[2],
          estimatedTokens: match[3]
        });
      }
    }

    return {
      filename,
      sessionNumber,
      title: titleMatch ? titleMatch[1] : 'Unknown',
      status: statusMatch ? (statusMatch[2].includes('COMPLETE') ? 'COMPLETE' :
                            statusMatch[2].includes('PROGRESS') ? 'IN PROGRESS' : 'NOT STARTED') : 'NOT STARTED',
      priority: statusMatch ? (statusMatch[1].includes('HIGH') ? 'HIGH' :
                              statusMatch[1].includes('MEDIUM') ? 'MEDIUM' : 'LOW') : 'MEDIUM',
      estimatedTime: timeMatch ? timeMatch[1] : 'Unknown',
      estimatedTokens: tokensMatch ? tokensMatch[1] : 'Unknown',
      tokenRange,
      fitsProQuota: quotaMatch ? quotaMatch[1] === '✅' : false,
      prerequisites: prereqMatch ? this.parsePrerequisites(prereqMatch[1]) : [],
      canRunInParallel: parallelMatch ? parallelMatch[1] === '✅' : false,
      objectives,
      phases
    };
  }

  /**
   * Parse prerequisites string
   */
  private parsePrerequisites(prereqString: string): string[] {
    const matches = prereqString.matchAll(/SESSION\s+(\d+[AB]?)/g);
    return Array.from(matches).map(m => m[1]);
  }

  /**
   * Build dependency graph
   */
  private buildDependencyGraph(): void {
    for (const [sessionNum, plan] of this.plans) {
      const dependsOn = plan.prerequisites;
      const blockedBy: string[] = [];

      // Find what's blocking this session
      for (const prereq of dependsOn) {
        const prereqPlan = this.plans.get(prereq);
        if (prereqPlan && prereqPlan.status !== 'COMPLETE') {
          blockedBy.push(prereq);
        }
      }

      this.dependencyGraph[sessionNum] = {
        plan,
        dependsOn,
        blockedBy,
        canSchedule: blockedBy.length === 0 && plan.status === 'NOT STARTED'
      };
    }
  }

  /**
   * Find sessions that can be scheduled now
   */
  private findSchedulableSessions(): string[] {
    return Object.entries(this.dependencyGraph)
      .filter(([_, node]) => node.canSchedule)
      .map(([sessionNum, _]) => sessionNum)
      .sort();
  }

  /**
   * Display recommendations
   */
  private displayRecommendations(schedulable: string[]): void {
    console.log(chalk.cyan('🎯 Scheduling Recommendations'));
    console.log(chalk.gray('─'.repeat(80)));
    console.log('');

    if (schedulable.length === 0) {
      console.log(chalk.yellow('⚠ No sessions ready to schedule'));
      console.log(chalk.gray('  All sessions are either complete or blocked by prerequisites'));
      console.log('');
      return;
    }

    console.log(chalk.green(`✓ ${schedulable.length} session(s) ready to schedule:`));
    console.log('');

    for (const sessionNum of schedulable) {
      const node = this.dependencyGraph[sessionNum];
      const plan = node.plan;

      console.log(`  ${chalk.bold.cyan(`SESSION ${sessionNum}`)}: ${plan.title}`);
      console.log(`    Priority: ${chalk.bold(plan.priority)}`);
      console.log(`    Estimated: ${plan.estimatedTokens} tokens (~${plan.estimatedTime})`);
      console.log(`    Fits quota: ${plan.fitsProQuota ? chalk.green('✓ YES') : chalk.red('✗ NO')}`);

      if (plan.phases.length > 0) {
        console.log(`    Phases:`);
        plan.phases.forEach((phase, i) => {
          console.log(`      ${i + 1}. ${phase.name} (${phase.duration}) - ${phase.estimatedTokens}`);
        });
      }
      console.log('');
    }
  }

  /**
   * Display full orchestration plan
   */
  private displayOrchestrationPlan(): void {
    console.log(chalk.cyan('📊 Full Orchestration Plan'));
    console.log(chalk.gray('─'.repeat(80)));
    console.log('');

    const sessions = Array.from(this.plans.entries()).sort((a, b) => {
      const numA = parseInt(a[0].replace(/[AB]/, ''));
      const numB = parseInt(b[0].replace(/[AB]/, ''));
      return numA - numB;
    });

    for (const [sessionNum, plan] of sessions) {
      const node = this.dependencyGraph[sessionNum];
      const icon = plan.status === 'COMPLETE' ? chalk.green('✓') :
                   plan.status === 'IN PROGRESS' ? chalk.yellow('●') :
                   node.canSchedule ? chalk.cyan('○') : chalk.gray('◯');

      let statusText = '';
      if (plan.status === 'COMPLETE') {
        statusText = chalk.green('COMPLETE');
      } else if (plan.status === 'IN PROGRESS') {
        statusText = chalk.yellow('IN PROGRESS');
      } else if (node.canSchedule) {
        statusText = chalk.cyan('READY TO SCHEDULE');
      } else {
        statusText = chalk.gray(`BLOCKED BY: ${node.blockedBy.join(', ')}`);
      }

      console.log(`${icon} SESSION ${chalk.bold(sessionNum)}: ${plan.title}`);
      console.log(`   ${statusText}`);

      if (node.dependsOn.length > 0) {
        const deps = node.dependsOn.map(d => {
          const depPlan = this.plans.get(d);
          return depPlan?.status === 'COMPLETE' ? chalk.green(d) : chalk.gray(d);
        });
        console.log(`   Prerequisites: ${deps.join(' → ')}`);
      }
      console.log('');
    }

    // Show execution timeline
    console.log(chalk.cyan('📅 Suggested Execution Timeline'));
    console.log(chalk.gray('─'.repeat(80)));
    console.log('');

    const timeline = this.generateTimeline();
    timeline.forEach((phase, i) => {
      console.log(chalk.bold(`Phase ${i + 1}:`));
      phase.forEach(sessionNum => {
        const plan = this.plans.get(sessionNum)!;
        console.log(`  • SESSION ${sessionNum}: ${plan.title} (${plan.estimatedTime})`);
      });
      console.log('');
    });
  }

  /**
   * Generate execution timeline (topological sort)
   */
  private generateTimeline(): string[][] {
    const timeline: string[][] = [];
    const completed = new Set<string>();
    const remaining = new Set(this.plans.keys());

    while (remaining.size > 0) {
      const currentPhase: string[] = [];

      for (const sessionNum of remaining) {
        const node = this.dependencyGraph[sessionNum];

        // Check if all dependencies are completed
        const allDepsComplete = node.dependsOn.every(dep => {
          const depPlan = this.plans.get(dep);
          return depPlan?.status === 'COMPLETE' || completed.has(dep);
        });

        if (allDepsComplete && node.plan.status !== 'COMPLETE') {
          currentPhase.push(sessionNum);
        }
      }

      if (currentPhase.length === 0) break;

      timeline.push(currentPhase.sort());
      currentPhase.forEach(s => {
        completed.add(s);
        remaining.delete(s);
      });
    }

    return timeline;
  }
}

// Main execution
async function main() {
  try {
    const planner = new AdvancedPlanningSession();
    await planner.execute();
  } catch (error) {
    console.error(chalk.red('\n❌ Error:'), (error as Error).message);
    if (process.env.DEBUG) {
      console.error((error as Error).stack);
    }
    process.exit(1);
  }
}

main().catch(error => {
  console.error(chalk.red('\n❌ Unexpected error:'), error);
  process.exit(1);
});