import jsQR from 'jsqr'

export async function detectQRCode(imageData) {
  try {
    const code = jsQR(imageData.data, imageData.width, imageData.height)
    return code ? {
      data: code.data,
      location: code.location
    } : null
  } catch (error) {
    console.error('Erro ao detectar QR code:', error)
    return null
  }
}

export function extractQRCodeFromCanvas(canvas, x, y, width, height) {
  const tempCanvas = document.createElement('canvas')
  const tempCtx = tempCanvas.getContext('2d')
  tempCanvas.width = width
  tempCanvas.height = height
  
  // Configurar alta qualidade no contexto
  tempCtx.imageSmoothingEnabled = true
  tempCtx.imageSmoothingQuality = 'high'
  
  // Extrair QR code mantendo qualidade original
  tempCtx.drawImage(canvas, x, y, width, height, 0, 0, width, height)
  
  const imageData = tempCtx.getImageData(0, 0, width, height)
  return {
    canvas: tempCanvas,
    imageData: imageData
  }
}


