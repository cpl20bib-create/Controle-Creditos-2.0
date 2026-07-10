
export type UG = '160211' | '167211';
export type UserRole = 'ADMIN' | 'EDITOR' | 'VIEWER' | 'ALMOXARIFADO' | 'CONFORMADOR' | 'FINANCEIRO';
export type ContractType = 'RECEITA' | 'DESPESA';

export interface User {
  id: string;
  username: string;
  password?: string;
  role: UserRole;
  name: string;
  assignedSections?: string[];
}

export interface Credit {
  id: string;
  ug: UG;
  pi: string;
  nc: string;
  nd: string;
  fonte: string;
  ptres: string;
  esfera: string;
  ugr: string;
  organ: string;
  section: string;
  valueReceived: number;
  valueAvailable: number;
  valueUsed: number;
  description: string;
  deadline: string;
  created_at: string;
}

export interface CommitmentContact {
  id: string;
  date: string;
  notes: string;
  expectedDeliveryDate?: string;
}

export interface MaterialArrival {
  id: string;
  date: string;
  value: number;
  invoice?: string;
  diexRemessa?: string;
  sentToConfDocDate?: string;
  sentToFinanceDate?: string;
}

export interface Liquidation {
  id: string;
  ns: string;
  date: string;
  value: number;
}

export type CommitmentType = 'Ordinário' | 'Global' | 'Estimativo';

export interface Commitment {
  id: string;
  ne: string;
  creditId: string;
  value: number;
  date: string;
  description: string;
  contacts?: CommitmentContact[];
  
  // Legacy fields (keep for compatibility if needed, but prefer arrays)
  materialArrivedDate?: string;
  invoice?: string;
  diexRemessa?: string;
  sentToConfDocDate?: string;
  sentToFinanceDate?: string;
  sentToCompanyDate?: string;
  processNumber?: string;
  receivedFromCompanyDate?: string;
  liquidationNs?: string;
  liquidationDate?: string;

  // New fields
  type?: CommitmentType;
  materialArrivals?: MaterialArrival[];
  liquidations?: Liquidation[];
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
  type: ContractType;
  pi: string;
  mainFiscal: string;
  substituteFiscal: string;
  biNumber: string;
  created_at?: string;
}

export type SortField = 'valueReceived' | 'value' | 'date' | 'deadline' | 'created_at' | 'nc' | 'ne' | 'balance';
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
  type?: string;
}

export type ActionType = 'CREATE' | 'UPDATE' | 'DELETE' | 'NOTIFICATION';
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
