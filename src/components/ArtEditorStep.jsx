import React, { useState, useRef } from 'react'
import { Stage, Layer, Image as KonvaImage, Rect } from 'react-konva'
import { loadPDF } from '../utils/pdfProcessor'
import './ArtEditorStep.css'

function ArtEditorStep({ onComplete, onBack }) {
  const [artFile, setArtFile] = useState(null)
  const [artImage, setArtImage] = useState(null)
  const [qrArea, setQrArea] = useState(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [startPos, setStartPos] = useState(null)
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef(null)
  const stageRef = useRef(null)

  const handleFileChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setLoading(true)
    setArtFile(file)

    try {
      if (file.type === 'application/pdf') {
        // Processar PDF
        const pages = await loadPDF(file)
        if (pages.length === 0) {
          alert('Erro ao processar PDF')
          setLoading(false)
          return
        }
        
        // Usar primeira página do PDF em alta qualidade
        const firstPage = pages[0]
        const img = new window.Image()
        img.onload = () => {
          setArtImage(img)
          setQrArea(null)
          setLoading(false)
        }
        // Usar qualidade máxima (sem compressão)
        img.src = firstPage.canvas.toDataURL('image/png', 1.0)
      } else if (file.type.startsWith('image/')) {
        // Processar imagem
        const reader = new FileReader()
        reader.onload = (event) => {
          const img = new window.Image()
          img.onload = () => {
            setArtImage(img)
            setQrArea(null)
            setLoading(false)
          }
          img.src = event.target.result
        }
        reader.readAsDataURL(file)
      } else {
        alert('Por favor, selecione um arquivo PDF ou imagem válido')
        setLoading(false)
      }
    } catch (error) {
      console.error('Erro ao processar arquivo:', error)
      alert(`Erro ao processar arquivo: ${error.message}`)
      setLoading(false)
    }
  }

  const handleStageMouseDown = (e) => {
    if (!artImage) return
    
    const stage = e.target.getStage()
    const point = stage.getPointerPosition()
    setIsDrawing(true)
    setStartPos(point)
    setQrArea({
      x: point.x,
      y: point.y,
      width: 0,
      height: 0
    })
  }

  const handleStageMouseMove = (e) => {
    if (!isDrawing || !startPos || !artImage) return
    
    const stage = e.target.getStage()
    const point = stage.getPointerPosition()
    const width = point.x - startPos.x
    const height = point.y - startPos.y
    
    // Forçar quadrado: usar a maior dimensão para ambas
    const size = Math.max(Math.abs(width), Math.abs(height))
    const signX = width >= 0 ? 1 : -1
    const signY = height >= 0 ? 1 : -1
    
    setQrArea({
      x: startPos.x,
      y: startPos.y,
      width: size * signX,
      height: size * signY
    })
  }

  const handleStageMouseUp = () => {
    if (isDrawing && qrArea && Math.abs(qrArea.width) > 10 && Math.abs(qrArea.height) > 10) {
      // Garantir que seja um quadrado perfeito
      const size = Math.max(Math.abs(qrArea.width), Math.abs(qrArea.height))
      
      const normalizedArea = {
        x: Math.min(qrArea.x, qrArea.x + qrArea.width),
        y: Math.min(qrArea.y, qrArea.y + qrArea.height),
        width: size,
        height: size
      }
      setQrArea(normalizedArea)
    }
    setIsDrawing(false)
    setStartPos(null)
  }

  const handleContinue = () => {
    if (!artImage || !qrArea) {
      alert('Por favor, carregue uma arte e defina a área onde o QR code será inserido')
      return
    }

    // Normalizar coordenadas relativas à imagem
    const stage = stageRef.current
    const scale = stage ? Math.min(
      stage.width() / artImage.width,
      stage.height() / artImage.height
    ) : 1

    const relativeArea = {
      x: qrArea.x / scale,
      y: qrArea.y / scale,
      width: qrArea.width / scale,
      height: qrArea.height / scale
    }

    onComplete(artImage, relativeArea)
  }

  const stageWidth = 800
  const stageHeight = artImage 
    ? (artImage.height / artImage.width) * stageWidth 
    : 600

  const scale = artImage 
    ? Math.min(stageWidth / artImage.width, stageHeight / artImage.height)
    : 1

  return (
    <div className="art-editor-step">
      <div className="art-editor-header">
        <h2>Configurar Arte/Template</h2>
        <div className="controls">
          <button onClick={onBack} className="btn-secondary">Voltar</button>
        </div>
      </div>

      <div className="art-editor-content">
        <div className="art-config">
          <h3>Upload da Arte</h3>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          <button 
            onClick={() => fileInputRef.current?.click()} 
            className="btn-primary"
            disabled={loading}
          >
            {loading ? 'Processando...' : 'Selecionar Arte (PDF ou Imagem)'}
          </button>

          {artFile && (
            <div className="file-info">
              <p><strong>Arquivo:</strong> {artFile.name}</p>
              <p><strong>Tamanho:</strong> {artImage ? `${artImage.width} × ${artImage.height}px` : 'Carregando...'}</p>
            </div>
          )}

          {qrArea && (
            <div className="area-info">
              <h4>Área do QR Code Definida</h4>
              <p>Posição: ({Math.round(qrArea.x)}, {Math.round(qrArea.y)})</p>
              <p>Tamanho: {Math.round(qrArea.width)} × {Math.round(qrArea.height)}px</p>
              <button 
                onClick={() => setQrArea(null)} 
                className="btn-secondary btn-small"
              >
                Redefinir Área
              </button>
            </div>
          )}

          <div className="instructions">
            <h4>Instruções:</h4>
            <ol>
              <li>Faça upload da arte/template (PDF ou imagem)</li>
              <li>Arraste na imagem para definir a área onde o QR code será inserido</li>
              <li>Clique em "Continuar" quando estiver pronto</li>
            </ol>
          </div>

          <button 
            onClick={handleContinue} 
            className="btn-primary btn-large"
            disabled={!artImage || !qrArea}
          >
            Continuar
          </button>
        </div>

        <div className="art-canvas">
          {artImage ? (
            <>
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
                    <KonvaImage
                      image={artImage}
                      x={0}
                      y={0}
                      width={artImage.width * scale}
                      height={artImage.height * scale}
                    />
                    {qrArea && (
                      <Rect
                        x={qrArea.x}
                        y={qrArea.y}
                        width={qrArea.width}
                        height={qrArea.height}
                        stroke="#3498db"
                        strokeWidth={3}
                        fill="rgba(52, 152, 219, 0.2)"
                        dash={[10, 5]}
                      />
                    )}
                  </Layer>
                </Stage>
              </div>
              <p className="canvas-hint">
                Arraste na imagem para definir a área onde o QR code será inserido
              </p>
            </>
          ) : (
            <div className="empty-canvas">
              <p>Faça upload de uma imagem para começar</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ArtEditorStep

