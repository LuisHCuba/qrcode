import * as pdfjsLib from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

export async function loadPDF(file) {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  
  const pages = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    // Aumentar escala para melhor qualidade (3.0 ao invés de 2.0)
    const viewport = page.getViewport({ scale: 3.0 })
    
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    canvas.height = viewport.height
    canvas.width = viewport.width
    
    // Configurar alta qualidade no contexto
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    
    await page.render({
      canvasContext: context,
      viewport: viewport
    }).promise
    
    pages.push({
      pageNumber: i,
      canvas: canvas,
      viewport: viewport
    })
  }
  
  return pages
}


