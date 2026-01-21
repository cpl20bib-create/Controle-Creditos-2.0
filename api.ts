
import { createClient } from '@supabase/supabase-js';

// No ambiente de execução, as variáveis devem estar disponíveis em process.env
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('CRÍTICO: SUPABASE_URL ou SUPABASE_ANON_KEY não estão definidos no ambiente (process.env).');
  console.log('Status das variáveis:', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey
  });
}

// Inicializa o cliente apenas se tiver as chaves
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

export const api = {
  /**
   * Verifica se o banco está acessível com um ping simples
   */
  async checkConnection(): Promise<boolean> {
    if (!supabase) return false;
    try {
      const { error } = await supabase.from('users').select('id', { count: 'exact', head: true }).limit(1);
      return !error;
    } catch (e) {
      console.error('Falha técnica ao tentar conectar ao Supabase:', e);
      return false;
    }
  },

  async getFullState() {
    if (!supabase) {
      console.error('Erro: Cliente Supabase não inicializado (chaves ausentes).');
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

      if (errC || errCom || errR || errCan || errU || errLog) {
        throw new Error('Falha em uma ou mais consultas ao banco de dados.');
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
      console.error('Erro detalhado na busca de estado total:', error);
      return null;
    }
  },

  async upsert(table: string, data: any) {
    if (!supabase) {
      throw new Error(`Conexão com banco de dados não estabelecida (Cliente nulo).`);
    }
    const { error } = await supabase.from(table).upsert(data);
    if (error) {
      console.error(`Erro de Upsert em ${table}:`, error);
      throw new Error(error.message);
    }
    return true;
  },

  async delete(table: string, id: string) {
    if (!supabase) throw new Error('Sem conexão com o banco.');
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) {
      console.error(`Erro ao deletar de ${table}:`, error);
      throw new Error(error.message);
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
    if (error) console.error('Falha ao gravar log:', error.message);
    return !error;
  },

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
