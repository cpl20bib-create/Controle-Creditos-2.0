import { createClient } from '@supabase/supabase-js';

// As variáveis de ambiente devem ser configuradas no painel do Vercel
// No Vite, elas precisam obrigatoriamente começar com VITE_
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Inicializa o cliente apenas se ambos os parâmetros existirem
export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const api = {
  async getFullState() {
    if (!supabase) {
      console.warn('Supabase não configurado. Verifique VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.');
      return null;
    }

    try {
      const [
        { data: creditos, error: errcreditos },
        { data: empenhos, error: errempenhos },
        { data: recolhimentos, error: errrecolhimentos },
        { data: anulacoes_empenho, error: erranulacoes_empenho },
        { data: usuarios, error: errusuarios },
        { data: auditLogs, error: errLogs }
      ] = await Promise.all([
        supabase.from('creditos').select('*'),
        supabase.from('empenhos').select('*'),
        supabase.from('recolhimentos').select('*'),
        supabase.from('cancelamentos').select('*'),
        supabase.from('usuarios').select('*'),
        supabase.from('anulacoes_empenho').select('*'),
        supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(100)
      ]);

      // Se houver qualquer erro crítico de dotação, tratamos como falha de sincronização
      if (errcreditos || errempenhos || errusuarios) {
        console.error('Erro na resposta do Supabase:', { errcreditos, errempenhos });
        return null;
      }

      return {
        creditos: creditos || [],
        empenhos: empenhos || [],
        recolhimentos: recolhimentos || [],
        anulacoes_empenho: anulacoes_empenho || [],
        usuarios: usuarios || [],
        auditLogs: auditLogs || []
      };
    } catch (error) {
      console.error('Erro crítico ao buscar estado do Supabase:', error);
      return null;
    }
  },

  async upsert(table: string, data: any) {
    if (!supabase) return false;
    try {
      const { error } = await supabase.from(table).upsert(data);
      if (error) console.error(`Erro ao salvar em ${table}:`, error);
      return !error;
    } catch (e) {
      return false;
    }
  },

  async delete(table: string, id: string) {
    if (!supabase) return false;
    try {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) console.error(`Erro ao excluir de ${table}:`, error);
      return !error;
    } catch (e) {
      return false;
    }
  },

  async addLog(log: any) {
    if (!supabase) return false;
    try {
      const { error } = await supabase.from('audit_logs').insert(log);
      return !error;
    } catch (e) {
      return false;
    }
  }
};
