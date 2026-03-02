export const formatDateBR = (dateString: any) => {
  // Se não for uma string ou estiver vazio, retorna vazio em vez de dar erro
  if (!dateString || typeof dateString !== 'string') {
    return "";
  }
  
  try {
    const pureDate = dateString.split('T')[0].split(' ')[0];
    const parts = pureDate.split('-');
    
    if (parts.length !== 3) return dateString;
    
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  } catch (error) {
    console.error("Erro ao formatar data:", error);
    return "";
  }
};

export const toLocalDateString = formatDateBR;
export const formatDate = formatDateBR;

export const parseLocalDate = (dateString: any) => {
  if (!dateString || typeof dateString !== 'string') return null;
  
  try {
    const parts = dateString.split('T')[0].split(' ')[0].split('-');
    if (parts.length !== 3) return null;
    
    const [year, month, day] = parts.map(Number);
    return new Date(year, month - 1, day);
  } catch (error) {
    return null;
  }
};
