
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
    fonte: '0100000000',
    ptres: '123456',
    esfera: '1',
    ugr: '160211',
    organ: 'COMANDO MILITAR DO SUL',
    section: 'SALC',
    valueReceived: 500000,
    valueAvailable: 500000,
    valueUsed: 0,
    description: 'Crédito inicial para manutenção de viaturas blindadas e compra de suprimentos diversos.',
    deadline: '2026-12-31',
    created_at: '2024-01-15'
  }
];

export const INITIAL_COMMITMENTS: Commitment[] = [];
