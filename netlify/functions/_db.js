// Helper compartilhado para conectar no Neon
import { neon } from '@neondatabase/serverless';

export function getSql() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL não configurada nas variáveis de ambiente do Netlify');
  }
  return neon(process.env.DATABASE_URL);
}

export const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

export const json = (status, data) => ({
  statusCode: status,
  headers: { 'Content-Type': 'application/json', ...cors },
  body: JSON.stringify(data)
});

export const error = (msg, status = 500) => json(status, { error: msg });
