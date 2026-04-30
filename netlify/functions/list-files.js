// GET /.netlify/functions/list-files
import { getSql, cors, json, error } from './_db.js';

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: cors, body: '' };
  try {
    const sql = getSql();
    const arquivos = await sql`
      SELECT 
        a.id,
        a.nome,
        a.tipo,
        a.arquivo_data,
        a.tamanho,
        a.uploaded_at,
        (SELECT COUNT(DISTINCT data_dia) FROM ops WHERE arquivo_id = a.id) AS num_datas,
        (SELECT COUNT(DISTINCT recurso) FROM ops WHERE arquivo_id = a.id) AS num_recursos
      FROM arquivos a
      ORDER BY a.uploaded_at DESC
    `;
    return json(200, { arquivos });
  } catch (err) {
    console.error(err);
    return error(err.message);
  }
};
