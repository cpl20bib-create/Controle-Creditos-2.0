
import { createClient } from '@supabase/supabase-js';
import { Credit, Commitment, Refund, Cancellation, User, AuditLog } from './types';

// Credenciais reais do Supabase
const supabaseUrl = 'https://tdbpxsdvtogymvercpqc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkYnB4c2R2dG9neW12ZXJjcHFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4NTgyNzQsImV4cCI6MjA4NDQzNDI3NH0.bo4nLx1MkLzWMp-iS8rA-p3JG_BaQZls2-ok4rl0G_o';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Mappers para converter entre os padrões do Frontend (CamelCase) e do Banco (Snake_Case)
 */
const mappers = {
  credits: {
    toDB: (c: Credit) => ({
      id: c.id,
      ug: c.ug,
      pi: c.pi,
      nc: c.nc,
      nd: c.nd,
      organ: c.organ,
      section: c.section,
      value_received: c.valueReceived,
      description: c.description,
      deadline: c.deadline,
      created_at: c.createdAt
    }),
    fromDB: (row: any): Credit => ({
      id: row.id,
      ug: row.ug,
      pi: row.pi,
      nc: row.nc,
      nd: row.nd,
      organ: row.organ,
      section: row.section,
      valueReceived: row.value_received,
      description: row.description,
      deadline: row.deadline,
      createdAt: row.created_at
    })
  },
  commitments: {
    toDB: (c: Commitment) => ({
      id: c.id,
      ne: c.ne,
      value: c.value,
      date: c.date,
      description: c.description,
      allocations: c.allocations?.map(a => ({ credit_id: a.creditId, value: a.value }))
    }),
    fromDB: (row: any): Commitment => ({
      id: row.id,
      ne: row.ne,
      value: row.value,
      date: row.date,
      description: row.description,
      allocations: row.allocations?.map((a: any) => ({ credit_id: a.credit_id, value: a.value })) || []
    })
  },
  refunds: {
    toDB: (r: Refund) => ({
      id: r.id,
      credit_id: r.creditId,
      value: r.value,
      date: r.date,
      description: r.description
    }),
    fromDB: (row: any): Refund => ({
      id: row.id,
      creditId: row.credit_id,
      value: row.value,
      date: row.date,
      description: row.description
    })
  },
  cancellations: {
    toDB: (c: Cancellation) => ({
      id: c.id,
      commitment_id: c.commitmentId,
      value: c.value,
      ro: c.ro,
      date: c.date,
      bi: c.bi
    }),
    fromDB: (row: any): Cancellation => ({
      id: row.id,
      commitmentId: row.commitment_id,
      value: row.value,
      ro: row.ro,
      date: row.date,
      bi: row.bi
    })
  },
  audit_logs: {
    toDB: (l: AuditLog) => ({
      id: l.id,
      user_id: l.userId,
      user_name: l.userName,
      action: l.action,
      entity_type: l.entityType,
      entity_id: l.entityId,
      description: l.description,
      timestamp: l.timestamp
    }),
    fromDB: (row: any): AuditLog => ({
      id: row.id,
      userId: row.user_id,
      userName: row.user_name,
      action: row.action,
      entityType: row.entity_type,
      entityId: row.entity_id,
      description: row.description,
      timestamp: row.timestamp
    })
  },
  users: {
    toDB: (u: User) => ({
      id: u.id,
      username: u.username,
      password: u.password,
      role: u.role,
      name: u.name
    }),
    fromDB: (row: any): User => ({
      id: row.id,
      username: row.username,
      password: row.password,
      role: row.role,
      name: row.name
    })
  }
};

export const api = {
  async checkConnection(): Promise<boolean> {
    try {
      const { data, error } = await supabase.from('users').select('id').limit(1);
      if (error) {
        console.error('Erro ao conectar Supabase:', error.message);
        return false;
      }
      return true;
    } catch {
      return false;
    }
  },

  async getFullState() {
    try {
      const [resC, resCom, resR, resCan, resU, resLog] = await Promise.all([
        supabase.from('credits').select('*'),
        supabase.from('commitments').select('*'),
        supabase.from('refunds').select('*'),
        supabase.from('cancellations').select('*'),
        supabase.from('users').select('*'),
        supabase.from('audit_logs').select('*').order('timestamp', { ascending: false }).limit(100)
      ]);

      if (resC.error || resCom.error || resU.error) {
        console.error('Falha ao baixar dados do servidor');
        return null;
      }

      return {
        credits: (resC.data || []).map(mappers.credits.fromDB),
        commitments: (resCom.data || []).map(mappers.commitments.fromDB),
        refunds: (resR.data || []).map(mappers.refunds.fromDB),
        cancellations: (resCan.data || []).map(mappers.cancellations.fromDB),
        users: (resU.data || []).map(mappers.users.fromDB),
        auditLogs: (resLog.data || []).map(mappers.audit_logs.fromDB)
      };
    } catch (err) {
      return null;
    }
  },

  async upsert(table: string, data: any) {
    const dbTable = table === 'auditLogs' ? 'audit_logs' : table;
    const mapper = (mappers as any)[dbTable];
    const payload = mapper ? mapper.toDB(data) : data;
    
    const { error } = await supabase.from(dbTable).upsert(payload);
    
    if (error) {
      console.error(`Erro de Gravação em ${dbTable}:`, error);
      throw new Error(`Erro ao salvar no banco de dados: ${error.message}`);
    }
    return true;
  },

  async delete(table: string, id: string) {
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) throw new Error(error.message);
    return true;
  },

  async addLog(log: AuditLog) {
    try {
      const payload = mappers.audit_logs.toDB(log);
      await supabase.from('audit_logs').insert(payload);
    } catch (e) {
      console.error('Falha ao registrar log');
    }
    return true;
  },

  subscribeToChanges(callback: () => void) {
    const channel = supabase
      .channel('db-changes')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
        callback();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
};
