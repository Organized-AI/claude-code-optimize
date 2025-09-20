import { promises as fs } from 'fs';
import { join, extname, relative } from 'path';
import {
  ComplexityMetrics,
  CodebaseComplexity,
  DependencyComplexity,
  ArchitectureComplexity,
  TestingComplexity,
  DocumentationComplexity,
  ComplexityFactor,
  SecurityVulnerability,
  AnalysisOptions
} from '../../contracts/AgentInterfaces.js';

interface FileAnalysis {
  path: string;
  lines: number;
  language: string;
  complexity: number;
  duplicateBlocks: number;
}

interface DependencyInfo {
  name: string;
  version: string;
  isOutdated: boolean;
  vulnerabilities: SecurityVulnerability[];
  dependencies?: DependencyInfo[];
}

export class ProjectAnalysisService {
  private readonly LANGUAGE_COMPLEXITY_WEIGHTS = {
    '.js': 1.0,
    '.ts': 1.2,
    '.jsx': 1.3,
    '.tsx': 1.5,
    '.py': 1.1,
    '.java': 1.8,
    '.cpp': 2.2,
    '.c': 2.0,
    '.cs': 1.6,
    '.php': 1.1,
    '.rb': 1.2,
    '.go': 1.4,
    '.rs': 1.7,
    '.scala': 2.1,
    '.kt': 1.5,
  };

  private readonly EXCLUDE_PATTERNS = [
    'node_modules',
    '.git',
    'dist',
    'build',
    'coverage',
    '.next',
    '.nuxt',
    'vendor',
    'target',
    'bin',
    'obj',
    '.vscode',
    '.idea',
    'tmp',
    'logs'
  ];

  async analyzeComplexity(projectPath: string, options: AnalysisOptions = {}): Promise<ComplexityMetrics> {
    console.log(`🔍 Starting complexity analysis for: ${projectPath}`);
    
    try {
      // Parallel analysis of different complexity aspects
      const [
        codebaseComplexity,
        dependencyComplexity,
        architectureComplexity,
        testingComplexity,
        documentationComplexity
      ] = await Promise.all([
        this.analyzeCodebase(projectPath, options),
        this.analyzeDependencies(projectPath),
        this.analyzeArchitecture(projectPath, options),
        this.analyzeTesting(projectPath, options),
        this.analyzeDocumentation(projectPath, options)
      ]);

      // Calculate overall complexity score (weighted average)
      const overall = this.calculateOverallComplexity({
        codebase: codebaseComplexity,
        dependencies: dependencyComplexity,
        architecture: architectureComplexity,
        testing: testingComplexity,
        documentation: documentationComplexity
      });

      const metrics: ComplexityMetrics = {
        overall,
        codebase: codebaseComplexity,
        dependencies: dependencyComplexity,
        architecture: architectureComplexity,
        testing: testingComplexity,
        documentation: documentationComplexity
      };

      console.log(`✅ Complexity analysis complete. Overall score: ${overall}/10`);
      return metrics;

    } catch (error) {
      console.error('Error during complexity analysis:', error);
      throw new Error(`Failed to analyze project complexity: ${error.message}`);
    }
  }

  private async analyzeCodebase(projectPath: string, options: AnalysisOptions): Promise<CodebaseComplexity> {
    const files = await this.getProjectFiles(projectPath, options);
    const fileAnalyses = await Promise.all(
      files.map(file => this.analyzeFile(file))
    );

    const totalLines = fileAnalyses.reduce((sum, analysis) => sum + analysis.lines, 0);
    const totalComplexity = fileAnalyses.reduce((sum, analysis) => sum + analysis.complexity, 0);
    const averageComplexity = totalComplexity / Math.max(fileAnalyses.length, 1);
    
    const languages = new Set(fileAnalyses.map(f => f.language));
    const duplicateBlocks = fileAnalyses.reduce((sum, analysis) => sum + analysis.duplicateBlocks, 0);
    const duplicatePercentage = (duplicateBlocks / Math.max(totalLines, 1)) * 100;

    const factors: ComplexityFactor[] = [
      {
        name: 'File Count',
        impact: this.getFileCountImpact(fileAnalyses.length),
        description: `${fileAnalyses.length} files in project`,
        severity: fileAnalyses.length > 500 ? 'high' : fileAnalyses.length > 100 ? 'medium' : 'low'
      },
      {
        name: 'Lines of Code',
        impact: this.getLinesOfCodeImpact(totalLines),
        description: `${totalLines.toLocaleString()} total lines of code`,
        severity: totalLines > 50000 ? 'high' : totalLines > 10000 ? 'medium' : 'low'
      },
      {
        name: 'Language Diversity',
        impact: this.getLanguageDiversityImpact(languages.size),
        description: `${languages.size} programming languages used`,
        severity: languages.size > 5 ? 'high' : languages.size > 3 ? 'medium' : 'low'
      },
      {
        name: 'Code Duplication',
        impact: this.getDuplicationImpact(duplicatePercentage),
        description: `${duplicatePercentage.toFixed(1)}% duplicate code detected`,
        severity: duplicatePercentage > 15 ? 'high' : duplicatePercentage > 8 ? 'medium' : 'low'
      }
    ];

    // Calculate complexity score (1-10 scale)
    const baseScore = Math.min(10, 1 + (averageComplexity / 10));
    const factorAdjustment = factors.reduce((sum, factor) => sum + factor.impact, 0) / factors.length;
    const score = Math.max(1, Math.min(10, baseScore + factorAdjustment));

    return {
      score: Math.round(score * 10) / 10,
      fileCount: fileAnalyses.length,
      linesOfCode: totalLines,
      cyclomaticComplexity: averageComplexity,
      duplicateCodePercentage: duplicatePercentage,
      languageCount: languages.size,
      factors
    };
  }

  private async analyzeDependencies(projectPath: string): Promise<DependencyComplexity> {
    const packageJsonPath = join(projectPath, 'package.json');
    const factors: ComplexityFactor[] = [];
    
    try {
      const packageContent = await fs.readFile(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(packageContent);
      
      const dependencies = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
        ...packageJson.peerDependencies
      };

      const totalDeps = Object.keys(dependencies).length;
      const outdatedDeps = await this.getOutdatedDependencies(dependencies);
      const vulnerabilities = await this.getSecurityVulnerabilities(dependencies);
      const depthAnalysis = await this.analyzeDependencyDepth(projectPath);

      factors.push(
        {
          name: 'Dependency Count',
          impact: this.getDependencyCountImpact(totalDeps),
          description: `${totalDeps} total dependencies`,
          severity: totalDeps > 100 ? 'high' : totalDeps > 50 ? 'medium' : 'low'
        },
        {
          name: 'Outdated Dependencies',
          impact: this.getOutdatedDependenciesImpact(outdatedDeps.length, totalDeps),
          description: `${outdatedDeps.length} outdated dependencies`,
          severity: outdatedDeps.length > totalDeps * 0.3 ? 'high' : outdatedDeps.length > totalDeps * 0.1 ? 'medium' : 'low'
        },
        {
          name: 'Security Vulnerabilities',
          impact: this.getVulnerabilitiesImpact(vulnerabilities),
          description: `${vulnerabilities.length} security vulnerabilities found`,
          severity: vulnerabilities.some(v => v.severity === 'critical') ? 'high' : 
                   vulnerabilities.some(v => v.severity === 'high') ? 'medium' : 'low'
        }
      );

      const score = this.calculateDependencyScore(totalDeps, outdatedDeps.length, vulnerabilities, depthAnalysis.maxDepth);

      return {
        score,
        totalDependencies: totalDeps,
        outdatedDependencies: outdatedDeps.length,
        vulnerabilities,
        dependencyDepth: depthAnalysis.maxDepth,
        factors
      };

    } catch (error) {
      // No package.json or parsing error - likely not a Node.js project
      return {
        score: 1,
        totalDependencies: 0,
        outdatedDependencies: 0,
        vulnerabilities: [],
        dependencyDepth: 0,
        factors: [{
          name: 'No Dependencies',
          impact: -2,
          description: 'No package.json found - not a Node.js project or no dependencies',
          severity: 'low'
        }]
      };
    }
  }

  private async analyzeArchitecture(projectPath: string, options: AnalysisOptions): Promise<ArchitectureComplexity> {
    const files = await this.getProjectFiles(projectPath, options);
    const imports = await this.analyzeImportStructure(files);
    const maintainabilityIndex = await this.calculateMaintainabilityIndex(files);
    const technicalDebt = await this.estimateTechnicalDebt(files);
    
    const couplingScore = this.calculateCouplingScore(imports);
    const cohesionScore = this.calculateCohesionScore(files, imports);

    const factors: ComplexityFactor[] = [
      {
        name: 'Maintainability Index',
        impact: this.getMaintainabilityImpact(maintainabilityIndex),
        description: `Maintainability index: ${maintainabilityIndex.toFixed(1)}/100`,
        severity: maintainabilityIndex < 40 ? 'high' : maintainabilityIndex < 70 ? 'medium' : 'low'
      },
      {
        name: 'Technical Debt',
        impact: this.getTechnicalDebtImpact(technicalDebt),
        description: `Estimated ${technicalDebt} hours of technical debt`,  
        severity: technicalDebt > 100 ? 'high' : technicalDebt > 40 ? 'medium' : 'low'
      },
      {
        name: 'Coupling',
        impact: this.getCouplingImpact(couplingScore),
        description: `Coupling score: ${couplingScore.toFixed(1)}/10`,
        severity: couplingScore > 7 ? 'high' : couplingScore > 5 ? 'medium' : 'low'
      },
      {
        name: 'Cohesion',
        impact: this.getCohesionImpact(cohesionScore),
        description: `Cohesion score: ${cohesionScore.toFixed(1)}/10`,
        severity: cohesionScore < 4 ? 'high' : cohesionScore < 6 ? 'medium' : 'low'
      }
    ];

    const score = this.calculateArchitectureScore(maintainabilityIndex, couplingScore, cohesionScore, technicalDebt);

    return {
      score,
      maintainabilityIndex,
      technicalDebtHours: technicalDebt,
      couplingScore,
      cohesionScore,
      factors
    };
  }

  private async analyzeTesting(projectPath: string, options: AnalysisOptions): Promise<TestingComplexity> {
    const allFiles = await this.getProjectFiles(projectPath, options);
    const testFiles = allFiles.filter(file => this.isTestFile(file));
    const sourceFiles = allFiles.filter(file => !this.isTestFile(file) && this.isSourceFile(file));
    
    const coverage = await this.estimateTestCoverage(testFiles, sourceFiles);
    const testQuality = await this.assessTestQuality(testFiles);

    const factors: ComplexityFactor[] = [
      {
        name: 'Test Coverage',
        impact: this.getTestCoverageImpact(coverage),
        description: `Estimated ${coverage.toFixed(1)}% test coverage`,
        severity: coverage < 50 ? 'high' : coverage < 80 ? 'medium' : 'low'
      },
      {
        name: 'Test-to-Source Ratio',
        impact: this.getTestRatioImpact(testFiles.length, sourceFiles.length),
        description: `${testFiles.length} test files for ${sourceFiles.length} source files`,
        severity: testFiles.length < sourceFiles.length * 0.3 ? 'high' : 
                 testFiles.length < sourceFiles.length * 0.6 ? 'medium' : 'low'
      },
      {
        name: 'Test Quality',
        impact: this.getTestQualityImpact(testQuality),
        description: `Test quality score: ${testQuality.toFixed(1)}/10`,
        severity: testQuality < 4 ? 'high' : testQuality < 7 ? 'medium' : 'low'
      }
    ];

    const score = this.calculateTestingScore(coverage, testFiles.length, sourceFiles.length, testQuality);

    return {
      score,
      coveragePercentage: coverage,
      testFileCount: testFiles.length,
      testQualityScore: testQuality,
      factors
    };
  }

  private async analyzeDocumentation(projectPath: string, options: AnalysisOptions): Promise<DocumentationComplexity> {
    const files = await this.getProjectFiles(projectPath, options);
    const docFiles = files.filter(file => this.isDocumentationFile(file));
    const sourceFiles = files.filter(file => this.isSourceFile(file));
    
    const readmeQuality = await this.assessReadmeQuality(projectPath);
    const apiDocScore = await this.assessApiDocumentation(sourceFiles);
    const completeness = await this.calculateDocumentationCompleteness(docFiles, sourceFiles);

    const factors: ComplexityFactor[] = [
      {
        name: 'Documentation Completeness',
        impact: this.getDocCompletenessImpact(completeness),
        description: `${completeness.toFixed(1)}% documentation completeness`,
        severity: completeness < 30 ? 'high' : completeness < 60 ? 'medium' : 'low'
      },
      {
        name: 'README Quality',
        impact: this.getReadmeQualityImpact(readmeQuality),
        description: `README quality score: ${readmeQuality.toFixed(1)}/10`,
        severity: readmeQuality < 4 ? 'high' : readmeQuality < 7 ? 'medium' : 'low'
      },
      {
        name: 'API Documentation',
        impact: this.getApiDocImpact(apiDocScore),
        description: `API documentation score: ${apiDocScore.toFixed(1)}/10`,
        severity: apiDocScore < 4 ? 'high' : apiDocScore < 7 ? 'medium' : 'low'
      }
    ];

    const score = this.calculateDocumentationScore(completeness, readmeQuality, apiDocScore);

    return {
      score,
      completenessPercentage: completeness,
      readmeQuality,
      apiDocumentationScore: apiDocScore,
      factors
    };
  }

  // Helper methods for complexity calculations
  private calculateOverallComplexity(complexities: {
    codebase: CodebaseComplexity;
    dependencies: DependencyComplexity;
    architecture: ArchitectureComplexity;
    testing: TestingComplexity;
    documentation: DocumentationComplexity;
  }): number {
    // Weighted average with emphasis on code and architecture complexity
    const weights = {
      codebase: 0.25,
      dependencies: 0.20,
      architecture: 0.30,
      testing: 0.15,
      documentation: 0.10
    };

    const weightedSum = 
      complexities.codebase.score * weights.codebase +
      complexities.dependencies.score * weights.dependencies +
      complexities.architecture.score * weights.architecture +
      complexities.testing.score * weights.testing +
      complexities.documentation.score * weights.documentation;

    return Math.round(weightedSum * 10) / 10;
  }

  private async getProjectFiles(projectPath: string, options: AnalysisOptions): Promise<string[]> {
    const files: string[] = [];
    const maxDepth = options.maxDepth || 10;

    const traverse = async (dir: string, depth: number = 0): Promise<void> => {
      if (depth > maxDepth) return;

      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = join(dir, entry.name);
          const relativePath = relative(projectPath, fullPath);

          if (this.shouldExclude(relativePath, options)) continue;

          if (entry.isDirectory()) {
            await traverse(fullPath, depth + 1);
          } else if (entry.isFile() && this.isAnalyzableFile(fullPath)) {
            files.push(fullPath);
          }
        }
      } catch (error) {
        // Skip directories we can't read
      }
    };

    await traverse(projectPath);
    return files;
  }

  private shouldExclude(relativePath: string, options: AnalysisOptions): boolean {
    if (!options.includeNodeModules && relativePath.includes('node_modules')) return true;
    if (!options.includeTests && this.isTestFile(relativePath)) return true;
    if (!options.includeDocs && this.isDocumentationFile(relativePath)) return true;

    return this.EXCLUDE_PATTERNS.some(pattern => 
      relativePath.includes(pattern) || relativePath.startsWith('.')
    );
  }

  private isAnalyzableFile(filePath: string): boolean {
    const ext = extname(filePath).toLowerCase();
    return Object.keys(this.LANGUAGE_COMPLEXITY_WEIGHTS).includes(ext) ||
           ['.md', '.txt', '.json', '.yaml', '.yml', '.xml', '.html', '.css', '.scss', '.less'].includes(ext);
  }

  private async analyzeFile(filePath: string): Promise<FileAnalysis> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n').length;
      const ext = extname(filePath).toLowerCase();
      const language = this.getLanguageFromExtension(ext);
      
      const complexity = this.calculateFileComplexity(content, ext);
      const duplicateBlocks = this.detectDuplicateBlocks(content);

      return {
        path: filePath,
        lines,
        language,
        complexity,
        duplicateBlocks
      };
    } catch (error) {
      return {
        path: filePath,
        lines: 0,
        language: 'unknown',
        complexity: 0,
        duplicateBlocks: 0
      };
    }
  }

  private calculateFileComplexity(content: string, ext: string): number {
    let complexity = 1;
    const languageWeight = this.LANGUAGE_COMPLEXITY_WEIGHTS[ext] || 1.0;

    // Simple heuristics for complexity
    const complexityPatterns = [
      /\bif\b/g,
      /\belse\b/g,
      /\bfor\b/g,
      /\bwhile\b/g,
      /\bswitch\b/g,
      /\bcatch\b/g,
      /\btry\b/g,
      /\b&&\b/g,
      /\b\|\|\b/g,
      /\?\s*:/g, // ternary operator
    ];

    complexityPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        complexity += matches.length;
      }
    });

    return complexity * languageWeight;
  }

  private detectDuplicateBlocks(content: string): number {
    const lines = content.split('\n').filter(line => line.trim().length > 10);
    const duplicates = new Set<string>();
    const seen = new Set<string>();

    for (const line of lines) {
      const trimmed = line.trim();
      if (seen.has(trimmed)) {
        duplicates.add(trimmed);
      } else {
        seen.add(trimmed);
      }
    }

    return duplicates.size;
  }

  private getLanguageFromExtension(ext: string): string {
    const languageMap: Record<string, string> = {
      '.js': 'JavaScript',
      '.ts': 'TypeScript',
      '.jsx': 'React JSX',
      '.tsx': 'React TSX',
      '.py': 'Python',
      '.java': 'Java',
      '.cpp': 'C++',
      '.c': 'C',
      '.cs': 'C#',
      '.php': 'PHP',
      '.rb': 'Ruby',
      '.go': 'Go',
      '.rs': 'Rust',
      '.scala': 'Scala',
      '.kt': 'Kotlin',
    };

    return languageMap[ext] || 'Other';
  }

  // Impact calculation methods
  private getFileCountImpact(fileCount: number): number {
    if (fileCount > 1000) return 3;
    if (fileCount > 500) return 2;
    if (fileCount > 100) return 1;
    if (fileCount > 50) return 0;
    return -1;
  }

  private getLinesOfCodeImpact(lines: number): number {
    if (lines > 100000) return 4;
    if (lines > 50000) return 3;
    if (lines > 20000) return 2;
    if (lines > 10000) return 1;
    if (lines > 5000) return 0;
    return -1;
  }

  private getLanguageDiversityImpact(languageCount: number): number {
    if (languageCount > 8) return 3;
    if (languageCount > 5) return 2;
    if (languageCount > 3) return 1;
    if (languageCount > 1) return 0;
    return -1;
  }

  private getDuplicationImpact(duplicatePercentage: number): number {
    if (duplicatePercentage > 25) return 3;
    if (duplicatePercentage > 15) return 2;
    if (duplicatePercentage > 8) return 1;
    if (duplicatePercentage > 3) return 0;
    return -1;
  }

  private getDependencyCountImpact(count: number): number {
    if (count > 200) return 4;
    if (count > 100) return 3;
    if (count > 50) return 2;
    if (count > 20) return 1;
    return 0;
  }

  private getOutdatedDependenciesImpact(outdated: number, total: number): number {
    const ratio = outdated / Math.max(total, 1);
    if (ratio > 0.5) return 3;
    if (ratio > 0.3) return 2;
    if (ratio > 0.1) return 1;
    return 0;
  }

  private getVulnerabilitiesImpact(vulnerabilities: SecurityVulnerability[]): number {
    let impact = 0;
    vulnerabilities.forEach(vuln => {
      switch (vuln.severity) {
        case 'critical': impact += 4; break;
        case 'high': impact += 3; break;
        case 'medium': impact += 2; break;
        case 'low': impact += 1; break;
      }
    });
    return Math.min(5, impact);
  }

  private getMaintainabilityImpact(index: number): number {
    if (index < 20) return 4;
    if (index < 40) return 3;
    if (index < 60) return 2;
    if (index < 80) return 1;
    return -1;
  }

  private getTechnicalDebtImpact(hours: number): number {
    if (hours > 200) return 4;
    if (hours > 100) return 3;
    if (hours > 50) return 2;
    if (hours > 20) return 1;
    return 0;
  }

  private getCouplingImpact(score: number): number {
    if (score > 8) return 3;
    if (score > 6) return 2;
    if (score > 4) return 1;
    return 0;
  }

  private getCohesionImpact(score: number): number {
    if (score < 3) return 3;
    if (score < 5) return 2;
    if (score < 7) return 1;
    return -1;
  }

  private getTestCoverageImpact(coverage: number): number {
    if (coverage < 30) return 3;
    if (coverage < 50) return 2;
    if (coverage < 70) return 1;
    if (coverage < 90) return 0;
    return -1;
  }

  private getTestRatioImpact(testFiles: number, sourceFiles: number): number {
    const ratio = testFiles / Math.max(sourceFiles, 1);
    if (ratio < 0.2) return 3;
    if (ratio < 0.4) return 2;
    if (ratio < 0.6) return 1;
    return -1;
  }

  private getTestQualityImpact(quality: number): number {
    if (quality < 3) return 3;
    if (quality < 5) return 2;
    if (quality < 7) return 1;
    return -1;
  }

  private getDocCompletenessImpact(completeness: number): number {
    if (completeness < 20) return 3;
    if (completeness < 40) return 2;
    if (completeness < 60) return 1;
    return -1;
  }

  private getReadmeQualityImpact(quality: number): number {
    if (quality < 3) return 2;
    if (quality < 5) return 1;
    if (quality < 7) return 0;
    return -1;
  }

  private getApiDocImpact(score: number): number {
    if (score < 3) return 2;
    if (score < 5) return 1;
    if (score < 7) return 0;
    return -1;
  }

  // Scoring methods
  private calculateDependencyScore(total: number, outdated: number, vulnerabilities: SecurityVulnerability[], depth: number): number {
    let score = 1;
    
    // Base score from dependency count
    if (total > 200) score += 4;
    else if (total > 100) score += 3;
    else if (total > 50) score += 2;
    else if (total > 20) score += 1;

    // Outdated dependencies impact
    const outdatedRatio = outdated / Math.max(total, 1);
    if (outdatedRatio > 0.5) score += 3;
    else if (outdatedRatio > 0.3) score += 2;
    else if (outdatedRatio > 0.1) score += 1;

    // Vulnerability impact
    vulnerabilities.forEach(vuln => {
      switch (vuln.severity) {
        case 'critical': score += 2; break;
        case 'high': score += 1.5; break;
        case 'medium': score += 1; break;
        case 'low': score += 0.5; break;
      }
    });

    // Dependency depth impact
    if (depth > 10) score += 2;
    else if (depth > 7) score += 1;

    return Math.min(10, Math.max(1, Math.round(score * 10) / 10));
  }

  private calculateArchitectureScore(maintainability: number, coupling: number, cohesion: number, techDebt: number): number {
    let score = 5; // Start with middle score

    // Maintainability impact (lower is worse)
    if (maintainability < 20) score += 3;
    else if (maintainability < 40) score += 2;
    else if (maintainability < 60) score += 1;
    else if (maintainability > 80) score -= 1;

    // Coupling impact (higher is worse)
    if (coupling > 8) score += 2;
    else if (coupling > 6) score += 1;
    else if (coupling < 3) score -= 1;

    // Cohesion impact (lower is worse)
    if (cohesion < 3) score += 2;
    else if (cohesion < 5) score += 1;
    else if (cohesion > 8) score -= 1;

    // Technical debt impact
    if (techDebt > 100) score += 2;
    else if (techDebt > 50) score += 1;
    else if (techDebt < 10) score -= 1;

    return Math.min(10, Math.max(1, Math.round(score * 10) / 10));
  }

  private calculateTestingScore(coverage: number, testFiles: number, sourceFiles: number, quality: number): number {
    let score = 5;

    // Coverage impact
    if (coverage < 30) score += 3;
    else if (coverage < 50) score += 2;
    else if (coverage < 70) score += 1;
    else if (coverage > 90) score -= 1;

    // Test ratio impact
    const ratio = testFiles / Math.max(sourceFiles, 1);
    if (ratio < 0.2) score += 2;
    else if (ratio < 0.4) score += 1;
    else if (ratio > 0.8) score -= 1;

    // Quality impact
    if (quality < 4) score += 2;
    else if (quality < 6) score += 1;
    else if (quality > 8) score -= 1;

    return Math.min(10, Math.max(1, Math.round(score * 10) / 10));
  }

  private calculateDocumentationScore(completeness: number, readmeQuality: number, apiDocScore: number): number {
    let score = 5;

    // Completeness impact
    if (completeness < 20) score += 3;
    else if (completeness < 40) score += 2;
    else if (completeness < 60) score += 1;
    else if (completeness > 80) score -= 1;

    // README quality impact
    if (readmeQuality < 4) score += 2;
    else if (readmeQuality < 6) score += 1;
    else if (readmeQuality > 8) score -= 1;

    // API doc impact
    if (apiDocScore < 4) score += 1;
    else if (apiDocScore > 8) score -= 1;

    return Math.min(10, Math.max(1, Math.round(score * 10) / 10));
  }

  // Mock implementation methods (to be implemented with real analysis)
  private async getOutdatedDependencies(dependencies: Record<string, string>): Promise<string[]> {
    // Mock: Assume 15% of dependencies are outdated
    const depNames = Object.keys(dependencies);
    const outdatedCount = Math.floor(depNames.length * 0.15);
    return depNames.slice(0, outdatedCount);
  }

  private async getSecurityVulnerabilities(dependencies: Record<string, string>): Promise<SecurityVulnerability[]> {
    // Mock: Generate some example vulnerabilities
    const depNames = Object.keys(dependencies);
    const vulnCount = Math.floor(depNames.length * 0.05); // 5% have vulnerabilities
    
    return Array.from({ length: vulnCount }, (_, i) => ({
      severity: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)] as any,
      package: depNames[i] || 'unknown',
      description: `Security vulnerability in ${depNames[i] || 'unknown'}`,
      fixAvailable: Math.random() > 0.3
    }));
  }

  private async analyzeDependencyDepth(projectPath: string): Promise<{ maxDepth: number; avgDepth: number }> {
    // Mock: Simulate dependency depth analysis
    return {
      maxDepth: Math.floor(Math.random() * 15) + 3,
      avgDepth: Math.floor(Math.random() * 8) + 2
    };
  }

  private async analyzeImportStructure(files: string[]): Promise<Record<string, string[]>> {
    // Mock: Return simplified import structure
    const imports: Record<string, string[]> = {};
    files.slice(0, 20).forEach(file => {
      imports[file] = files.slice(0, Math.floor(Math.random() * 5) + 1);
    });
    return imports;
  }

  private async calculateMaintainabilityIndex(files: string[]): Promise<number> {
    // Mock: Calculate based on file count and estimated complexity
    const baseIndex = 100 - Math.min(80, files.length / 10);
    return Math.max(10, baseIndex + (Math.random() - 0.5) * 20);
  }

  private async estimateTechnicalDebt(files: string[]): Promise<number> {
    // Mock: Estimate tech debt based on file count and complexity indicators
    return Math.floor(files.length * 0.5 + Math.random() * 50);
  }

  private calculateCouplingScore(imports: Record<string, string[]>): number {
    // Mock: Calculate coupling based on import relationships
    const avgImportsPerFile = Object.values(imports).reduce((sum, imp) => sum + imp.length, 0) / Math.max(Object.keys(imports).length, 1);
    return Math.min(10, Math.max(1, avgImportsPerFile * 1.5));
  }

  private calculateCohesionScore(files: string[], imports: Record<string, string[]>): number {
    // Mock: Inverse relationship with coupling for simplicity
    const coupling = this.calculateCouplingScore(imports);
    return Math.max(1, 11 - coupling);
  }

  private isTestFile(filePath: string): boolean {
    const testPatterns = [
      /\.test\./,
      /\.spec\./,
      /__tests__/,
      /\/tests?\//,
      /\/spec\//,
      /\.stories\./
    ];
    return testPatterns.some(pattern => pattern.test(filePath));
  }

  private isSourceFile(filePath: string): boolean {
    const ext = extname(filePath).toLowerCase();
    return Object.keys(this.LANGUAGE_COMPLEXITY_WEIGHTS).includes(ext) && !this.isTestFile(filePath);
  }

  private isDocumentationFile(filePath: string): boolean {
    const docPatterns = [
      /\.md$/,
      /\.txt$/,
      /readme/i,
      /changelog/i,
      /license/i,
      /contributing/i,
      /\/docs?\//,
      /\.adoc$/,
      /\.rst$/
    ];
    return docPatterns.some(pattern => pattern.test(filePath));
  }

  private async estimateTestCoverage(testFiles: string[], sourceFiles: string[]): Promise<number> {
    if (sourceFiles.length === 0) return 0;
    
    // Mock: Estimate coverage based on test-to-source ratio
    const ratio = testFiles.length / sourceFiles.length;
    let coverage = ratio * 80; // Base coverage estimation
    
    // Add some variance
    coverage += (Math.random() - 0.5) * 30;
    
    return Math.max(0, Math.min(100, coverage));
  }

  private async assessTestQuality(testFiles: string[]): Promise<number> {
    if (testFiles.length === 0) return 1;
    
    // Mock: Assess quality based on test file count and patterns
    let quality = 5; // Base quality
    
    if (testFiles.length > 50) quality += 2;
    else if (testFiles.length > 20) quality += 1;
    else if (testFiles.length < 5) quality -= 2;
    
    // Add variance
    quality += (Math.random() - 0.5) * 3;
    
    return Math.max(1, Math.min(10, quality));
  }

  private async assessReadmeQuality(projectPath: string): Promise<number> {
    try {
      const readmePath = join(projectPath, 'README.md');
      const content = await fs.readFile(readmePath, 'utf-8');
      
      let quality = 1;
      
      // Check for common README sections
      if (content.includes('# ') || content.includes('## ')) quality += 2; // Has headers
      if (content.length > 500) quality += 1; // Substantial content
      if (content.includes('install') || content.includes('Install')) quality += 1;
      if (content.includes('usage') || content.includes('Usage')) quality += 1;
      if (content.includes('example') || content.includes('Example')) quality += 1;
      if (content.includes('```')) quality += 1; // Code examples
      if (content.includes('license') || content.includes('License')) quality += 1;
      if (content.includes('http') || content.includes('www.')) quality += 1; // Links
      
      return Math.min(10, quality);
    } catch (error) {
      return 1; // No README found
    }
  }

  private async assessApiDocumentation(sourceFiles: string[]): Promise<number> {
    // Mock: Assess API documentation based on comment density
    let totalComments = 0;
    let totalFunctions = 0;
    
    for (const file of sourceFiles.slice(0, 10)) { // Sample first 10 files
      try {
        const content = await fs.readFile(file, 'utf-8');
        const comments = (content.match(/\/\*\*[\s\S]*?\*\//g) || []).length; // JSDoc comments
        const functions = (content.match(/function\s+\w+|const\s+\w+\s*=|\w+\s*:\s*\(/g) || []).length;
        
        totalComments += comments;
        totalFunctions += functions;
      } catch (error) {
        // Skip files we can't read
      }
    }
    
    if (totalFunctions === 0) return 5;
    
    const commentRatio = totalComments / totalFunctions;
    return Math.min(10, Math.max(1, commentRatio * 10 + 2));
  }

  private async calculateDocumentationCompleteness(docFiles: string[], sourceFiles: string[]): Promise<number> {
    if (sourceFiles.length === 0) return 100;
    
    let completeness = 0;
    
    // Base completeness from doc files
    const docRatio = docFiles.length / sourceFiles.length;
    completeness += docRatio * 40;
    
    // Bonus for README
    const hasReadme = docFiles.some(f => /readme/i.test(f));
    if (hasReadme) completeness += 20;
    
    // Bonus for other important docs
    const hasContributing = docFiles.some(f => /contributing/i.test(f));
    const hasChangelog = docFiles.some(f => /changelog/i.test(f));
    const hasLicense = docFiles.some(f => /license/i.test(f));
    
    if (hasContributing) completeness += 10;
    if (hasChangelog) completeness += 10;
    if (hasLicense) completeness += 10;
    
    // Add variance
    completeness += (Math.random() - 0.5) * 20;
    
    return Math.max(0, Math.min(100, completeness));
  }
}