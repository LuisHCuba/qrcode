import React, { useState } from 'react'
import './LayoutConfigStep.css'

function LayoutConfigStep({ onComplete, onBack }) {
  const [artsPerPage, setArtsPerPage] = useState(1)
  const [pageSize, setPageSize] = useState('A4')
  const [orientation, setOrientation] = useState('portrait')
  const [margin, setMargin] = useState(20)

  const handleContinue = () => {
    onComplete({
      artsPerPage: parseInt(artsPerPage) || 1,
      pageSize,
      orientation,
      margin: parseInt(margin) || 20
    })
  }

  return (
    <div className="layout-config-step">
      <div className="layout-header">
        <h2>Configurar Layout de Exportação</h2>
        <div className="controls">
          <button onClick={onBack} className="btn-secondary">Voltar</button>
        </div>
      </div>

      <div className="layout-content">
        <div className="config-panel">
          <div className="config-group">
            <label>
              <span>Artes por Página:</span>
              <input
                type="number"
                min="1"
                max="20"
                value={artsPerPage}
                onChange={(e) => setArtsPerPage(e.target.value)}
              />
            </label>
            <p className="hint">Quantas artes com QR code você quer em cada página do PDF final</p>
          </div>

          <div className="config-group">
            <label>
              <span>Tamanho da Página:</span>
              <select value={pageSize} onChange={(e) => setPageSize(e.target.value)}>
                <option value="A4">A4</option>
                <option value="A3">A3</option>
                <option value="Letter">Letter</option>
                <option value="Legal">Legal</option>
              </select>
            </label>
          </div>

          <div className="config-group">
            <label>
              <span>Orientação:</span>
              <select value={orientation} onChange={(e) => setOrientation(e.target.value)}>
                <option value="portrait">Retrato</option>
                <option value="landscape">Paisagem</option>
              </select>
            </label>
          </div>

          <div className="config-group">
            <label>
              <span>Margem (px):</span>
              <input
                type="number"
                min="0"
                max="100"
                value={margin}
                onChange={(e) => setMargin(e.target.value)}
              />
            </label>
            <p className="hint">Margem ao redor de cada arte na página</p>
          </div>

          <button onClick={handleContinue} className="btn-primary btn-large">
            Gerar PDF Final
          </button>
        </div>

        <div className="preview-panel">
          <h3>Preview do Layout</h3>
          <div className="preview-visualization">
            <div className="preview-page" data-orientation={orientation}>
              {Array.from({ length: Math.min(artsPerPage, 4) }).map((_, i) => (
                <div key={i} className="preview-art">
                  <span>Arte {i + 1}</span>
                </div>
              ))}
              {artsPerPage > 4 && (
                <div className="preview-more">+{artsPerPage - 4} mais</div>
              )}
            </div>
          </div>
          <p className="preview-note">
            Visualização aproximada. O layout será ajustado automaticamente.
          </p>
        </div>
      </div>
    </div>
  )
}

export default LayoutConfigStep

