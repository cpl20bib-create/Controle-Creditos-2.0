
const DEFAULT_API_URL = 'http://localhost:3001';

// Tenta pegar a URL do localStorage ou usa a padrão
export const getApiUrl = () => localStorage.getItem('budget_api_url') || DEFAULT_API_URL;
export const setApiUrl = (url: string) => localStorage.setItem('budget_api_url', url);

async function request(endpoint: string, options: RequestInit = {}) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 4000); // Timeout ligeiramente menor para agilizar o feedback

  try {
    const response = await fetch(`${getApiUrl()}${endpoint}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    clearTimeout(id);
    
    if (!response.ok) return { error: true, status: response.status };
    
    const data = await response.json();
    return { data, error: false };
  } catch (error) {
    clearTimeout(id);
    // Retorna um objeto de erro padronizado em vez de dar throw
    return { error: true, message: 'Servidor inacessível', isNetworkError: true };
  }
}

export const api = {
  async getFullState() {
    const result = await request('/api/state');
    return result.error ? null : result.data;
  },
  async updateState(key: string, data: any) {
    const result = await request('/api/update', {
      method: 'POST',
      body: JSON.stringify({ key, data }),
    });
    return !result.error;
  },
  async addLog(log: any) {
    const result = await request('/api/logs', {
      method: 'POST',
      body: JSON.stringify(log),
    });
    return !result.error;
  }
};
