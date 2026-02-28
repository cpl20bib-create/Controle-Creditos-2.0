// Função principal de formatação para o padrão brasileiro
export const formatDateBR = (dateString: string | null | undefined) => {
  if (!dateString) return "";
  const pureDate = dateString.split('T')[0].split(' ')[0];
  const [year, month, day] = pureDate.split('-');
  return (year && month && day) ? `${day}/${month}/${year}` : dateString;
};

// Função que o CreditForm está pedindo (Apelido para a formatDateBR)
export const toLocalDateString = formatDateBR;

// Função genérica caso algum componente use apenas "formatDate"
export const formatDate = formatDateBR;

// Função de conversão para cálculos e filtros
export const parseLocalDate = (dateString: string | null | undefined) => {
  if (!dateString) return null;
  const parts = dateString.split('T')[0].split(' ')[0].split('-');
  const [year, month, day] = parts.map(Number);
  return new Date(year, month - 1, day);
};
