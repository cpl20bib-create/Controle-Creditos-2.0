
export type UG = '160211' | '167211';
export type UserRole = 'ADMIN' | 'EDITOR' | 'VIEWER';

export interface User {
  id: string;
  username: string;
  password?: string;
  role: UserRole;
  name: string;
}

export interface Credit {
  id: string;
  ug: UG;
  pi: string;
  nc: string;
  nd: string;
  organ: string;
  section: string;
  valueReceived: number; // Valor Inicial
  valueAvailable: number; // Saldo Atual
  valueUsed: number; // Total Gasto
  description: string;
  deadline: string;
  created_at: string;
}

export interface Commitment {
  id: string;
  ne: string;
  creditId: string; // Vínculo direto com a NC
  value: number; // Valor da NE
  date: string;
  description: string;
}

export interface Cancellation {
  id: string;
  commitmentId: string; // Vínculo com a NE
  value: number;
  ro: string;
  date: string;
  bi: string;
}

export interface Refund {
  id: string;
  creditId: string;
  value: number;
  date: string;
  description: string;
}

export type SortField = 'valueReceived' | 'value' | 'date' | 'deadline' | 'created_at';
export type SortOrder = 'asc' | 'desc';

export interface Filters {
  ug?: UG;
  pi?: string;
  nd?: string;
  section?: string;
  organ?: string;
  startDate?: string;
  endDate?: string;
  hideZeroBalance?: boolean;
  sortBy?: SortField;
  sortOrder?: SortOrder;
}

// Fixed missing types for AuditHistory component
export type ActionType = 'CREATE' | 'UPDATE' | 'DELETE';
export type EntityType = 'CRÉDITO' | 'EMPENHO' | 'RECOLHIMENTO' | 'ANULAÇÃO';

export interface AuditLog {
  id: string;
  action: ActionType;
  entityType: EntityType;
  entityId: string;
  userId: string;
  userName: string;
  description: string;
  timestamp: string;
}
