
import { credito, empenho, UG } from './types';

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

export const INITIAL_creditoos: credito[] = [
  {
    id: '1',
    ug: '160211',
    pi: '12345678901',
    nc: '2026NC000001',
    nd: '339030',
    organ: 'COMANDO MILITAR',
    section: 'SALC',
    valueReceived: 500000,
    description: 'Crédito inicial para manutenção',
    deadline: '2026-12-31',
    createdAt: '2024-01-15'
  }
];

export const INITIAL_empenhos: empenho[] = [];
