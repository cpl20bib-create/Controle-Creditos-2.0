
export type UG = '160211' | '167211';
export type UserRole = 'ADMIN' | 'EDITOR' | 'VIEWER';

export interface User {
  id: string;
  username: string;
  password?: string;
  role: UserRole;
  name: string;
}

export type ActionType = 'CREATE' | 'UPDATE' | 'DELETE';
export type EntityType = 'CRÉDITO' | 'EMPENHO' | 'RECOLHIMENTO' | 'ANULAÇÃO';

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: ActionType;
  entityType: EntityType;
  entityId: string;
  description: string;
  timestamp: string;
}

export interface Credit {
  id: string;
  ug: UG;
  pi: string;
  nc: string;
  nd: string;
  organ: string;
  section: string;
  valueReceived: number;
  description: string;
  deadline: string;
  createdAt: string;
}

export interface CommitmentAllocation {
  creditId: string;
  value: number;
}

export interface Commitment {
  id: string;
  ne: string;
  allocations: CommitmentAllocation[];
  value: number; // Valor total da NE
  date: string;
  description: string;
  creditId?: string; // Mantido por compatibilidade temporária
}

export interface Cancellation {
  id: string;
  commitmentId: string;
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

export type SortField = 'value' | 'date' | 'deadline' | 'createdAt';
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
