// GET /.netlify/functions/download-file?id=123
// Retorna o Excel "limpo" (sem linhas vazias) em base64
import * as XLSX from 'xlsx';
import { getSql, cors, json, error } from './_db.js';

function limparExcel(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  for (const sheetName of wb.SheetNames) {
    if (sheetName.toLowerCase().includes('document map')) continue;
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });
    if (rows.length < 2) continue;
    let cabIdx = -1;
    for (let i = 0; i < Math.min(15, rows.length); i++) {
      const row = rows[i] || [];
      if (row.some(v => v && String(v).includes('Ordem'))) {
        cabIdx = i; break;
      }
    }
    if (cabIdx === -1) continue;
    const novasLinhas = [...rows.slice(0, cabIdx + 1)];
    for (let i = cabIdx + 1; i < rows.length; i++) {
      const row = rows[i] || [];
      const op = row[4];
      if (op !== undefined && op !== null && String(op).trim() !== '') {
        novasLinhas.push(row);
      }
    }
    wb.Sheets[sheetName] = XLSX.utils.aoa_to_sheet(novasLinhas);
  }
  return XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: cors, body: '' };
  try {
    const id = parseInt(event.queryStringParameters?.id);
    if (isNaN(id)) return error('id obrigatório', 400);
    const sql = getSql();
    const [arq] = await sql`SELECT nome, buffer FROM arquivos WHERE id = ${id}`;
    if (!arq) return error('arquivo não encontrado', 404);
    const limpo = limparExcel(Buffer.from(arq.buffer));
    return json(200, {
      nome: arq.nome.replace(/\.[^.]+$/, '') + '_limpo.xlsx',
      base64: limpo.toString('base64')
    });
  } catch (err) {
    console.error(err);
    return error(err.message);
  }
};
