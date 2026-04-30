// DELETE /.netlify/functions/delete-file?id=123
import { getSql, cors, json, error } from './_db.js';

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: cors, body: '' };
  try {
    const id = parseInt(event.queryStringParameters?.id);
    if (isNaN(id)) return error('id obrigatório', 400);
    const sql = getSql();
    await sql`DELETE FROM arquivos WHERE id = ${id}`;  // ON DELETE CASCADE remove OPs
    return json(200, { ok: true });
  } catch (err) {
    console.error(err);
    return error(err.message);
  }
};
