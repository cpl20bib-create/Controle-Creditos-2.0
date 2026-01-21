
import { createClient } from '@supabase/supabase-js';
import { Credit, Commitment, Refund, Cancellation, User, AuditLog } from './types';

const supabaseUrl = 'https://tdbpxsdvtogymvercpqc.supabase.co';
const supabaseAnonKey = 'sb_publishable_uMAhraANc199PrH8EQD9-w_MW39GXUK';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
      valueReceived: Number(c.valueReceived) || 0,
      valueAvailable: Number(c.valueAvailable) || 0,
      valueUsed: Number(c.valueUsed) || 0,
      description: c.description || '',
      deadline: c.deadline
    }),
    fromDB: (row: any): Credit => ({
      id: row.id,
      ug: row.ug,
      pi: row.pi,
      nc: row.nc,
      nd: row.nd,
      organ: row.organ,
      section: row.section,
      valueReceived: Number(row.valueReceived) || 0,
      valueAvailable: Number(row.valueAvailable) || 0,
      valueUsed: Number(row.valueUsed) || 0,
      description: row.description || '',
      deadline: row.deadline,
      created_at: row.created_at || new Date().toISOString()
    })
  },
  commitments: {
    toDB: (c: Commitment) => ({
      id: c.id,
      ne: c.ne,
      creditId: c.creditId, // Nome exato solicitado
      value: Number(c.value) || 0,
      date: c.date,
      description: c.description || ''
    }),
    fromDB: (row: any): Commitment => ({
      id: row.id,
      ne: row.ne,
      creditId: row.creditId,
      value: Number(row.value) || 0,
      date: row.date,
      description: row.description || ''
    })
  },
  cancellations: {
    toDB: (c: Cancellation) => ({
      id: c.id,
      commitmentId: c.commitmentId, // Nome exato solicitado
      value: Number(c.value) || 0,
      ro: c.ro,
      date: c.date,
      bi: c.bi || ''
    }),
    fromDB: (row: any): Cancellation => ({
      id: row.id,
      commitmentId: row.commitmentId,
      value: Number(row.value) || 0,
      ro: row.ro,
      date: row.date,
      bi: row.bi || ''
    })
  },
  refunds: {
    toDB: (r: Refund) => ({
      id: r.id,
      creditId: r.creditId,
      value: Number(r.value) || 0,
      date: r.date,
      description: r.description || ''
    }),
    fromDB: (row: any): Refund => ({
      id: row.id,
      creditId: row.creditId,
      value: Number(row.value) || 0,
      date: row.date,
      description: row.description || ''
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
      return !error;
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

      return {
        credits: (resC.data || []).map(mappers.credits.fromDB),
        commitments: (resCom.data || []).map(mappers.commitments.fromDB),
        refunds: (resR.data || []).map(mappers.refunds.fromDB),
        cancellations: (resCan.data || []).map(mappers.cancellations.fromDB),
        users: (resU.data || []).map(mappers.users.fromDB),
        auditLogs: resLog.data || []
      };
    } catch (err) {
      console.error('Erro ao buscar estado:', err);
      return null;
    }
  },

  async upsert(table: string, data: any) {
    const mapper = (mappers as any)[table];
    const payload = mapper ? mapper.toDB(data) : data;
    const { error } = await supabase.from(table).upsert(payload);
    if (error) throw new Error(error.message);
    return true;
  },

  async delete(table: string, id: string) {
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) throw new Error(error.message);
    return true;
  },

  async addLog(log: AuditLog) {
    try {
      await supabase.from('audit_logs').insert(log);
    } catch {}
    return true;
  },

  subscribeToChanges(callback: () => void) {
    const channel = supabase
      .channel('db-changes')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => callback())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }
};
