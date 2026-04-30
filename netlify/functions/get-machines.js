// GET /.netlify/functions/get-machines
import { getSql, cors, json, error } from './_db.js';

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: cors, body: '' };
  try {
    const sql = getSql();
    const maquinas = await sql`SELECT nome, exibido, grupo, tipo FROM maquinas ORDER BY nome`;
    return json(200, { maquinas });
  } catch (err) {
    console.error(err);
    return error(err.message);
  }
};
