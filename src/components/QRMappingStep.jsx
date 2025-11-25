import React, { useState, useRef, useEffect } from 'react'
import { Stage, Layer, Rect, Line } from 'react-konva'
import { extractQRCodeFromCanvas, detectQRCode } from '../utils/qrDetector'
import './QRMappingStep.css'

function QRMappingStep({ pdfPages, onComplete, onBack }) {
  const [currentPageIndex, setCurrentPageIndex] = useState(0)
  const [grid, setGrid] = useState({ rows: 3, cols: 2 })
  const [gridSpacing, setGridSpacing] = useState({ horizontal: 250, vertical: 250 })
  const [gridPadding, setGridPadding] = useState({ top: 250, right: 250, bottom: 250, left: 250 })
  const [qrAreas, setQrAreas] = useState([])
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentRect, setCurrentRect] = useState(null)
  const stageRef = useRef(null)
  const canvasRef = useRef(null)

  const currentPage = pdfPages[currentPageIndex]
  const canvas = currentPage?.canvas

  useEffect(() => {
    if (canvas) {
      canvasRef.current = canvas
      // Gerar grid automaticamente quando o canvas carregar com os valores padrão
      if (qrAreas.length === 0) {
        generateGridAreas(grid, gridSpacing, gridPadding)
      }
    }
  }, [canvas])

  const handleGridChange = (type, value) => {
    const newGrid = { ...grid, [type]: parseInt(value) || 1 }
    setGrid(newGrid)
    generateGridAreas(newGrid, gridSpacing, gridPadding)
  }

  const handleSpacingChange = (type, value) => {
    const newSpacing = { ...gridSpacing, [type]: parseFloat(value) || 0 }
    setGridSpacing(newSpacing)
    generateGridAreas(grid, newSpacing, gridPadding)
  }

  const handlePaddingChange = (type, value) => {
    const newPadding = { ...gridPadding, [type]: parseFloat(value) || 0 }
    setGridPadding(newPadding)
    generateGridAreas(grid, gridSpacing, newPadding)
  }

  const generateGridAreas = (gridConfig, spacing = gridSpacing, padding = gridPadding) => {
    if (!canvas) return
    
    const width = canvas.width
    const height = canvas.height
    
    // Calcular área disponível após padding
    const availableWidth = width - padding.left - padding.right
    const availableHeight = height - padding.top - padding.bottom
    
    // Calcular espaçamento total necessário
    const totalHorizontalSpacing = spacing.horizontal * (gridConfig.cols - 1)
    const totalVerticalSpacing = spacing.vertical * (gridConfig.rows - 1)
    
    // Calcular tamanho de cada célula considerando espaçamentos
    const cellWidth = (availableWidth - totalHorizontalSpacing) / gridConfig.cols
    const cellHeight = (availableHeight - totalVerticalSpacing) / gridConfig.rows
    
    const areas = []
    for (let row = 0; row < gridConfig.rows; row++) {
      for (let col = 0; col < gridConfig.cols; col++) {
        const x = padding.left + col * (cellWidth + spacing.horizontal)
        const y = padding.top + row * (cellHeight + spacing.vertical)
        
        areas.push({
          x: x,
          y: y,
          width: cellWidth,
          height: cellHeight,
          row,
          col
        })
      }
    }
    setQrAreas(areas)
  }

  const handleStageMouseDown = (e) => {
    // Prevenir que o clique seja capturado por retângulos já criados
    // Se o target for um retângulo de área mapeada, não iniciar novo desenho
    const targetName = e.target.name && e.target.name()
    if (targetName === 'qr-area') {
      return
    }
    
    const stage = e.target.getStage()
    const point = stage.getPointerPosition()
    
    // Converter coordenadas do stage para coordenadas do canvas original
    const scale = stageWidth / canvas.width
    const canvasX = point.x / scale
    const canvasY = point.y / scale
    
    setIsDrawing(true)
    setCurrentRect({
      x: canvasX,
      y: canvasY,
      width: 0,
      height: 0
    })
  }

  const handleStageMouseMove = (e) => {
    if (!isDrawing || !currentRect) return
    
    const stage = e.target.getStage()
    const point = stage.getPointerPosition()
    
    // Converter coordenadas do stage para coordenadas do canvas original
    const scale = stageWidth / canvas.width
    const canvasX = point.x / scale
    const canvasY = point.y / scale
    
    const width = canvasX - currentRect.x
    const height = canvasY - currentRect.y
    
    // Forçar quadrado: usar a maior dimensão para ambas
    const size = Math.max(Math.abs(width), Math.abs(height))
    const signX = width >= 0 ? 1 : -1
    const signY = height >= 0 ? 1 : -1
    
    setCurrentRect({
      ...currentRect,
      width: size * signX,
      height: size * signY
    })
  }

  const handleStageMouseUp = () => {
    if (isDrawing && currentRect && Math.abs(currentRect.width) > 10 && Math.abs(currentRect.height) > 10) {
      // Garantir que seja um quadrado perfeito
      const size = Math.max(Math.abs(currentRect.width), Math.abs(currentRect.height))
      
      const normalizedRect = {
        x: Math.min(currentRect.x, currentRect.x + currentRect.width),
        y: Math.min(currentRect.y, currentRect.y + currentRect.height),
        width: size,
        height: size
      }
      setQrAreas([...qrAreas, normalizedRect])
    }
    setIsDrawing(false)
    setCurrentRect(null)
  }

  const removeArea = (index) => {
    setQrAreas(qrAreas.filter((_, i) => i !== index))
  }

  const extractAllQRCodes = async () => {
    if (!canvas || qrAreas.length === 0) {
      alert('Configure pelo menos uma área de QR code')
      return
    }

    const allQRCodes = []
    
    for (let pageIndex = 0; pageIndex < pdfPages.length; pageIndex++) {
      const page = pdfPages[pageIndex]
      const pageCanvas = page.canvas
      
      for (let areaIndex = 0; areaIndex < qrAreas.length; areaIndex++) {
        const area = qrAreas[areaIndex]
        
        // Calcular escala
        const scaleX = pageCanvas.width / canvas.width
        const scaleY = pageCanvas.height / canvas.height
        
        const scaledArea = {
          x: area.x * scaleX,
          y: area.y * scaleY,
          width: area.width * scaleX,
          height: area.height * scaleY
        }
        
        const qrData = extractQRCodeFromCanvas(
          pageCanvas,
          scaledArea.x,
          scaledArea.y,
          scaledArea.width,
          scaledArea.height
        )
        
        const detected = await detectQRCode(qrData.imageData)
        
        allQRCodes.push({
          page: pageIndex + 1,
          areaIndex: areaIndex,
          x: scaledArea.x,
          y: scaledArea.y,
          width: scaledArea.width,
          height: scaledArea.height,
          canvas: qrData.canvas,
          data: detected?.data || null
        })
      }
    }

    onComplete({
      grid,
      areas: qrAreas,
      scale: {
        x: pdfPages[0].canvas.width / canvas.width,
        y: pdfPages[0].canvas.height / canvas.height
      }
    }, allQRCodes)
  }

  if (!canvas) return <div>Carregando...</div>

  const stageWidth = Math.min(canvas.width, 800)
  const stageHeight = (canvas.height / canvas.width) * stageWidth
  const scale = stageWidth / canvas.width

  return (
    <div className="qr-mapping-step">
      <div className="mapping-header">
        <h2>Mapear QR Codes - Página {currentPageIndex + 1} de {pdfPages.length}</h2>
        <div className="controls">
          <button onClick={onBack} className="btn-secondary">Voltar</button>
          {currentPageIndex > 0 && (
            <button onClick={() => setCurrentPageIndex(currentPageIndex - 1)} className="btn-secondary">
              Página Anterior
            </button>
          )}
          {currentPageIndex < pdfPages.length - 1 && (
            <button onClick={() => setCurrentPageIndex(currentPageIndex + 1)} className="btn-secondary">
              Próxima Página
            </button>
          )}
        </div>
      </div>

      <div className="mapping-content">
        <div className="mapping-config">
          <h3>Configuração de Grid</h3>
          <div className="grid-inputs">
            <label>
              Linhas:
              <input
                type="number"
                min="1"
                max="10"
                value={grid.rows}
                onChange={(e) => handleGridChange('rows', e.target.value)}
              />
            </label>
            <label>
              Colunas:
              <input
                type="number"
                min="1"
                max="10"
                value={grid.cols}
                onChange={(e) => handleGridChange('cols', e.target.value)}
              />
            </label>
            <button onClick={() => generateGridAreas(grid, gridSpacing, gridPadding)} className="btn-primary">
              Gerar Grid
            </button>
          </div>

          <div className="grid-spacing-config">
            <h4>Espaçamento Entre Quadros</h4>
            <div className="spacing-inputs">
              <label>
                Horizontal (px):
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={gridSpacing.horizontal}
                  onChange={(e) => handleSpacingChange('horizontal', e.target.value)}
                />
              </label>
              <label>
                Vertical (px):
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={gridSpacing.vertical}
                  onChange={(e) => handleSpacingChange('vertical', e.target.value)}
                />
              </label>
            </div>
          </div>

          <div className="grid-padding-config">
            <h4>Padding (Margens)</h4>
            <div className="padding-inputs">
              <label>
                Topo (px):
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={gridPadding.top}
                  onChange={(e) => handlePaddingChange('top', e.target.value)}
                />
              </label>
              <label>
                Direita (px):
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={gridPadding.right}
                  onChange={(e) => handlePaddingChange('right', e.target.value)}
                />
              </label>
              <label>
                Inferior (px):
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={gridPadding.bottom}
                  onChange={(e) => handlePaddingChange('bottom', e.target.value)}
                />
              </label>
              <label>
                Esquerda (px):
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={gridPadding.left}
                  onChange={(e) => handlePaddingChange('left', e.target.value)}
                />
              </label>
            </div>
          </div>

          <div className="areas-list">
            <h4>Áreas Mapeadas ({qrAreas.length})</h4>
            <div className="areas-grid">
              {qrAreas.map((area, index) => (
                <div key={index} className="area-item">
                  <span>Área {index + 1}</span>
                  <button onClick={() => removeArea(index)} className="btn-remove">×</button>
                </div>
              ))}
            </div>
          </div>

          <button 
            onClick={extractAllQRCodes} 
            className="btn-primary btn-large"
            disabled={qrAreas.length === 0}
          >
            Extrair QR Codes de Todas as Páginas
          </button>
        </div>

        <div className="mapping-canvas">
          <div className="canvas-wrapper">
            <Stage
              width={stageWidth}
              height={stageHeight}
              onMouseDown={handleStageMouseDown}
              onMouseMove={handleStageMouseMove}
              onMouseUp={handleStageMouseUp}
              ref={stageRef}
            >
              <Layer>
                <Rect
                  name="background"
                  x={0}
                  y={0}
                  width={stageWidth}
                  height={stageHeight}
                  fillPatternImage={canvas}
                  fillPatternScaleX={scale}
                  fillPatternScaleY={scale}
                  listening={false}
                />
                {qrAreas.map((area, index) => (
                  <Rect
                    key={index}
                    name="qr-area"
                    x={area.x * scale}
                    y={area.y * scale}
                    width={area.width * scale}
                    height={area.height * scale}
                    stroke="#3498db"
                    strokeWidth={2}
                    fill="rgba(52, 152, 219, 0.1)"
                    draggable
                    onDragEnd={(e) => {
                      const newAreas = [...qrAreas]
                      newAreas[index] = {
                        ...area,
                        x: e.target.x() / scale,
                        y: e.target.y() / scale
                      }
                      setQrAreas(newAreas)
                    }}
                  />
                ))}
                {currentRect && (
                  <Rect
                    x={currentRect.x * scale}
                    y={currentRect.y * scale}
                    width={currentRect.width * scale}
                    height={currentRect.height * scale}
                    stroke="#e74c3c"
                    strokeWidth={2}
                    fill="rgba(231, 76, 60, 0.1)"
                    listening={false}
                  />
                )}
              </Layer>
            </Stage>
          </div>
          <p className="canvas-hint">
            Arraste para criar áreas de QR code ou use o grid automático
          </p>
        </div>
      </div>
    </div>
  )
}

export default QRMappingStep

