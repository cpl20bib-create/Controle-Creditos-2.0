
import { createClient } from '@supabase/supabase-js';

// No Vercel, estas variáveis devem ser configuradas no Dashboard do Projeto
const supabaseUrl = typeof process !== 'undefined' ? process.env.SUPABASE_URL : undefined;
const supabaseAnonKey = typeof process !== 'undefined' ? process.env.SUPABASE_ANON_KEY : undefined;

export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

export const api = {
  async getFullState() {
    if (!supabase) return null;

    try {
      const [
        { data: credits },
        { data: commitments },
        { data: refunds },
        { data: cancellations },
        { data: users },
        { data: auditLogs }
      ] = await Promise.all([
        supabase.from('credits').select('*'),
        supabase.from('commitments').select('*'),
        supabase.from('refunds').select('*'),
        supabase.from('cancellations').select('*'),
        supabase.from('users').select('*'),
        supabase.from('audit_logs').select('*').order('timestamp', { ascending: false }).limit(50)
      ]);

      return {
        credits: credits || [],
        commitments: commitments || [],
        refunds: refunds || [],
        cancellations: cancellations || [],
        users: users || [],
        auditLogs: auditLogs || []
      };
    } catch (error) {
      console.error('Falha na sincronização inicial:', error);
      return null;
    }
  },

  async upsert(table: string, data: any) {
    if (!supabase) return false;
    const { error } = await supabase.from(table).upsert(data);
    return !error;
  },

  async delete(table: string, id: string) {
    if (!supabase) return false;
    const { error } = await supabase.from(table).delete().eq('id', id);
    return !error;
  },

  async addLog(log: any) {
    if (!supabase) return false;
    const { error } = await supabase.from('audit_logs').insert(log);
    return !error;
  },

  // Escuta mudanças em tempo real para múltiplas máquinas
  subscribeToChanges(callback: () => void) {
    if (!supabase) return () => {};

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
