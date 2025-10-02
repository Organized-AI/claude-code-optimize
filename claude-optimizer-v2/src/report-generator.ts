import fs from 'fs';
import path from 'path';
import os from 'os';
import { VarianceData } from './variance-tracker.js';
import { SessionEstimate } from './token-estimator.js';

/**
 * Report Generator - Creates post-session analysis reports
 */
export class ReportGenerator {
  private reportsDir: string;

  constructor() {
    this.reportsDir = path.join(os.homedir(), '.claude', 'session-reports');
  }

  /**
   * Generate a complete session analysis report
   */
  generateReport(variance: VarianceData, estimate: SessionEstimate): string {
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }

    const reportPath = path.join(this.reportsDir, `${variance.sessionId}-report.md`);
    const markdown = this.createMarkdown(variance, estimate);

    fs.writeFileSync(reportPath, markdown);
    return reportPath;
  }

  /**
   * Create markdown report content
   */
  private createMarkdown(variance: VarianceData, estimate: SessionEstimate): string {
    const completed = variance.completedAt ? new Date(variance.completedAt).toLocaleString() : 'In Progress';
    const overallRating = this.getRating(variance.variance.totalPercent);

    let md = `# ${estimate.sessionId.toUpperCase()} Completion Report\n\n`;
    md += `**Completed**: ${completed}\n`;
    md += `**Tokens Used**: ${variance.actual.totalTokens.toLocaleString()} (estimated: ${variance.estimated.totalTokens.toLocaleString()})\n\n`;
    md += `---\n\n`;

    // Estimation Accuracy
    md += `## Estimation Accuracy\n\n`;
    md += `**Overall Variance**: ${variance.variance.total >= 0 ? '+' : ''}${variance.variance.total.toLocaleString()} tokens (${variance.variance.totalPercent.toFixed(1)}%)\n`;
    md += `**Rating**: ${this.getRatingStars(overallRating)} ${overallRating.toUpperCase()}\n\n`;

    // Phase Breakdown Table
    md += `### Phase Breakdown\n\n`;
    md += `| Phase | Est. | Actual | Var. | % | Accuracy |\n`;
    md += `|-------|------|--------|------|---|----------|\n`;

    for (const [phaseId, detail] of Object.entries(variance.variance.byPhase)) {
      const rating = this.getRating(detail.percent);
      const stars = this.getRatingStars(rating);
      const varSign = detail.difference >= 0 ? '+' : '';

      md += `| ${phaseId} | ${this.formatTokens(detail.estimated)} | ${this.formatTokens(detail.actual)} | `;
      md += `${varSign}${this.formatTokens(detail.difference)} | ${varSign}${detail.percent.toFixed(1)}% | ${stars} ${rating.toUpperCase()} |\n`;
    }

    md += `\n---\n\n`;

    // Lessons Learned
    md += `## Lessons Learned\n\n`;
    const deviations = variance.deviations;

    if (deviations.length > 0) {
      deviations.forEach((dev, i) => {
        md += `### ${i + 1}. ${dev.phase}\n`;
        md += `**Impact**: ${dev.impact >= 0 ? '+' : ''}${dev.impact.toLocaleString()} tokens\n`;
        md += `**Root Cause**: ${dev.reason}\n`;
        md += `**Applied To**: Future similar estimates\n\n`;
      });
    } else {
      md += `✅ No significant deviations - estimates were accurate!\n\n`;
    }

    md += `---\n\n`;

    // Recommendations
    md += `## Recommendations for Next Session\n\n`;
    md += `**For Similar ${estimate.sessionId} Work**:\n`;

    const adjustedRate = this.calculateAdjustedRate(variance);
    md += `- Adjusted rate: ${adjustedRate.toLocaleString()} tokens/hour\n`;
    md += `- Buffer: ${this.recommendBuffer(variance.variance.totalPercent)}%\n`;
    md += `- Confidence: ${variance.variance.totalPercent < 10 ? 'HIGH' : 'MEDIUM'}\n\n`;

    return md;
  }

  /**
   * Get rating from variance percentage
   */
  private getRating(percentVariance: number): string {
    const abs = Math.abs(percentVariance);
    if (abs < 5) return 'excellent';
    if (abs < 10) return 'very good';
    if (abs < 20) return 'good';
    if (abs < 30) return 'fair';
    return 'poor';
  }

  /**
   * Get star rating
   */
  private getRatingStars(rating: string): string {
    switch (rating) {
      case 'excellent': return '⭐⭐⭐⭐⭐';
      case 'very good': return '⭐⭐⭐⭐';
      case 'good': return '⭐⭐⭐';
      case 'fair': return '⭐⭐';
      default: return '⭐';
    }
  }

  /**
   * Format tokens with k suffix
   */
  private formatTokens(tokens: number): string {
    if (Math.abs(tokens) >= 1000) {
      return `${(tokens / 1000).toFixed(1)}k`;
    }
    return tokens.toString();
  }

  /**
   * Calculate adjusted tokens/hour rate
   */
  private calculateAdjustedRate(variance: VarianceData): number {
    // Simple adjustment: if we used more, increase rate
    const adjustment = 1 + (variance.variance.totalPercent / 100);
    return Math.floor(45000 * adjustment); // Base implementation rate
  }

  /**
   * Recommend buffer percentage
   */
  private recommendBuffer(variancePercent: number): number {
    const abs = Math.abs(variancePercent);
    if (abs < 5) return 10;
    if (abs < 10) return 12;
    if (abs < 20) return 15;
    return 20;
  }
}
