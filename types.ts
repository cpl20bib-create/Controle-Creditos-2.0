
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
  valueReceived: number;
  valueAvailable: number;
  valueUsed: number;
  description: string;
  deadline: string;
  created_at: string;
}

export interface Commitment {
  id: string;
  ne: string;
  creditId: string;
  value: number;
  date: string;
  description: string;
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

export type ContractStatus = 'INICIAL' | '1º ADITIVO' | '2º ADITIVO' | '3º ADITIVO' | '4º ADITIVO';

export interface Contract {
  id: string;
  contractNumber: string;
  companyName: string;
  value: number;
  object: string;
  startDate: string;
  endDate: string;
  status: ContractStatus;
  mainFiscal: string;
  substituteFiscal: string;
  biNumber: string;
  created_at?: string;
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

export type ActionType = 'CREATE' | 'UPDATE' | 'DELETE';
export type EntityType = 'CRÉDITO' | 'EMPENHO' | 'RECOLHIMENTO' | 'ANULAÇÃO' | 'CONTRATO';

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
