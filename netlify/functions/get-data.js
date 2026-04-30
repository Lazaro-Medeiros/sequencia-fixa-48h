// GET /.netlify/functions/get-data
// Retorna tudo que o dashboard precisa: D, PRODUTOS, OP_TIME, DATAS, RECURSOS
import { getSql, cors, json, error } from './_db.js';

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: cors, body: '' };
  try {
    const sql = getSql();
    
    // Buscar todas as OPs - retorna em ordem da planilha (ordem ASC)
    const ops = await sql`
      SELECT arquivo_data, data_dia, recurso, op, ordem, codigo, produto, qtd, ini, fim
      FROM ops
      ORDER BY arquivo_data, recurso, data_dia, ordem
    `;

    // Reconstruir as estruturas que o dashboard usa
    const D = {};         // D[arquivoData][dataDia][recurso] = [op, op, ...]
    const PRODUTOS = {};  // PRODUTOS[op] = {c, p, q}
    const OP_TIME = {};   // OP_TIME[arquivoData][recurso][op] = {i, f}
    const datasSet = new Set();
    const recursosSet = new Set();

    for (const r of ops) {
      // Datas em formato YYYY-MM-DD (Postgres DATE vira string)
      const arquivoData = typeof r.arquivo_data === 'string'
        ? r.arquivo_data.slice(0, 10)
        : r.arquivo_data.toISOString().slice(0, 10);
      const dataDia = typeof r.data_dia === 'string'
        ? r.data_dia.slice(0, 10)
        : r.data_dia.toISOString().slice(0, 10);
      
      datasSet.add(arquivoData);
      recursosSet.add(r.recurso);

      if (!D[arquivoData]) D[arquivoData] = {};
      if (!D[arquivoData][dataDia]) D[arquivoData][dataDia] = {};
      if (!D[arquivoData][dataDia][r.recurso]) D[arquivoData][dataDia][r.recurso] = [];
      D[arquivoData][dataDia][r.recurso].push(r.op);

      if (!PRODUTOS[r.op]) PRODUTOS[r.op] = {};
      if (r.codigo && !PRODUTOS[r.op].c) PRODUTOS[r.op].c = r.codigo;
      if (r.produto && !PRODUTOS[r.op].p) PRODUTOS[r.op].p = r.produto;
      if (r.qtd && !PRODUTOS[r.op].q) PRODUTOS[r.op].q = parseFloat(r.qtd);

      if (!OP_TIME[arquivoData]) OP_TIME[arquivoData] = {};
      if (!OP_TIME[arquivoData][r.recurso]) OP_TIME[arquivoData][r.recurso] = {};
      const fmtTs = (t) => {
        if (!t) return null;
        if (typeof t === 'string') return t.replace('T', ' ').substring(0, 19);
        return t.toISOString().replace('T', ' ').substring(0, 19);
      };
      OP_TIME[arquivoData][r.recurso][r.op] = { i: fmtTs(r.ini), f: fmtTs(r.fim) };
    }

    return json(200, {
      D,
      PRODUTOS,
      OP_TIME,
      DATAS: [...datasSet].sort(),
      RECURSOS: [...recursosSet]
    });
  } catch (err) {
    console.error(err);
    return error(err.message);
  }
};
