
import { createClient } from '@supabase/supabase-js';

// Tenta obter as chaves de múltiplas fontes possíveis no ambiente
const getEnv = (key: string) => {
  if (typeof process !== 'undefined' && process.env?.[key]) return process.env[key];
  // @ts-ignore - Fallback para outros ambientes de build
  if (typeof import.meta !== 'undefined' && import.meta.env?.[key]) return import.meta.env[key];
  return undefined;
};

const supabaseUrl = getEnv('SUPABASE_URL');
const supabaseAnonKey = getEnv('SUPABASE_ANON_KEY');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('CRÍTICO: SUPABASE_URL ou SUPABASE_ANON_KEY não configurados nas variáveis de ambiente.');
}

export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

export const api = {
  async getFullState() {
    if (!supabase) {
      console.error('Erro: Cliente Supabase não inicializado.');
      return null;
    }

    try {
      const [
        { data: credits, error: errC },
        { data: commitments, error: errCom },
        { data: refunds, error: errR },
        { data: cancellations, error: errCan },
        { data: users, error: errU },
        { data: auditLogs, error: errLog }
      ] = await Promise.all([
        supabase.from('credits').select('*'),
        supabase.from('commitments').select('*'),
        supabase.from('refunds').select('*'),
        supabase.from('cancellations').select('*'),
        supabase.from('users').select('*'),
        supabase.from('audit_logs').select('*, users(name)').order('created_at', { ascending: false }).limit(100)
      ]);

      const anyError = errC || errCom || errR || errCan || errU || errLog;
      if (anyError) {
        console.error('Erro na busca de dados:', anyError);
        return null;
      }

      return {
        credits: credits || [],
        commitments: commitments || [],
        refunds: refunds || [],
        cancellations: cancellations || [],
        users: users || [],
        auditLogs: auditLogs || []
      };
    } catch (error) {
      console.error('Exceção capturada na sincronização:', error);
      return null;
    }
  },

  async upsert(table: string, data: any) {
    if (!supabase) {
      console.error(`Impossível salvar em ${table}: Sem conexão.`);
      return false;
    }
    const { error } = await supabase.from(table).upsert(data);
    if (error) {
      console.error(`Erro ao salvar em ${table}:`, error.message);
      return false;
    }
    return true;
  },

  async delete(table: string, id: string) {
    if (!supabase) return false;
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) {
      console.error(`Erro ao deletar de ${table}:`, error.message);
      return false;
    }
    return true;
  },

  async addLog(log: any) {
    if (!supabase) return false;
    const payload = {
      user_id: log.userId,
      action: log.action,
      table_name: log.entityType,
      entity_id: log.entityId,
      description: log.description,
      created_at: new Date().toISOString()
    };
    const { error } = await supabase.from('audit_logs').insert(payload);
    if (error) console.error('Falha ao gravar log de auditoria:', error.message);
    return !error;
  },

  subscribeToChanges(callback: () => void) {
    if (!supabase) return () => {};

    const channel = supabase
      .channel('db-changes')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
        callback();
      })
      .subscribe((status) => {
        console.log('Status do canal Realtime:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }
};
