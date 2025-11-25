import React, { useState } from 'react'
import UploadStep from './components/UploadStep'
import QRMappingStep from './components/QRMappingStep'
import ArtEditorStep from './components/ArtEditorStep'
import LayoutConfigStep from './components/LayoutConfigStep'
import ExportStep from './components/ExportStep'
import './App.css'

const STEPS = {
  UPLOAD: 'upload',
  QR_MAPPING: 'qr_mapping',
  ART_EDITOR: 'art_editor',
  LAYOUT_CONFIG: 'layout_config',
  EXPORT: 'export'
}

function App() {
  const [currentStep, setCurrentStep] = useState(STEPS.UPLOAD)
  const [pdfFile, setPdfFile] = useState(null)
  const [pdfPages, setPdfPages] = useState([])
  const [qrGrid, setQrGrid] = useState(null)
  const [extractedQRCodes, setExtractedQRCodes] = useState([])
  const [artImage, setArtImage] = useState(null)
  const [artQRArea, setArtQRArea] = useState(null)
  const [layoutConfig, setLayoutConfig] = useState({ artsPerPage: 1 })

  const handlePDFUploaded = (file, pages) => {
    setPdfFile(file)
    setPdfPages(pages)
    setCurrentStep(STEPS.QR_MAPPING)
  }

  const handleQRGridMapped = (grid, qrcodes) => {
    setQrGrid(grid)
    setExtractedQRCodes(qrcodes)
    setCurrentStep(STEPS.ART_EDITOR)
  }

  const handleArtConfigured = (image, qrArea) => {
    setArtImage(image)
    setArtQRArea(qrArea)
    setCurrentStep(STEPS.LAYOUT_CONFIG)
  }

  const handleLayoutConfigured = (config) => {
    setLayoutConfig(config)
    setCurrentStep(STEPS.EXPORT)
  }

  const reset = () => {
    setCurrentStep(STEPS.UPLOAD)
    setPdfFile(null)
    setPdfPages([])
    setQrGrid(null)
    setExtractedQRCodes([])
    setArtImage(null)
    setArtQRArea(null)
    setLayoutConfig({ artsPerPage: 1 })
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>QR Code Art Fusion</h1>
        <div className="step-indicator">
          <div className={`step ${currentStep === STEPS.UPLOAD ? 'active' : ''}`}>1. Upload PDF</div>
          <div className={`step ${currentStep === STEPS.QR_MAPPING ? 'active' : ''}`}>2. Mapear QR Codes</div>
          <div className={`step ${currentStep === STEPS.ART_EDITOR ? 'active' : ''}`}>3. Configurar Arte</div>
          <div className={`step ${currentStep === STEPS.LAYOUT_CONFIG ? 'active' : ''}`}>4. Layout</div>
          <div className={`step ${currentStep === STEPS.EXPORT ? 'active' : ''}`}>5. Exportar</div>
        </div>
      </header>

      <main className="app-main">
        {currentStep === STEPS.UPLOAD && (
          <UploadStep onComplete={handlePDFUploaded} />
        )}
        {currentStep === STEPS.QR_MAPPING && pdfPages.length > 0 && (
          <QRMappingStep 
            pdfPages={pdfPages} 
            onComplete={handleQRGridMapped}
            onBack={() => setCurrentStep(STEPS.UPLOAD)}
          />
        )}
        {currentStep === STEPS.ART_EDITOR && (
          <ArtEditorStep 
            onComplete={handleArtConfigured}
            onBack={() => setCurrentStep(STEPS.QR_MAPPING)}
          />
        )}
        {currentStep === STEPS.LAYOUT_CONFIG && (
          <LayoutConfigStep 
            artImage={artImage}
            artQRArea={artQRArea}
            extractedQRCodes={extractedQRCodes}
            onComplete={handleLayoutConfigured}
            onBack={() => setCurrentStep(STEPS.ART_EDITOR)}
          />
        )}
        {currentStep === STEPS.EXPORT && (
          <ExportStep 
            pdfPages={pdfPages}
            qrGrid={qrGrid}
            extractedQRCodes={extractedQRCodes}
            artImage={artImage}
            artQRArea={artQRArea}
            layoutConfig={layoutConfig}
            onBack={() => setCurrentStep(STEPS.LAYOUT_CONFIG)}
            onReset={reset}
          />
        )}
      </main>
    </div>
  )
}

export default App


