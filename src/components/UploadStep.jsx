import React, { useState } from 'react'
import { loadPDF } from '../utils/pdfProcessor'
import './UploadStep.css'

function UploadStep({ onComplete }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleFileChange = async (e) => {
    const file = e.target.files[0]
    if (!file || file.type !== 'application/pdf') {
      setError('Por favor, selecione um arquivo PDF válido')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const pages = await loadPDF(file)
      onComplete(file, pages)
    } catch (err) {
      setError(`Erro ao processar PDF: ${err.message}`)
      setLoading(false)
    }
  }

  return (
    <div className="upload-step">
      <div className="upload-container">
        <h2>Upload do PDF com QR Codes</h2>
        <p className="description">
          Faça upload do PDF que contém os QR codes. O sistema irá processar todas as páginas.
        </p>
        
        <div className="upload-area">
          <input
            type="file"
            id="pdf-upload"
            accept=".pdf"
            onChange={handleFileChange}
            disabled={loading}
            style={{ display: 'none' }}
          />
          <label htmlFor="pdf-upload" className="upload-button">
            {loading ? 'Processando...' : 'Selecionar PDF'}
          </label>
        </div>

        {error && <div className="error-message">{error}</div>}
      </div>
    </div>
  )
}

export default UploadStep


