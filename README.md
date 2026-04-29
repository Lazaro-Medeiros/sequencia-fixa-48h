# Sequência Fixa 48h — Antilhas

Dashboard operacional para acompanhamento da aderência da programação de produção (indicador Sequência Fixa 48h) da Antilhas.

## O que faz

Compara as planilhas de programação de produção em janelas de 48 horas (D-2 / D-1 / D) e calcula a aderência por OP, por recurso, por grupo e por dia. Os dados ficam armazenados localmente no navegador (IndexedDB).

## Funcionalidades

- **Visão Geral**: KPIs (Aderência período, do dia, da semana, Volume mês/dia), gráficos de aderência por mês e por dia
- **Sequência 48h embutida**: visualização das OPs do dia com aderência calculada
- **Resumo Recursos**: tabela com filtros por grupo, status e busca, com expansão para detalhes por recurso
- **Cadastro Máquinas**: edição de Nome exibido / Grupo / Tipo (Flexo / Off-set) com persistência local
- **Upload**: receber planilhas Excel (.xlsx) com parser automático

## Como hospedar

### GitHub Pages (recomendado)

1. Crie um repositório novo no GitHub
2. Faça upload do arquivo `index.html` para a raiz do repositório
3. Vá em **Settings** → **Pages**
4. Em "Source" selecione a branch `main` (ou `master`) e pasta `/ (root)`
5. Salve. Em alguns segundos a URL pública estará disponível em `https://SEU-USUARIO.github.io/NOME-DO-REPO/`

### Netlify Drop (mais rápido, sem precisar de Git)

1. Acesse https://app.netlify.com/drop
2. Arraste o `index.html` para a área indicada
3. Pronto, recebe URL pública em segundos

### Servidor próprio

Coloque o `index.html` em qualquer pasta servida pelo seu webserver (Apache, Nginx, IIS).

## Tecnologias

- **HTML/CSS/JavaScript** puro (sem build, sem framework)
- **Chart.js** (CDN) — gráficos
- **SheetJS** (CDN) — leitura de Excel no navegador
- **IndexedDB** — armazenamento dos arquivos enviados
- **localStorage** — preferências do cadastro de máquinas

## Estrutura

Arquivo único auto-contido. Toda a lógica, CSS e dados estão em `index.html`.
