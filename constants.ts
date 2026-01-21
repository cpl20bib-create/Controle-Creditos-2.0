
import { Credit, Commitment, UG } from './types';

export const UGS: UG[] = ['160211', '167211'];

export const SECTION_OPTIONS = [
  'CURSO / ESTÁGIO / TRANSF',
  'SET FIN',
  'ALMOXARIFADO',
  'SALC',
  'RANCHO',
  'SIB',
  'PMT',
  'HT',
  'NPOR',
  'SAÚDE',
  'SFPC'
];

export const INITIAL_CREDITS: Credit[] = [
  {
    id: '1',
    ug: '160211',
    pi: '12345678901',
    nc: '2026NC000001',
    nd: '339030',
    organ: 'COMANDO MILITAR',
    section: 'SALC',
    valueReceived: 500000,
    // Added missing properties valueAvailable and valueUsed
    valueAvailable: 500000,
    valueUsed: 0,
    description: 'Crédito inicial para manutenção',
    deadline: '2026-12-31',
    // Fixed: changed createdAt to created_at to match the Credit interface
    created_at: '2024-01-15'
  }
];

export const INITIAL_COMMITMENTS: Commitment[] = [];
