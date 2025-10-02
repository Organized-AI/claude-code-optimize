/**
 * Memory Query Engine
 * Advanced querying and filtering for session memory
 */

import { SessionMemoryManager, SessionHistory, ProjectMemory } from './session-memory.js';

export type Operator = '=' | '!=' | '>' | '<' | '>=' | '<=' | 'contains' | 'startsWith';
export type OrderDirection = 'asc' | 'desc';

export interface WhereClause {
  field: string;
  operator: Operator;
  value: any;
}

export interface QueryBuilder<T> {
  where(field: string, operator: Operator, value: any): QueryBuilder<T>;
  orderBy(field: string, direction?: OrderDirection): QueryBuilder<T>;
  limit(n: number): QueryBuilder<T>;
  offset(n: number): QueryBuilder<T>;
  execute(): Promise<T[]>;
  count(): Promise<number>;
  sum(field: string): Promise<number>;
  avg(field: string): Promise<number>;
  min(field: string): Promise<number>;
  max(field: string): Promise<number>;
}

export class SessionQueryBuilder implements QueryBuilder<SessionHistory> {
  private whereClauses: WhereClause[] = [];
  private orderByField?: string;
  private orderDirection: OrderDirection = 'asc';
  private limitCount?: number;
  private offsetCount: number = 0;

  constructor(
    private memoryManager: SessionMemoryManager,
    private projectPath: string
  ) {}

  where(field: string, operator: Operator, value: any): SessionQueryBuilder {
    this.whereClauses.push({ field, operator, value });
    return this;
  }

  orderBy(field: string, direction: OrderDirection = 'asc'): SessionQueryBuilder {
    this.orderByField = field;
    this.orderDirection = direction;
    return this;
  }

  limit(n: number): SessionQueryBuilder {
    this.limitCount = n;
    return this;
  }

  offset(n: number): SessionQueryBuilder {
    this.offsetCount = n;
    return this;
  }

  async execute(): Promise<SessionHistory[]> {
    const memory = await this.memoryManager.loadProjectMemory(this.projectPath);
    let sessions = [...memory.sessions];

    // Apply where clauses
    sessions = sessions.filter(session => this.matchesWhere(session));

    // Apply ordering
    if (this.orderByField) {
      sessions = this.applyOrdering(sessions);
    }

    // Apply offset and limit
    const start = this.offsetCount;
    const end = this.limitCount !== undefined ? start + this.limitCount : undefined;
    sessions = sessions.slice(start, end);

    return sessions;
  }

  async count(): Promise<number> {
    const memory = await this.memoryManager.loadProjectMemory(this.projectPath);
    return memory.sessions.filter(session => this.matchesWhere(session)).length;
  }

  async sum(field: string): Promise<number> {
    const sessions = await this.execute();
    return sessions.reduce((sum, session) => sum + this.getFieldValue(session, field), 0);
  }

  async avg(field: string): Promise<number> {
    const sessions = await this.execute();
    if (sessions.length === 0) return 0;
    const total = sessions.reduce((sum, session) => sum + this.getFieldValue(session, field), 0);
    return total / sessions.length;
  }

  async min(field: string): Promise<number> {
    const sessions = await this.execute();
    if (sessions.length === 0) return 0;
    return Math.min(...sessions.map(session => this.getFieldValue(session, field)));
  }

  async max(field: string): Promise<number> {
    const sessions = await this.execute();
    if (sessions.length === 0) return 0;
    return Math.max(...sessions.map(session => this.getFieldValue(session, field)));
  }

  private matchesWhere(session: SessionHistory): boolean {
    return this.whereClauses.every(clause => {
      const fieldValue = this.getFieldValue(session, clause.field);
      return this.compareValues(fieldValue, clause.operator, clause.value);
    });
  }

  private compareValues(fieldValue: any, operator: Operator, compareValue: any): boolean {
    switch (operator) {
      case '=':
        return fieldValue === compareValue;
      case '!=':
        return fieldValue !== compareValue;
      case '>':
        return fieldValue > compareValue;
      case '<':
        return fieldValue < compareValue;
      case '>=':
        return fieldValue >= compareValue;
      case '<=':
        return fieldValue <= compareValue;
      case 'contains':
        if (Array.isArray(fieldValue)) {
          return fieldValue.some(item =>
            String(item).toLowerCase().includes(String(compareValue).toLowerCase())
          );
        }
        return String(fieldValue).toLowerCase().includes(String(compareValue).toLowerCase());
      case 'startsWith':
        return String(fieldValue).toLowerCase().startsWith(String(compareValue).toLowerCase());
      default:
        return false;
    }
  }

  private getFieldValue(session: SessionHistory, field: string): any {
    // Handle nested fields like "filesModified.length"
    const parts = field.split('.');
    let value: any = session;

    for (const part of parts) {
      if (value === null || value === undefined) {
        return undefined;
      }
      value = value[part];
    }

    // Convert dates to timestamps for comparison
    if (value instanceof Date) {
      return value.getTime();
    }

    return value;
  }

  private applyOrdering(sessions: SessionHistory[]): SessionHistory[] {
    if (!this.orderByField) return sessions;

    return sessions.sort((a, b) => {
      const aVal = this.getFieldValue(a, this.orderByField!);
      const bVal = this.getFieldValue(b, this.orderByField!);

      let comparison = 0;
      if (aVal > bVal) comparison = 1;
      if (aVal < bVal) comparison = -1;

      return this.orderDirection === 'desc' ? -comparison : comparison;
    });
  }
}

export class DecisionQueryBuilder implements QueryBuilder<string> {
  private whereClauses: WhereClause[] = [];
  private limitCount?: number;
  private offsetCount: number = 0;

  constructor(
    private memoryManager: SessionMemoryManager,
    private projectPath: string
  ) {}

  where(field: string, operator: Operator, value: any): DecisionQueryBuilder {
    this.whereClauses.push({ field, operator, value });
    return this;
  }

  orderBy(_field: string, _direction: OrderDirection = 'asc'): DecisionQueryBuilder {
    // Decisions are strings, so ordering doesn't apply much
    return this;
  }

  limit(n: number): DecisionQueryBuilder {
    this.limitCount = n;
    return this;
  }

  offset(n: number): DecisionQueryBuilder {
    this.offsetCount = n;
    return this;
  }

  async execute(): Promise<string[]> {
    const memory = await this.memoryManager.loadProjectMemory(this.projectPath);
    let decisions = [...memory.cumulativeContext.keyDecisions];

    // Apply where clauses (simple string matching)
    decisions = decisions.filter(decision =>
      this.whereClauses.every(clause => {
        if (clause.operator === 'contains') {
          return decision.toLowerCase().includes(String(clause.value).toLowerCase());
        }
        if (clause.operator === 'startsWith') {
          return decision.toLowerCase().startsWith(String(clause.value).toLowerCase());
        }
        return true;
      })
    );

    // Apply offset and limit
    const start = this.offsetCount;
    const end = this.limitCount !== undefined ? start + this.limitCount : undefined;
    decisions = decisions.slice(start, end);

    return decisions;
  }

  async count(): Promise<number> {
    const decisions = await this.execute();
    return decisions.length;
  }

  async sum(_field: string): Promise<number> {
    return 0; // Not applicable for decisions
  }

  async avg(_field: string): Promise<number> {
    return 0; // Not applicable for decisions
  }

  async min(_field: string): Promise<number> {
    return 0; // Not applicable for decisions
  }

  async max(_field: string): Promise<number> {
    return 0; // Not applicable for decisions
  }
}

export class MemoryQuery {
  constructor(private memoryManager: SessionMemoryManager) {}

  sessions(projectPath: string): SessionQueryBuilder {
    return new SessionQueryBuilder(this.memoryManager, projectPath);
  }

  decisions(projectPath: string): DecisionQueryBuilder {
    return new DecisionQueryBuilder(this.memoryManager, projectPath);
  }

  /**
   * Get full project memory
   */
  async getMemory(projectPath: string): Promise<ProjectMemory> {
    return await this.memoryManager.loadProjectMemory(projectPath);
  }
}
