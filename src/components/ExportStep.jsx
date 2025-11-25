import React, { useState } from 'react'
import { PDFDocument, rgb } from 'pdf-lib'
import './ExportStep.css'

function ExportStep({ 
  pdfPages, 
  qrGrid, 
  extractedQRCodes, 
  artImage, 
  artQRArea, 
  layoutConfig,
  onBack,
  onReset 
}) {
  const [exporting, setExporting] = useState(false)
  const [progress, setProgress] = useState(0)

  const getPageDimensions = () => {
    // Usar DPI MÁXIMO (600 DPI) para qualidade profissional absoluta
    const dpi = 600
    const scale = dpi / 72 // Fator de escala para alta resolução
    
    const sizes = {
      A4: { width: 595 * scale, height: 842 * scale },
      A3: { width: 842 * scale, height: 1191 * scale },
      Letter: { width: 612 * scale, height: 792 * scale },
      Legal: { width: 612 * scale, height: 1008 * scale }
    }
    
    const base = sizes[layoutConfig.pageSize] || sizes.A4
    return layoutConfig.orientation === 'landscape' 
      ? { width: base.height, height: base.width }
      : base
  }

  const createCompositeImage = async (qrCanvas) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      
      // IMPORTANTE: Manter resolução NATIVA da arte (não usar artImage.width/height se foram reduzidos)
      // Usar as dimensões reais da imagem carregada
      const artWidth = artImage.naturalWidth || artImage.width
      const artHeight = artImage.naturalHeight || artImage.height
      
      canvas.width = artWidth
      canvas.height = artHeight
      
      // Configurar alta qualidade no contexto
      ctx.imageSmoothingEnabled = false // Desabilitar suavização para manter pixels nítidos
      ctx.imageSmoothingQuality = 'high'
      
      // Desenhar arte de fundo em resolução NATIVA completa
      ctx.drawImage(artImage, 0, 0, artWidth, artHeight)
      
      // Calcular área do QR code em coordenadas da imagem NATIVA
      // Se a imagem foi exibida em tamanho menor, calcular o fator de escala
      const displayWidth = artImage.width || artWidth
      const displayHeight = artImage.height || artHeight
      const scaleX = artWidth / displayWidth
      const scaleY = artHeight / displayHeight
      
      const qrX = artQRArea.x * scaleX
      const qrY = artQRArea.y * scaleY
      const qrWidth = artQRArea.width * scaleX
      const qrHeight = artQRArea.height * scaleY
      
      // IMPORTANTE: Desabilitar suavização ao inserir QR code para manter pixels nítidos
      ctx.imageSmoothingEnabled = false
      
      // Desenhar QR code na área definida mantendo qualidade máxima
      // Usar o tamanho EXATO do QR code extraído, sem reduzir
      ctx.drawImage(
        qrCanvas,
        0, 0, qrCanvas.width, qrCanvas.height, // Source: QR code completo em resolução original
        qrX, qrY, qrWidth, qrHeight // Destination: área na arte em escala nativa
      )
      
      // Reabilitar suavização para a arte de fundo (se necessário)
      ctx.imageSmoothingEnabled = true
      
      // Converter para blob com qualidade máxima (sem compressão)
      // Usar toDataURL primeiro para garantir qualidade máxima
      const dataUrl = canvas.toDataURL('image/png', 1.0)
      
      // Converter dataURL para blob mantendo qualidade
      fetch(dataUrl)
        .then(res => res.blob())
        .then(blob => resolve(blob))
        .catch(() => {
          // Fallback: usar toBlob direto
          canvas.toBlob((blob) => {
            resolve(blob)
          }, 'image/png', 1.0)
        })
    })
  }

  const blobToImage = (blob) => {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.src = URL.createObjectURL(blob)
    })
  }

  const imageToPdfPage = async (pdfDoc, imageBlob, pageWidth, pageHeight) => {
    const image = await pdfDoc.embedPng(await imageBlob.arrayBuffer())
    const imageDims = image.scale(1)
    
    const scale = Math.min(
      (pageWidth - layoutConfig.margin * 2) / imageDims.width,
      (pageHeight - layoutConfig.margin * 2) / imageDims.height
    )
    
    const scaledWidth = imageDims.width * scale
    const scaledHeight = imageDims.height * scale
    
    const x = (pageWidth - scaledWidth) / 2
    const y = (pageHeight - scaledHeight) / 2
    
    const page = pdfDoc.addPage([pageWidth, pageHeight])
    page.drawImage(image, {
      x,
      y,
      width: scaledWidth,
      height: scaledHeight
    })
  }

  const handleExport = async () => {
    if (!artImage || !artQRArea || extractedQRCodes.length === 0) {
      alert('Dados incompletos para exportação')
      return
    }

    setExporting(true)
    setProgress(0)

    try {
      const pdfDoc = await PDFDocument.create()
      const { width: pageWidth, height: pageHeight } = getPageDimensions()
      
      const totalQRCodes = extractedQRCodes.length
      const artsPerPage = layoutConfig.artsPerPage || 1
      let currentPageArts = 0
      let compositeImages = []

      // Processar cada QR code
      for (let i = 0; i < totalQRCodes; i++) {
        const qrData = extractedQRCodes[i]
        const qrCanvas = qrData.canvas
        
        // Criar imagem composta (arte + QR code)
        const compositeBlob = await createCompositeImage(qrCanvas)
        compositeImages.push(compositeBlob)
        
        setProgress(Math.round(((i + 1) / totalQRCodes) * 90))
        
        // Quando atingir o número de artes por página, criar página do PDF
        if (compositeImages.length >= artsPerPage || i === totalQRCodes - 1) {
          const page = pdfDoc.addPage([pageWidth, pageHeight])
          
          // Calcular grid para distribuir artes na página (mesmo algoritmo do LayoutConfigStep)
          const calculateGrid = (count) => {
            if (count === 1) return { rows: 1, cols: 1 }
            if (count === 2) return { rows: 1, cols: 2 }
            if (count <= 4) return { rows: 2, cols: 2 }
            if (count <= 6) return { rows: 2, cols: 3 }
            if (count <= 9) return { rows: 3, cols: 3 }
            if (count <= 12) return { rows: 3, cols: 4 }
            if (count <= 16) return { rows: 4, cols: 4 }
            return { rows: Math.ceil(Math.sqrt(count)), cols: Math.ceil(count / Math.ceil(Math.sqrt(count))) }
          }
          const grid = calculateGrid(artsPerPage)
          const cols = grid.cols
          const rows = Math.ceil(compositeImages.length / cols)
          const spacing = layoutConfig.spacing || 10
          const margin = layoutConfig.margin || 20
          
          // Calcular dimensões das artes considerando margem externa e espaçamento interno
          const totalSpacingWidth = margin * 2 + spacing * (cols - 1)
          const totalSpacingHeight = margin * 2 + spacing * (rows - 1)
          const artWidth = (pageWidth - totalSpacingWidth) / cols
          const artHeight = (pageHeight - totalSpacingHeight) / rows
          
          for (let j = 0; j < compositeImages.length; j++) {
            const col = j % cols
            const row = Math.floor(j / cols)
            
            const x = margin + col * (artWidth + spacing)
            const y = pageHeight - margin - (row + 1) * artHeight - row * spacing
            
            // Embed PNG sem compressão adicional
            const image = await pdfDoc.embedPng(await compositeImages[j].arrayBuffer())
            const imageDims = image.scale(1)
            
            // NÃO REDUZIR A IMAGEM - usar escala 1:1 sempre para manter qualidade máxima
            // Se a imagem for maior que o espaço, ela será cortada, mas mantém qualidade
            // Se for menor, será centralizada sem aumentar (evita pixelização)
            const scale = Math.min(
              artWidth / imageDims.width, 
              artHeight / imageDims.height,
              1.0 // NUNCA aumentar além do tamanho original
            )
            
            const finalWidth = imageDims.width * scale
            const finalHeight = imageDims.height * scale
            
            // Centralizar se a imagem for menor que o espaço disponível
            const centeredX = x + (artWidth - finalWidth) / 2
            const centeredY = y + (artHeight - finalHeight) / 2
            
            page.drawImage(image, {
              x: centeredX,
              y: centeredY,
              width: finalWidth,
              height: finalHeight
            })
          }
          
          compositeImages = []
          currentPageArts = 0
        }
      }

      setProgress(95)

      // Salvar PDF
      const pdfBytes = await pdfDoc.save()
      const blob = new Blob([pdfBytes], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      
      const link = document.createElement('a')
      link.href = url
      link.download = `qrcodes-com-artes-${new Date().getTime()}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      setProgress(100)
      alert('PDF exportado com sucesso!')
      
    } catch (error) {
      console.error('Erro ao exportar:', error)
      alert(`Erro ao exportar PDF: ${error.message}`)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="export-step">
      <div className="export-header">
        <h2>Exportar PDF Final</h2>
        <div className="controls">
          <button onClick={onBack} className="btn-secondary">Voltar</button>
          <button onClick={onReset} className="btn-secondary">Novo Processo</button>
        </div>
      </div>

      <div className="export-content">
        <div className="export-summary">
          <h3>Resumo da Configuração</h3>
          <div className="summary-item">
            <strong>QR Codes Extraídos:</strong> {extractedQRCodes.length}
          </div>
          <div className="summary-item">
            <strong>Artes por Página:</strong> {layoutConfig.artsPerPage}
          </div>
          <div className="summary-item">
            <strong>Tamanho da Página:</strong> {layoutConfig.pageSize} ({layoutConfig.orientation})
          </div>
          <div className="summary-item">
            <strong>Margem Externa:</strong> {layoutConfig.margin || 20}px<br />
            <strong>Espaçamento Entre Artes:</strong> {layoutConfig.spacing || 10}px
          </div>
          <div className="summary-item">
            <strong>Páginas Estimadas:</strong> {Math.ceil(extractedQRCodes.length / layoutConfig.artsPerPage)}
          </div>

          <div className="export-actions">
            <button 
              onClick={handleExport} 
              className="btn-primary btn-large"
              disabled={exporting}
            >
              {exporting ? 'Exportando...' : 'Exportar PDF'}
            </button>

            {exporting && (
              <div className="progress-container">
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <span className="progress-text">{progress}%</span>
              </div>
            )}
          </div>
        </div>

        <div className="export-preview">
          <h3>Preview</h3>
          {artImage && (
            <div className="preview-art-container">
              <img 
                src={artImage.src} 
                alt="Preview Arte" 
                className="preview-art-image"
              />
              {artQRArea && (
                <div 
                  className="preview-qr-area"
                  style={{
                    left: `${(artQRArea.x / artImage.width) * 100}%`,
                    top: `${(artQRArea.y / artImage.height) * 100}%`,
                    width: `${(artQRArea.width / artImage.width) * 100}%`,
                    height: `${(artQRArea.height / artImage.height) * 100}%`
                  }}
                >
                  <span>QR Code</span>
                </div>
              )}
            </div>
          )}
          <p className="preview-note">
            Esta é uma visualização aproximada. O QR code será inserido na área marcada.
          </p>
        </div>
      </div>
    </div>
  )
}

export default ExportStep


