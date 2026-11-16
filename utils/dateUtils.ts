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

export const toLocalDateString = (date: Date | string = new Date()): string => {
  if (typeof date === 'string') {
    if (/^\d{4}-\d{2}-\d{2}/.test(date)) return date.split('T')[0];
    return date;
  }
  if (!(date instanceof Date) || isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getDefaultDateForYear = (activeYear: number): string => {
  const now = new Date();
  if (now.getFullYear() === activeYear) {
    return toLocalDateString(now);
  }
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${activeYear}-${month}-${day}`;
};

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
