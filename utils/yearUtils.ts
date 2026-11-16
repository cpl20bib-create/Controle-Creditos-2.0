import { Credit, Commitment, Cancellation, Refund, Contract, AuditLog } from '../types';

export const BASE_FISCAL_YEARS = [2026, 2027];

export const getAvailableFiscalYears = (now: Date = new Date()): number[] => {
  const currentYear = now.getFullYear();
  const years = new Set<number>(BASE_FISCAL_YEARS);
  if (currentYear > 2027) {
    years.add(currentYear);
  }
  return Array.from(years).sort((a, b) => a - b);
};

export const getDefaultFiscalYear = (now: Date = new Date()): number => {
  const currentYear = now.getFullYear();
  return currentYear >= 2027 ? currentYear : 2026;
};

const extractYearFromDateString = (dateStr?: string): number | null => {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const match = dateStr.trim().match(/^(20\d{2})-/);
  if (match) {
    const year = Number(match[1]);
    if (year >= 2020 && year <= 2100) return year;
  }
  return null;
};

const extractYearFromDocNumber = (doc?: string): number | null => {
  if (!doc || typeof doc !== 'string') return null;
  const match = doc.trim().match(/^(20\d{2})(?:NC|NE|RO|NS)/i) || doc.trim().match(/^(20\d{2})/);
  if (match) {
    const year = Number(match[1]);
    if (year >= 2020 && year <= 2100) return year;
  }
  return null;
};

export const getCreditFiscalYear = (credit: Credit): number => {
  const ncYear = extractYearFromDocNumber(credit.nc);
  if (ncYear && ncYear >= 2026) return ncYear;

  const deadlineYear = extractYearFromDateString(credit.deadline);
  if (deadlineYear && deadlineYear >= 2026) return deadlineYear;

  const createdYear = extractYearFromDateString(credit.created_at);
  if (createdYear && createdYear >= 2026) return createdYear;

  return 2026;
};

export const getCommitmentFiscalYear = (
  commitment: Commitment,
  creditsById?: Map<string, Credit>
): number => {
  if (commitment.fiscalYear && commitment.fiscalYear >= 2026) {
    return commitment.fiscalYear;
  }

  const neYear = extractYearFromDocNumber(commitment.ne);
  if (neYear && neYear >= 2026) return neYear;

  if (creditsById && commitment.creditId) {
    const credit = creditsById.get(commitment.creditId);
    if (credit) return getCreditFiscalYear(credit);
  }

  const dateYear = extractYearFromDateString(commitment.date);
  if (dateYear && dateYear >= 2026) return dateYear;

  return 2026;
};

export const getCancellationFiscalYear = (
  cancellation: Cancellation,
  commitmentsById?: Map<string, Commitment>,
  creditsById?: Map<string, Credit>
): number => {
  if (commitmentsById && cancellation.commitmentId) {
    const com = commitmentsById.get(cancellation.commitmentId);
    if (com) return getCommitmentFiscalYear(com, creditsById);
  }

  const roYear = extractYearFromDocNumber(cancellation.ro);
  if (roYear && roYear >= 2026) return roYear;

  const dateYear = extractYearFromDateString(cancellation.date);
  if (dateYear && dateYear >= 2026) return dateYear;

  return 2026;
};

export const getRefundFiscalYear = (
  refund: Refund,
  creditsById?: Map<string, Credit>
): number => {
  if (creditsById && refund.creditId) {
    const credit = creditsById.get(refund.creditId);
    if (credit) return getCreditFiscalYear(credit);
  }

  const dateYear = extractYearFromDateString(refund.date);
  if (dateYear && dateYear >= 2026) return dateYear;

  return 2026;
};

export const isContractInFiscalYear = (contract: Contract, activeYear: number): boolean => {
  const startYear =
    extractYearFromDateString(contract.startDate) ??
    extractYearFromDateString(contract.created_at) ??
    (() => {
      const m = contract.contractNumber?.match(/(20\d{2})/);
      return m ? Number(m[1]) : 2026;
    })();

  const endYear = extractYearFromDateString(contract.endDate) ?? startYear;

  return (startYear <= activeYear && endYear >= activeYear) || startYear === activeYear;
};

export const getAuditLogFiscalYear = (log: AuditLog): number => {
  const yearFromTs = extractYearFromDateString(log.timestamp);
  if (yearFromTs && yearFromTs >= 2026) return yearFromTs;
  if (log.timestamp) {
    const parsed = new Date(log.timestamp);
    if (!isNaN(parsed.getTime())) {
      const y = parsed.getFullYear();
      if (y >= 2026) return y;
    }
  }
  return 2026;
};
