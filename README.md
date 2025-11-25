# QR Code Art Fusion

Sistema completo para processar QR codes de PDFs e aplicar arte/template personalizado em cada um.

## Funcionalidades

- ✅ Upload de PDF com múltiplos QR codes
- ✅ Mapeamento visual de QR codes (grid automático ou desenho manual de quadrados)
- ✅ Upload e configuração de arte/template
- ✅ Definição visual da área onde o QR code será inserido
- ✅ Configuração de layout (artes por página, tamanho, orientação)
- ✅ Exportação para PDF final

## Instalação

```bash
npm install
```

## Executar

```bash
npm run dev
```

A aplicação estará disponível em `http://localhost:5173`

## Como Usar

1. **Upload PDF**: Faça upload do PDF que contém os QR codes
2. **Mapear QR Codes**: Na primeira página, configure o grid (linhas/colunas) ou desenhe manualmente quadrados nas áreas dos QR codes. O padrão será replicado para todas as páginas.
3. **Configurar Arte**: Faça upload da arte (PDF ou imagem) e desenhe um quadrado na área onde o QR code será inserido
4. **Layout**: Configure quantas artes por página e outras opções de layout
5. **Exportar**: Gere o PDF final com todas as artes e QR codes combinados

## Tecnologias

- React 18
- Vite
- PDF.js (processamento de PDFs)
- PDF-lib (geração de PDFs)
- jsQR (detecção de QR codes)
- Konva/React-Konva (edição visual)



DEPLOY

# 1. Verificar o status (opcional, para ver o que será commitado)
git status

# 2. Adicionar todos os arquivos modificados
git add .

# 3. Fazer commit com mensagem descritiva
git commit -m "Melhorias de qualidade: alta resolução em todas as etapas (300 DPI, sem compressão)"

# 4. Fazer push para o repositório
git push origin main