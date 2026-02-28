export const formatDate = (dateString: string | null | undefined) => {
  if (!dateString) return "";
  
  // Se a data vier com o T00:00:00 ou espaço, pegamos apenas a parte YYYY-MM-DD
  const pureDate = dateString.split('T')[0].split(' ')[0];
  const [year, month, day] = pureDate.split('-');
  
  if (!year || !month || !day) return dateString;
  
  return `${day}/${month}/${year}`;
};
