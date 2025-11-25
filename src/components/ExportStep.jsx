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
    // Usar DPI maior (300 DPI ao invés de 72 DPI padrão) para melhor qualidade
    const dpi = 300
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
      
      // Manter resolução original da arte (sem reduzir)
      canvas.width = artImage.width
      canvas.height = artImage.height
      
      // Configurar alta qualidade no contexto
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      
      // Desenhar arte de fundo em resolução original
      ctx.drawImage(artImage, 0, 0, artImage.width, artImage.height)
      
      // Desenhar QR code na área definida com alta qualidade
      // Usar drawImage com todos os parâmetros para controle preciso
      ctx.drawImage(
        qrCanvas,
        0, 0, qrCanvas.width, qrCanvas.height, // Source: QR code completo
        artQRArea.x, artQRArea.y, artQRArea.width, artQRArea.height // Destination: área na arte
      )
      
      // Converter para blob com qualidade máxima (sem compressão)
      canvas.toBlob((blob) => {
        resolve(blob)
      }, 'image/png', 1.0) // Qualidade máxima: 1.0
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
          
          // Calcular grid para distribuir artes na página
          const cols = Math.ceil(Math.sqrt(artsPerPage))
          const rows = Math.ceil(compositeImages.length / cols)
          const artWidth = (pageWidth - layoutConfig.margin * (cols + 1)) / cols
          const artHeight = (pageHeight - layoutConfig.margin * (rows + 1)) / rows
          
          for (let j = 0; j < compositeImages.length; j++) {
            const col = j % cols
            const row = Math.floor(j / cols)
            
            const x = layoutConfig.margin + col * (artWidth + layoutConfig.margin)
            const y = pageHeight - layoutConfig.margin - (row + 1) * artHeight + layoutConfig.margin
            
            // Embed PNG sem compressão adicional
            const image = await pdfDoc.embedPng(await compositeImages[j].arrayBuffer())
            const imageDims = image.scale(1)
            
            // Calcular escala mantendo proporção, mas tentando usar o máximo de espaço disponível
            const scale = Math.min(artWidth / imageDims.width, artHeight / imageDims.height)
            
            // Usar escala 1:1 se a imagem couber, caso contrário usar o scale calculado
            // Mas garantir que não reduza muito a qualidade
            const finalWidth = imageDims.width * scale
            const finalHeight = imageDims.height * scale
            
            page.drawImage(image, {
              x,
              y,
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
            <strong>Margem:</strong> {layoutConfig.margin}px
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


