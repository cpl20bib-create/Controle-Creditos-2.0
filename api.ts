
import { createClient } from '@supabase/supabase-js';
import { Credit, Commitment, Refund, Cancellation, User, AuditLog } from './types';

// Credenciais do Supabase - Atualizadas com a chave funcional
const supabaseUrl = 'https://tdbpxsdvtogymvercpqc.supabase.co';
const supabaseAnonKey = 'sb_publishable_uMAhraANc199PrH8EQD9-w_MW39GXUK';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Mappers Robustos
 * toDB: Prepara os dados para o Supabase (Snake Case)
 * fromDB: Converte os dados para o Frontend (Camel Case)
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
      value_received: Number(c.valueReceived) || 0,
      description: c.description || '',
      deadline: c.deadline
      // created_at REMOVIDO: O banco de dados gera este campo automaticamente (DEFAULT now())
    }),
    fromDB: (row: any): Credit => ({
      id: row.id,
      ug: row.ug,
      pi: row.pi,
      nc: row.nc,
      nd: row.nd,
      organ: row.organ,
      section: row.section,
      valueReceived: Number(row.value_received) || 0,
      description: row.description || '',
      deadline: row.deadline,
      // Fallback para a data de criação caso o banco retorne nulo
      createdAt: row.created_at || new Date().toISOString()
    })
  },
  commitments: {
    toDB: (c: Commitment) => ({
      id: c.id,
      ne: c.ne,
      value: Number(c.value) || 0,
      date: c.date,
      description: c.description || '',
      allocations: c.allocations?.map(a => ({ 
        credit_id: a.creditId, 
        value: Number(a.value) || 0 
      }))
    }),
    fromDB: (row: any): Commitment => ({
      id: row.id,
      ne: row.ne,
      value: Number(row.value) || 0,
      date: row.date,
      description: row.description || '',
      allocations: (row.allocations || []).map((a: any) => ({ 
        creditId: a.credit_id, 
        value: Number(a.value) || 0 
      }))
    })
  },
  refunds: {
    toDB: (r: Refund) => ({
      id: r.id,
      credit_id: r.creditId,
      value: Number(r.value) || 0,
      date: r.date,
      description: r.description || ''
    }),
    fromDB: (row: any): Refund => ({
      id: row.id,
      creditId: row.credit_id,
      value: Number(row.value) || 0,
      date: row.date,
      description: row.description || ''
    })
  },
  cancellations: {
    toDB: (c: Cancellation) => ({
      id: c.id,
      commitment_id: c.commitmentId,
      value: Number(c.value) || 0,
      ro: c.ro,
      date: c.date,
      bi: c.bi || ''
    }),
    fromDB: (row: any): Cancellation => ({
      id: row.id,
      commitmentId: row.commitment_id,
      value: Number(row.value) || 0,
      ro: row.ro,
      date: row.date,
      bi: row.bi || ''
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
      description: l.description || '',
      timestamp: l.timestamp
    }),
    fromDB: (row: any): AuditLog => ({
      id: row.id,
      userId: row.user_id,
      userName: row.user_name,
      action: row.action,
      entityType: row.entity_type,
      entityId: row.entity_id,
      description: row.description || '',
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
      const { error } = await supabase.from('users').select('id').limit(1);
      if (error) {
        console.error('Supabase Connection Error:', error.message);
        return false;
      }
      return true;
    } catch (e) {
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

      return {
        credits: (resC.data || []).map(mappers.credits.fromDB),
        commitments: (resCom.data || []).map(mappers.commitments.fromDB),
        refunds: (resR.data || []).map(mappers.refunds.fromDB),
        cancellations: (resCan.data || []).map(mappers.cancellations.fromDB),
        users: (resU.data || []).map(mappers.users.fromDB),
        auditLogs: (resLog.data || []).map(mappers.audit_logs.fromDB)
      };
    } catch (err) {
      console.error('Falha ao carregar estado:', err);
      return null;
    }
  },

  async upsert(table: string, data: any) {
    const dbTable = (table === 'auditLogs' || table === 'audit_logs') ? 'audit_logs' : table;
    const mapper = (mappers as any)[dbTable];
    const payload = mapper ? mapper.toDB(data) : data;
    
    // Upsert usando a ID como alvo de conflito padrão
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
      console.warn('Não foi possível gravar log remoto');
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
