// POST /.netlify/functions/upload
// Body JSON: { nome: string, base64: string }  (base64 do .xlsx)
import * as XLSX from 'xlsx';
import { getSql, cors, json, error } from './_db.js';

function parseDataExcel(valor) {
  if (valor === undefined || valor === null || valor === '') return null;
  if (valor instanceof Date) return isNaN(valor.getTime()) ? null : valor;
  if (typeof valor === 'number') {
    const utcDays = valor - 25569;
    return new Date(utcDays * 86400 * 1000);
  }
  const s = String(valor).replace(/\s+/g, ' ').trim();
  let m = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (m) {
    const [_, dd, mm, yyyy, hh = 0, mi = 0] = m;
    return new Date(parseInt(yyyy), parseInt(mm)-1, parseInt(dd), parseInt(hh), parseInt(mi));
  }
  m = s.match(/(\d{4})-(\d{1,2})-(\d{1,2})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (m) {
    const [_, yyyy, mm, dd, hh = 0, mi = 0] = m;
    return new Date(parseInt(yyyy), parseInt(mm)-1, parseInt(dd), parseInt(hh), parseInt(mi));
  }
  return null;
}

function fmtDataLocal(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function fmtDataHoraLocal(d) {
  const base = fmtDataLocal(d);
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${base} ${hh}:${mi}:${ss}`;
}

function extrairDataDoNome(nome) {
  const semExt = nome.replace(/\.[^.]+$/, '');
  let m = semExt.match(/(\d{1,2})[.\-_/](\d{1,2})(?:[.\-_/](\d{2,4}))?/);
  if (m) {
    let [_, dd, mm, yyyy] = m;
    dd = parseInt(dd); mm = parseInt(mm);
    if (yyyy) yyyy = parseInt(yyyy.length === 2 ? '20' + yyyy : yyyy);
    else yyyy = new Date().getFullYear();
    if (dd >= 1 && dd <= 31 && mm >= 1 && mm <= 12) {
      return `${yyyy}-${String(mm).padStart(2,'0')}-${String(dd).padStart(2,'0')}`;
    }
  }
  m = semExt.match(/(\d{2})(\d{2})(\d{4})/);
  if (m) {
    const [_, dd, mm, yyyy] = m;
    if (parseInt(dd) <= 31 && parseInt(mm) <= 12) {
      return `${yyyy}-${mm}-${dd}`;
    }
  }
  return null;
}

function parsearExcel(arrayBuffer) {
  const wb = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
  const result = { datas: new Set(), ops: [], recursos: new Set() };
  const docMapName = wb.SheetNames.find(n => n.toLowerCase().includes('document map')) || wb.SheetNames[0];
  const docMap = wb.Sheets[docMapName];
  const sheetParaRecurso = {};
  const dmRange = XLSX.utils.decode_range(docMap['!ref'] || 'A1:B1');
  for (let r = dmRange.s.r; r <= dmRange.e.r; r++) {
    const cellAddr = XLSX.utils.encode_cell({ r, c: 1 });
    const cell = docMap[cellAddr];
    if (cell && cell.v) {
      const sheetIdx = r + 1;
      const sheetName = `Sheet${sheetIdx}`;
      const nome = String(cell.v).trim();
      let recurso = nome;
      if (nome.includes(' - ')) {
        const partes = nome.split(' - ');
        recurso = partes[partes.length - 1].trim();
      }
      sheetParaRecurso[sheetName] = { recurso };
    }
  }

  for (const sheetName of wb.SheetNames) {
    if (sheetName === docMapName) continue;
    const ws = wb.Sheets[sheetName];
    if (!ws['!ref']) continue;
    const wsRange = XLSX.utils.decode_range(ws['!ref']);
    let cabIdx = -1;
    for (let r = wsRange.s.r; r <= Math.min(wsRange.s.r + 14, wsRange.e.r); r++) {
      for (let c = wsRange.s.c; c <= Math.min(wsRange.s.c + 9, wsRange.e.c); c++) {
        const cellAddr = XLSX.utils.encode_cell({ r, c });
        const cell = ws[cellAddr];
        if (cell && cell.v && String(cell.v).includes('Ordem')) {
          cabIdx = r; break;
        }
      }
      if (cabIdx !== -1) break;
    }
    if (cabIdx === -1) continue;
    const recurso = sheetParaRecurso[sheetName]?.recurso || sheetName;
    result.recursos.add(recurso);
    let linhaNum = 0;
    let vaziosSeguidos = 0;
    for (let r = cabIdx + 1; r <= wsRange.e.r; r++) {
      const opCell = ws[XLSX.utils.encode_cell({ r, c: 4 })];
      const op = opCell?.v;
      if (op === undefined || op === null || op === '') {
        vaziosSeguidos++;
        if (vaziosSeguidos >= 3) break;
        continue;
      }
      vaziosSeguidos = 0;
      linhaNum++;
      const codigo = ws[XLSX.utils.encode_cell({ r, c: 5 })]?.v;
      const produto = ws[XLSX.utils.encode_cell({ r, c: 7 })]?.v;
      const qtd = ws[XLSX.utils.encode_cell({ r, c: 16 })]?.v;
      const iniV = ws[XLSX.utils.encode_cell({ r, c: 19 })]?.v;
      const fimV = ws[XLSX.utils.encode_cell({ r, c: 21 })]?.v;
      const ini = parseDataExcel(iniV);
      const fim = parseDataExcel(fimV);
      if (!ini || !fim) continue;
      const dataDia = fmtDataLocal(ini);
      result.datas.add(dataDia);
      result.ops.push({
        recurso,
        op: String(op),
        ordem: linhaNum,
        codigo: codigo !== undefined ? String(codigo) : '',
        produto: produto !== undefined ? String(produto) : '',
        qtd: qtd !== undefined ? parseFloat(qtd) : null,
        ini: fmtDataHoraLocal(ini),
        fim: fmtDataHoraLocal(fim),
        dataDia
      });
    }
  }
  return result;
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: cors, body: '' };
  if (event.httpMethod !== 'POST') return error('Use POST', 405);

  console.log('[upload] Iniciado');
  try {
    const { nome, base64 } = JSON.parse(event.body);
    if (!nome || !base64) return error('nome e base64 obrigatórios', 400);
    console.log(`[upload] Recebido: ${nome} (${(base64.length/1024).toFixed(1)} KB base64)`);

    const buffer = Buffer.from(base64, 'base64');
    const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    console.log(`[upload] Buffer decodificado: ${buffer.length} bytes`);

    console.log('[upload] Parseando Excel...');
    const dadosParsed = parsearExcel(arrayBuffer);
    const datas = [...dadosParsed.datas].sort();
    console.log(`[upload] Parseado: ${dadosParsed.ops.length} OPs, ${dadosParsed.recursos.size} recursos, ${datas.length} datas`);
    if (!datas.length) return error('Nenhuma data válida detectada na planilha', 400);

    const arquivoData = extrairDataDoNome(nome) || datas[0];
    console.log(`[upload] arquivoData = ${arquivoData}`);

    const sql = getSql();
    console.log(`[upload] DB conectado. Inserindo arquivo "${nome}"...`);

    // Inserir arquivo
    const [arquivo] = await sql`
      INSERT INTO arquivos (nome, tipo, arquivo_data, tamanho, buffer)
      VALUES (${nome}, ${'Programação'}, ${arquivoData}, ${buffer.length}, ${buffer})
      RETURNING id
    `;
    const arquivoId = arquivo.id;
    console.log(`[upload] Arquivo salvo (id=${arquivoId}). Inserindo ${dadosParsed.ops.length} OPs em batch...`);

    // Inserir OPs em batch usando UNNEST (1 query só, muito mais rápido que N queries)
    if (dadosParsed.ops.length) {
      const ops = dadosParsed.ops;
      const arquivoIds = ops.map(() => arquivoId);
      const arquivoDatas = ops.map(() => arquivoData);
      const dataDias = ops.map(o => o.dataDia);
      const recursos = ops.map(o => o.recurso);
      const opsArr = ops.map(o => o.op);
      const ordens = ops.map(o => o.ordem);
      const codigos = ops.map(o => o.codigo || '');
      const produtos = ops.map(o => o.produto || '');
      const qtds = ops.map(o => o.qtd);
      const inis = ops.map(o => o.ini);
      const fims = ops.map(o => o.fim);

      await sql`
        INSERT INTO ops (arquivo_id, arquivo_data, data_dia, recurso, op, ordem, codigo, produto, qtd, ini, fim)
        SELECT * FROM UNNEST(
          ${arquivoIds}::int[],
          ${arquivoDatas}::date[],
          ${dataDias}::date[],
          ${recursos}::text[],
          ${opsArr}::text[],
          ${ordens}::int[],
          ${codigos}::text[],
          ${produtos}::text[],
          ${qtds}::numeric[],
          ${inis}::timestamp[],
          ${fims}::timestamp[]
        )
      `;
      console.log(`[upload] ${ops.length} OPs inseridas em batch.`);
    }

    // Auto-cadastrar máquinas novas (uma por uma — são poucas e o ON CONFLICT funciona melhor)
    const recursosArr = [...dadosParsed.recursos];
    if (recursosArr.length) {
      console.log(`[upload] Cadastrando ${recursosArr.length} máquinas...`);
      for (const r of recursosArr) {
        try {
          await sql`
            INSERT INTO maquinas (nome, exibido, grupo, tipo)
            VALUES (${r}, '', '', '')
            ON CONFLICT (nome) DO NOTHING
          `;
        } catch (mqErr) {
          console.warn(`[upload] Erro ao cadastrar máquina "${r}":`, mqErr.message);
        }
      }
      console.log(`[upload] ${recursosArr.length} máquinas verificadas/cadastradas.`);
    }

    return json(200, {
      ok: true,
      id: arquivoId,
      arquivoData,
      datas: datas.length,
      ops: dadosParsed.ops.length,
      recursos: dadosParsed.recursos.size
    });
  } catch (err) {
    console.error('[upload] ERRO:', err);
    console.error('[upload] Stack:', err.stack);
    return error(err.message || 'Erro no upload');
  }
};
