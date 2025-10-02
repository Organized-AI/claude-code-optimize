#!/usr/bin/env node

/**
 * Intelligent Session Orchestrator
 *
 * Reads the latest HANDOFF file to understand where we are,
 * determines the next session to run, generates the kickoff prompt,
 * and optionally launches it automatically in Claude Code.
 *
 * This creates seamless session continuity where each session
 * picks up exactly where the last one left off.
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import chalk from 'chalk';

interface HandoffData {
  filename: string;
  fromSession: string;
  toSession: string;
  created: string;
  contextStatus: string;
  quotaStatus: string;
  accomplishments: string[];
  nextObjectives: Array<{
    priority: string;
    title: string;
    description: string;
  }>;
  knownIssues: string[];
  todoItems: string[];
}

interface NextSessionPlan {
  sessionNumber: string;
  title: string;
  planFile: string;
  estimated: {
    tokens: string;
    time: string;
  };
  prerequisites: string[];
  allPrereqsMet: boolean;
}

class SessionOrchestrator {
  private projectRoot: string;
  private planningDir: string;
  private latestHandoff: HandoffData | null = null;
  private nextPlan: NextSessionPlan | null = null;

  constructor() {
    this.projectRoot = process.cwd();
    this.planningDir = path.join(this.projectRoot, 'docs', 'planning');
  }

  /**
   * Main orchestration flow
   */
  async execute(autoLaunch: boolean = false): Promise<void> {
    console.log('');
    console.log(chalk.bold.cyan('🎯 Intelligent Session Orchestrator'));
    console.log(chalk.gray('━'.repeat(80)));
    console.log('');

    // Step 1: Find and parse latest handoff
    await this.findLatestHandoff();

    if (!this.latestHandoff) {
      console.log(chalk.yellow('⚠ No handoff files found - starting fresh'));
      await this.handleFreshStart();
      return;
    }

    // Step 2: Determine next session
    await this.determineNextSession();

    // Step 3: Generate kickoff prompt
    const kickoffPrompt = await this.generateKickoffPrompt();

    // Step 4: Display the plan
    this.displayOrchestrationPlan(kickoffPrompt);

    // Step 5: Optionally auto-launch
    if (autoLaunch) {
      await this.launchSession(kickoffPrompt);
    } else {
      await this.savePromptForManualUse(kickoffPrompt);
    }
  }

  /**
   * Find the most recent handoff file
   */
  private async findLatestHandoff(): Promise<void> {
    console.log(chalk.cyan('📄 Finding Latest Handoff'));
    console.log(chalk.gray('─'.repeat(80)));

    const handoffFiles = fs.readdirSync(this.planningDir)
      .filter(f => f.match(/SESSION_\d+_HANDOFF\.md$/))
      .sort()
      .reverse(); // Most recent first

    if (handoffFiles.length === 0) {
      console.log(chalk.gray('  No handoff files found'));
      return;
    }

    const latestFile = handoffFiles[0];
    console.log(`  ${chalk.green('✓')} Found: ${chalk.bold(latestFile)}`);
    console.log('');

    // Parse the handoff
    this.latestHandoff = await this.parseHandoff(latestFile);

    console.log(chalk.cyan('📊 Current State'));
    console.log(chalk.gray('─'.repeat(80)));
    console.log(`  From Session: ${chalk.bold(this.latestHandoff.fromSession)}`);
    console.log(`  To Session:   ${chalk.bold(this.latestHandoff.toSession)}`);
    console.log(`  Context:      ${this.latestHandoff.contextStatus}`);
    console.log(`  Quota:        ${this.latestHandoff.quotaStatus}`);
    console.log('');
  }

  /**
   * Parse handoff markdown file
   */
  private async parseHandoff(filename: string): Promise<HandoffData> {
    const filepath = path.join(this.planningDir, filename);
    const content = fs.readFileSync(filepath, 'utf-8');

    // Extract metadata
    const fromMatch = content.match(/\*\*From Session\*\*:\s*(.+)/);
    const toMatch = content.match(/\*\*To Session\*\*:\s*(.+)/);
    const createdMatch = content.match(/\*\*Created\*\*:\s*(.+)/);
    const contextMatch = content.match(/\*\*Context Status\*\*:\s*(.+)/);
    const quotaMatch = content.match(/\*\*Quota Status\*\*:\s*(.+)/);

    // Extract accomplishments
    const accomplishments: string[] = [];
    const accomplishSection = content.match(/## 🎯 What Was Accomplished[\s\S]+?(?=##|$)/);
    if (accomplishSection) {
      const bullets = accomplishSection[0].match(/^[-*]\s+(.+)$/gm);
      if (bullets) {
        accomplishments.push(...bullets.map(b => b.replace(/^[-*]\s+/, '')));
      }
    }

    // Extract next objectives
    const nextObjectives: Array<{ priority: string; title: string; description: string }> = [];
    const nextSection = content.match(/## 🎯 Next Session Objectives[\s\S]+?(?=##|$)/);
    if (nextSection) {
      const options = nextSection[0].matchAll(/### (Option \d+): (.+?)\s+(?:From|Priority:)?([^#]+?)(?=###|$)/gs);
      for (const match of options) {
        nextObjectives.push({
          priority: match[1],
          title: match[2].trim(),
          description: match[3].trim()
        });
      }
    }

    return {
      filename,
      fromSession: fromMatch ? fromMatch[1] : 'Unknown',
      toSession: toMatch ? toMatch[1] : 'Unknown',
      created: createdMatch ? createdMatch[1] : 'Unknown',
      contextStatus: contextMatch ? contextMatch[1] : 'Unknown',
      quotaStatus: quotaMatch ? quotaMatch[1] : 'Unknown',
      accomplishments,
      nextObjectives,
      knownIssues: [],
      todoItems: []
    };
  }

  /**
   * Determine the next session to run
   */
  private async determineNextSession(): Promise<void> {
    console.log(chalk.cyan('🔍 Determining Next Session'));
    console.log(chalk.gray('─'.repeat(80)));

    // Extract session number: "Session 7" → "7", "7" → "7"
    const toSession = this.latestHandoff!.toSession;
    const sessionNumber = toSession.match(/(\d+[AB]?)/)?.[1] || toSession;

    const planFile = `SESSION_${sessionNumber}_PLAN.md`;
    const planPath = path.join(this.planningDir, planFile);

    if (fs.existsSync(planPath)) {
      console.log(`  ${chalk.green('✓')} Found plan: ${chalk.bold(planFile)}`);

      // Parse the plan to get details
      const planContent = fs.readFileSync(planPath, 'utf-8');
      const titleMatch = planContent.match(/^# Session \d+[AB]?: (.+)$/m);
      const tokensMatch = planContent.match(/\*\*Estimated Tokens\*\*:\s*(.+)/);
      const timeMatch = planContent.match(/\*\*Estimated Time\*\*:\s*(.+)/);
      const prereqMatch = planContent.match(/\*\*Prerequisites\*\*:\s*(.+)/);

      this.nextPlan = {
        sessionNumber,
        title: titleMatch ? titleMatch[1] : 'Unknown',
        planFile,
        estimated: {
          tokens: tokensMatch ? tokensMatch[1] : 'Unknown',
          time: timeMatch ? timeMatch[1] : 'Unknown'
        },
        prerequisites: prereqMatch ? this.parsePrerequisites(prereqMatch[1]) : [],
        allPrereqsMet: true // We'll validate this
      };

      console.log(`  Title:        ${this.nextPlan.title}`);
      console.log(`  Estimated:    ${this.nextPlan.estimated.tokens} (${this.nextPlan.estimated.time})`);

      if (this.nextPlan.prerequisites.length > 0) {
        console.log(`  Prerequisites: ${this.nextPlan.prerequisites.join(', ')}`);
        // TODO: Validate prerequisites are actually complete
      }
      console.log('');
    } else {
      console.log(chalk.yellow(`  ⚠ No plan found for Session ${sessionNumber}`));
      console.log(chalk.gray(`    Expected: ${planFile}`));
      console.log('');

      // Use the next objectives from handoff instead
      if (this.latestHandoff!.nextObjectives.length > 0) {
        const firstObjective = this.latestHandoff!.nextObjectives[0];
        this.nextPlan = {
          sessionNumber,
          title: firstObjective.title,
          planFile: '',
          estimated: {
            tokens: 'TBD',
            time: 'TBD'
          },
          prerequisites: [],
          allPrereqsMet: true
        };
      }
    }
  }

  /**
   * Generate the kickoff prompt for next session
   */
  private async generateKickoffPrompt(): Promise<string> {
    if (!this.nextPlan) {
      return 'No next session determined. Please review handoff and create a plan.';
    }

    const handoff = this.latestHandoff!;
    const plan = this.nextPlan;

    // Build the comprehensive kickoff prompt
    let prompt = `# SESSION ${plan.sessionNumber} KICKOFF\n\n`;
    prompt += `## Session Title: ${plan.title}\n\n`;
    prompt += `---\n\n`;

    // Context from previous session
    prompt += `## 📋 Context from Previous Session\n\n`;
    prompt += `**Previous Session**: ${handoff.fromSession}\n`;
    prompt += `**Handoff Created**: ${handoff.created}\n\n`;

    if (handoff.accomplishments.length > 0) {
      prompt += `### ✅ What Was Completed\n\n`;
      handoff.accomplishments.slice(0, 5).forEach(acc => {
        prompt += `- ${acc}\n`;
      });
      prompt += `\n`;
    }

    // Current project state
    prompt += `### 🔄 Current State\n\n`;
    prompt += `- **Context**: ${handoff.contextStatus}\n`;
    prompt += `- **Quota**: ${handoff.quotaStatus}\n`;
    prompt += `- **Working Directory**: \`${this.projectRoot}\`\n\n`;

    // Session objectives
    if (plan.planFile) {
      prompt += `## 🎯 This Session's Objectives\n\n`;
      prompt += `**Plan File**: \`docs/planning/${plan.planFile}\`\n\n`;
      prompt += `Please read the plan file for complete objectives. Execute the plan:\n\n`;
      prompt += `1. Read \`docs/planning/${plan.planFile}\`\n`;
      prompt += `2. Follow the implementation phases in order\n`;
      prompt += `3. Track token usage as you go\n`;
      prompt += `4. Create handoff when complete or at 80% context\n\n`;
    } else {
      prompt += `## 🎯 This Session's Objectives\n\n`;
      if (handoff.nextObjectives.length > 0) {
        handoff.nextObjectives.forEach((obj) => {
          prompt += `### ${obj.priority}: ${obj.title}\n\n`;
          prompt += `${obj.description}\n\n`;
        });
      }
    }

    // Action items
    prompt += `## ⚡ First Steps\n\n`;
    prompt += `1. Run \`npm run build\` to verify project builds\n`;
    prompt += `2. Run \`npm test\` to ensure tests pass\n`;
    if (plan.planFile) {
      prompt += `3. Read \`@docs/planning/${plan.planFile}\` for detailed plan\n`;
      prompt += `4. Begin Phase 1 implementation\n`;
    } else {
      prompt += `3. Review next objectives from handoff\n`;
      prompt += `4. Begin highest priority task\n`;
    }
    prompt += `\n`;

    // Footer
    prompt += `---\n\n`;
    prompt += `**Estimated**: ${plan.estimated.tokens} tokens, ${plan.estimated.time}\n`;
    prompt += `**Prerequisites**: ${plan.prerequisites.length > 0 ? plan.prerequisites.join(', ') + ' ✅' : 'None'}\n\n`;
    prompt += `Let's build! 🚀\n`;

    return prompt;
  }

  /**
   * Display the orchestration plan
   */
  private displayOrchestrationPlan(kickoffPrompt: string): void {
    console.log(chalk.cyan('🚀 Next Session Ready'));
    console.log(chalk.gray('─'.repeat(80)));
    console.log('');
    console.log(chalk.bold(`Session ${this.nextPlan!.sessionNumber}: ${this.nextPlan!.title}`));
    console.log('');
    console.log(chalk.gray('Kickoff Prompt Preview:'));
    console.log(chalk.gray('─'.repeat(80)));
    console.log(chalk.dim(kickoffPrompt.split('\n').slice(0, 15).join('\n')));
    console.log(chalk.dim('... (full prompt available) ...'));
    console.log('');
  }

  /**
   * Save prompt for manual use
   */
  private async savePromptForManualUse(prompt: string): Promise<void> {
    const promptFile = path.join(this.projectRoot, `SESSION_${this.nextPlan!.sessionNumber}_KICKOFF_PROMPT.md`);
    fs.writeFileSync(promptFile, prompt, 'utf-8');

    console.log(chalk.cyan('💾 Kickoff Prompt Saved'));
    console.log(chalk.gray('─'.repeat(80)));
    console.log(`  File: ${chalk.bold(path.basename(promptFile))}`);
    console.log('');
    console.log(chalk.bold('Next Steps:'));
    console.log(`  1. Copy the prompt from: ${path.basename(promptFile)}`);
    console.log(`  2. Start a new Claude Code session`);
    console.log(`  3. Paste the prompt to begin`);
    console.log('');
    console.log(chalk.gray('  Or run with --launch flag to auto-start:'));
    console.log(chalk.cyan(`  node dist/commands/orchestrate-next.js --launch`));
    console.log('');
  }

  /**
   * Auto-launch the next session
   */
  private async launchSession(prompt: string): Promise<void> {
    console.log(chalk.cyan('🚀 Launching Next Session'));
    console.log(chalk.gray('─'.repeat(80)));
    console.log('');

    // TODO: Implement actual Claude Code session launch
    // This would integrate with the automation scripts from Session 4B

    const promptFile = path.join(this.projectRoot, `SESSION_${this.nextPlan!.sessionNumber}_KICKOFF_PROMPT.md`);
    fs.writeFileSync(promptFile, prompt, 'utf-8');

    try {
      // Try to use the automation from Session 4B
      const automationScript = path.join(process.env.HOME || '', '.claude', 'automation', 'launch-session.sh');

      if (fs.existsSync(automationScript)) {
        console.log(chalk.gray(`  Using: ${automationScript}`));

        // Launch with the kickoff prompt
        execSync(`bash "${automationScript}" "${promptFile}"`, {
          stdio: 'inherit',
          cwd: this.projectRoot
        });

        console.log('');
        console.log(chalk.green('  ✓ Session launched successfully!'));
      } else {
        console.log(chalk.yellow('  ⚠ Automation script not found'));
        console.log(chalk.gray('    Falling back to manual mode'));
        await this.savePromptForManualUse(prompt);
      }
    } catch (error) {
      console.log(chalk.red('  ✗ Launch failed'));
      console.log(chalk.gray(`    Error: ${(error as Error).message}`));
      console.log('');
      console.log(chalk.yellow('  Falling back to manual mode'));
      await this.savePromptForManualUse(prompt);
    }

    console.log('');
  }

  /**
   * Handle fresh start (no handoffs exist)
   */
  private async handleFreshStart(): Promise<void> {
    console.log(chalk.cyan('🌟 Fresh Start Detected'));
    console.log(chalk.gray('─'.repeat(80)));
    console.log('');
    console.log('No previous session handoffs found.');
    console.log('This appears to be the start of a new project.');
    console.log('');
    console.log(chalk.bold('Recommended first steps:'));
    console.log('  1. Create SESSION_1_PLAN.md in docs/planning/');
    console.log('  2. Define your project objectives and phases');
    console.log('  3. Run this command again to generate Session 1 kickoff');
    console.log('');
  }

  /**
   * Parse prerequisites from string
   */
  private parsePrerequisites(prereqString: string): string[] {
    const matches = prereqString.matchAll(/SESSION\s+(\d+[AB]?)/gi);
    return Array.from(matches).map(m => m[1]);
  }
}

// Main execution
async function main() {
  try {
    const args = process.argv.slice(2);
    const autoLaunch = args.includes('--launch') || args.includes('-l');

    const orchestrator = new SessionOrchestrator();
    await orchestrator.execute(autoLaunch);

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