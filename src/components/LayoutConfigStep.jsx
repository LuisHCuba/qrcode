import React, { useState, useMemo } from 'react'
import './LayoutConfigStep.css'

function LayoutConfigStep({ artImage, artQRArea, extractedQRCodes, onComplete, onBack }) {
  const [artsPerPage, setArtsPerPage] = useState(1)
  const [pageSize, setPageSize] = useState('A4')
  const [orientation, setOrientation] = useState('portrait')
  const [margin, setMargin] = useState(20)
  const [spacing, setSpacing] = useState(10)
  const [showPreview, setShowPreview] = useState(false)
  const [previewImage, setPreviewImage] = useState(null)
  const [generatingPreview, setGeneratingPreview] = useState(false)

  // Calcular grid automaticamente baseado no número de artes
  const gridConfig = useMemo(() => {
    const count = parseInt(artsPerPage) || 1
    if (count === 1) return { rows: 1, cols: 1 }
    if (count === 2) return { rows: 1, cols: 2 }
    if (count <= 4) return { rows: 2, cols: 2 }
    if (count <= 6) return { rows: 2, cols: 3 }
    if (count <= 9) return { rows: 3, cols: 3 }
    if (count <= 12) return { rows: 3, cols: 4 }
    if (count <= 16) return { rows: 4, cols: 4 }
    return { rows: Math.ceil(Math.sqrt(count)), cols: Math.ceil(count / Math.ceil(Math.sqrt(count))) }
  }, [artsPerPage])

  const handleContinue = () => {
    const config = {
      artsPerPage: parseInt(artsPerPage) || 1,
      pageSize,
      orientation,
      margin: parseInt(margin) || 20,
      spacing: parseInt(spacing) || 10
    }
    
    if (config.artsPerPage < 1) {
      alert('Por favor, insira pelo menos 1 arte por página')
      return
    }
    
    onComplete(config)
  }

  const pageSizeLabels = {
    A4: 'A4 (210 × 297 mm)',
    A3: 'A3 (297 × 420 mm)',
    Letter: 'Letter (8.5 × 11 pol)',
    Legal: 'Legal (8.5 × 14 pol)'
  }

  const generatePreview = async () => {
    if (!artImage || !artQRArea || !extractedQRCodes || extractedQRCodes.length === 0) {
      alert('Por favor, complete as etapas anteriores (mapear QR codes e configurar arte) antes de visualizar o preview.')
      return
    }

    setGeneratingPreview(true)
    setShowPreview(true)

    try {
      const config = {
        artsPerPage: parseInt(artsPerPage) || 1,
        pageSize,
        orientation,
        margin: parseInt(margin) || 20,
        spacing: parseInt(spacing) || 10
      }

      // Calcular dimensões da página
      const dpi = 300 // Resolução para preview
      const scale = dpi / 72
      const sizes = {
        A4: { width: 595 * scale, height: 842 * scale },
        A3: { width: 842 * scale, height: 1191 * scale },
        Letter: { width: 612 * scale, height: 792 * scale },
        Legal: { width: 612 * scale, height: 1008 * scale }
      }
      const base = sizes[config.pageSize] || sizes.A4
      const pageWidth = config.orientation === 'landscape' ? base.height : base.width
      const pageHeight = config.orientation === 'landscape' ? base.width : base.height

      // Calcular grid
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
      const grid = calculateGrid(config.artsPerPage)
      const cols = grid.cols
      const rows = Math.ceil(Math.min(config.artsPerPage, extractedQRCodes.length) / cols)

      // Criar canvas para preview
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      canvas.width = pageWidth
      canvas.height = pageHeight

      // Fundo branco
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, pageWidth, pageHeight)

      // Calcular dimensões das artes
      const totalSpacingWidth = config.margin * 2 + config.spacing * (cols - 1)
      const totalSpacingHeight = config.margin * 2 + config.spacing * (rows - 1)
      const artWidth = (pageWidth - totalSpacingWidth) / cols
      const artHeight = (pageHeight - totalSpacingHeight) / rows

      // Criar imagens compostas para preview (usar até artsPerPage QR codes)
      const previewCount = Math.min(config.artsPerPage, extractedQRCodes.length)
      
      for (let i = 0; i < previewCount; i++) {
        const qrData = extractedQRCodes[i]
        const qrCanvas = qrData.canvas

        // Criar imagem composta (arte + QR code)
        const compositeCanvas = document.createElement('canvas')
        const compositeCtx = compositeCanvas.getContext('2d')
        const artWidthNative = artImage.naturalWidth || artImage.width
        const artHeightNative = artImage.naturalHeight || artImage.height
        
        compositeCanvas.width = artWidthNative
        compositeCanvas.height = artHeightNative
        
        compositeCtx.imageSmoothingEnabled = false
        compositeCtx.imageSmoothingQuality = 'high'
        
        // Desenhar arte
        compositeCtx.drawImage(artImage, 0, 0, artWidthNative, artHeightNative)
        
        // Calcular escala do QR code
        const displayWidth = artImage.width || artWidthNative
        const displayHeight = artImage.height || artHeightNative
        const scaleX = artWidthNative / displayWidth
        const scaleY = artHeightNative / displayHeight
        
        const qrX = artQRArea.x * scaleX
        const qrY = artQRArea.y * scaleY
        const qrWidth = artQRArea.width * scaleX
        const qrHeight = artQRArea.height * scaleY
        
        // Desenhar QR code
        compositeCtx.imageSmoothingEnabled = false
        compositeCtx.drawImage(qrCanvas, 0, 0, qrCanvas.width, qrCanvas.height, qrX, qrY, qrWidth, qrHeight)

        // Posicionar na página
        const col = i % cols
        const row = Math.floor(i / cols)
        const x = config.margin + col * (artWidth + config.spacing)
        const y = pageHeight - config.margin - (row + 1) * artHeight - row * config.spacing

        // Escalar e desenhar na página
        const scaleToFit = Math.min(artWidth / artWidthNative, artHeight / artHeightNative, 1.0)
        const finalWidth = artWidthNative * scaleToFit
        const finalHeight = artHeightNative * scaleToFit
        const centeredX = x + (artWidth - finalWidth) / 2
        const centeredY = y + (artHeight - finalHeight) / 2

        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(compositeCanvas, centeredX, centeredY, finalWidth, finalHeight)
      }

      // Converter para imagem
      const dataUrl = canvas.toDataURL('image/png', 1.0)
      setPreviewImage(dataUrl)
    } catch (error) {
      console.error('Erro ao gerar preview:', error)
      alert('Erro ao gerar preview: ' + error.message)
    } finally {
      setGeneratingPreview(false)
    }
  }

  return (
    <div className="layout-config-step">
      <div className="layout-header">
        <div className="header-content">
          <h2>Configurar Layout de Exportação</h2>
          <p className="header-subtitle">Configure como as artes serão organizadas no PDF final</p>
        </div>
        <button onClick={onBack} className="btn-secondary">Voltar</button>
      </div>

      <div className="layout-content">
        <div className="config-panel">
          <div className="config-section">
            <h3 className="section-title">
              <span className="section-icon">📐</span>
              Configurações de Página
            </h3>
            
            <div className="config-group">
              <label>
                <span className="label-text">Tamanho da Página</span>
                <select 
                  value={pageSize} 
                  onChange={(e) => setPageSize(e.target.value)}
                  className="config-input"
                >
                  <option value="A4">{pageSizeLabels.A4}</option>
                  <option value="A3">{pageSizeLabels.A3}</option>
                  <option value="Letter">{pageSizeLabels.Letter}</option>
                  <option value="Legal">{pageSizeLabels.Legal}</option>
                </select>
              </label>
            </div>

            <div className="config-group">
              <label>
                <span className="label-text">Orientações</span>
                <div className="orientation-buttons">
                  <button
                    type="button"
                    className={`orientation-btn ${orientation === 'portrait' ? 'active' : ''}`}
                    onClick={() => setOrientation('portrait')}
                  >
                    <span className="orientation-icon">📄</span>
                    <span>Retrato</span>
                  </button>
                  <button
                    type="button"
                    className={`orientation-btn ${orientation === 'landscape' ? 'active' : ''}`}
                    onClick={() => setOrientation('landscape')}
                  >
                    <span className="orientation-icon">📄</span>
                    <span>Paisagem</span>
                  </button>
                </div>
              </label>
            </div>
          </div>

          <div className="config-section">
            <h3 className="section-title">
              <span className="section-icon">🎨</span>
              Configurações de Layout
            </h3>

            <div className="config-group">
              <label>
                <span className="label-text">
                  Artes por Página
                  <span className="badge">{gridConfig.rows} × {gridConfig.cols}</span>
                </span>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={artsPerPage}
                  onChange={(e) => {
                    const val = Math.max(1, Math.min(20, parseInt(e.target.value) || 1))
                    setArtsPerPage(val)
                  }}
                  className="config-input"
                />
                <p className="hint">
                  Quantas artes com QR code você quer em cada página do PDF final
                </p>
              </label>
            </div>

            <div className="config-group">
              <label>
                <span className="label-text">Margem Externa (px)</span>
                <div className="input-with-buttons">
                  <input
                    type="number"
                    min="0"
                    max="200"
                    value={margin}
                    onChange={(e) => setMargin(e.target.value)}
                    className="config-input"
                  />
                  <div className="quick-buttons">
                    <button type="button" onClick={() => setMargin(0)} className="quick-btn">0</button>
                    <button type="button" onClick={() => setMargin(20)} className="quick-btn">20</button>
                    <button type="button" onClick={() => setMargin(50)} className="quick-btn">50</button>
                  </div>
                </div>
                <p className="hint">Espaço entre a borda da página e as artes</p>
              </label>
            </div>

            <div className="config-group">
              <label>
                <span className="label-text">Espaçamento Entre Artes (px)</span>
                <div className="input-with-buttons">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={spacing}
                    onChange={(e) => setSpacing(e.target.value)}
                    className="config-input"
                  />
                  <div className="quick-buttons">
                    <button type="button" onClick={() => setSpacing(0)} className="quick-btn">0</button>
                    <button type="button" onClick={() => setSpacing(10)} className="quick-btn">10</button>
                    <button type="button" onClick={() => setSpacing(20)} className="quick-btn">20</button>
                  </div>
                </div>
                <p className="hint">Espaço entre as artes quando há mais de uma por página</p>
              </label>
            </div>
          </div>

          <div className="config-actions">
            <button 
              onClick={generatePreview} 
              className="btn-preview btn-large"
              disabled={generatingPreview}
            >
              <span>{generatingPreview ? 'Gerando Preview...' : '👁️ Visualizar Preview'}</span>
            </button>
            <button onClick={handleContinue} className="btn-primary btn-large">
              <span>Gerar PDF Final</span>
              <span className="btn-icon">→</span>
            </button>
          </div>
        </div>

        <div className="preview-panel">
          <div className="preview-header">
            <h3>Preview do Layout</h3>
            <div className="preview-info">
              <span className="info-item">
                <strong>{parseInt(artsPerPage) || 1}</strong> arte{parseInt(artsPerPage) !== 1 ? 's' : ''} por página
              </span>
              <span className="info-item">
                Grid: <strong>{gridConfig.rows} × {gridConfig.cols}</strong>
              </span>
            </div>
          </div>
          
          <div className="preview-visualization">
            <div 
              className="preview-page" 
              data-orientation={orientation}
              style={{
                '--margin': `${margin}px`,
                '--spacing': `${spacing}px`,
                '--grid-rows': gridConfig.rows,
                '--grid-cols': gridConfig.cols
              }}
            >
              {Array.from({ length: Math.min(parseInt(artsPerPage) || 1, 16) }).map((_, i) => (
                <div key={i} className="preview-art">
                  <div className="preview-art-number">{i + 1}</div>
                  <div className="preview-art-label">Arte {i + 1}</div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="preview-footer">
            <p className="preview-note">
              <span className="note-icon">ℹ️</span>
              Visualização aproximada. O layout será ajustado automaticamente para otimizar o espaço.
            </p>
          </div>
        </div>
      </div>

      {showPreview && (
        <div className="preview-modal-overlay" onClick={() => setShowPreview(false)}>
          <div className="preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="preview-modal-header">
              <h3>Preview do Resultado Final</h3>
              <button 
                className="preview-modal-close"
                onClick={() => setShowPreview(false)}
              >
                ×
              </button>
            </div>
            <div className="preview-modal-content">
              {generatingPreview ? (
                <div className="preview-loading">
                  <div className="spinner"></div>
                  <p>Gerando preview...</p>
                </div>
              ) : previewImage ? (
                <div className="preview-image-container">
                  <img 
                    src={previewImage} 
                    alt="Preview do layout final"
                    className="preview-image"
                  />
                  <div className="preview-actions">
                    <a 
                      href={previewImage} 
                      download="preview-layout.png"
                      className="btn-download"
                    >
                      📥 Baixar Preview
                    </a>
                  </div>
                </div>
              ) : (
                <p>Erro ao gerar preview</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default LayoutConfigStep


