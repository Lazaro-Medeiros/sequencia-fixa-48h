// POST /.netlify/functions/save-machine
// Body JSON: { nome, exibido, grupo, tipo }
import { getSql, cors, json, error } from './_db.js';

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: cors, body: '' };
  if (event.httpMethod !== 'POST') return error('Use POST', 405);
  try {
    const { nome, exibido = '', grupo = '', tipo = '' } = JSON.parse(event.body);
    if (!nome) return error('nome obrigatório', 400);
    const sql = getSql();
    await sql`
      INSERT INTO maquinas (nome, exibido, grupo, tipo)
      VALUES (${nome}, ${exibido}, ${grupo}, ${tipo})
      ON CONFLICT (nome) DO UPDATE SET
        exibido = EXCLUDED.exibido,
        grupo = EXCLUDED.grupo,
        tipo = EXCLUDED.tipo
    `;
    return json(200, { ok: true });
  } catch (err) {
    console.error(err);
    return error(err.message);
  }
};
