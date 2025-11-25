import jsQR from 'jsqr'

/**
 * Detecta TODOS os QR codes automaticamente em uma imagem/canvas
 * Varredura agressiva e sistemática para encontrar múltiplos QR codes
 */
export async function autoDetectQRCodes(canvas, options = {}, onProgress) {
  const {
    minSize = 50,
    maxSize = 500
  } = options

  const detectedAreas = []
  const width = canvas.width
  const height = canvas.height
  const ctx = canvas.getContext('2d')
  
  // Calcular total de regiões para progresso
  const gridSize = 150 // Tamanho fixo para varredura
  const step = Math.floor(gridSize * 0.7) // 30% de overlap
  const cols = Math.ceil((width - gridSize) / step) + 1
  const rows = Math.ceil((height - gridSize) / step) + 1
  const totalRegions = cols * rows + 2 // +2 para tentativas na imagem completa
  
  let processedRegions = 0

  // Fase 1: Tentar detectar múltiplos QR codes na imagem completa
  // jsQR pode detectar apenas um por vez, então vamos tentar várias vezes
  if (onProgress) onProgress({ current: 0, total: totalRegions, message: 'Analisando imagem completa...' })
  
  const fullImageData = ctx.getImageData(0, 0, width, height)
  
  // Tentar jsQR na imagem completa - pode encontrar o primeiro QR code
  try {
    const fullDetection = jsQR(fullImageData.data, width, height)
    if (fullDetection && fullDetection.location) {
      const bounds = getBoundsFromLocation(fullDetection.location)
      if (isValidArea(bounds, width, height, minSize)) {
        detectedAreas.push({
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height,
          confidence: 1.0,
          method: 'jsQR-full'
        })
      }
    }
  } catch (e) {
    console.log('jsQR full image:', e)
  }

  processedRegions++
  if (onProgress) onProgress({ 
    current: processedRegions, 
    total: totalRegions, 
    message: `Encontrados ${detectedAreas.length} QR code(s). Varrendo imagem...` 
  })

  // Fase 2: Varredura sistemática em grid - OBRIGATÓRIA para encontrar TODOS
  // Usar tamanho fixo e overlap significativo para não perder nenhum QR code
  // Usar múltiplas escalas e overlaps diferentes para máxima cobertura
  const gridSizes = [100, 120, 150, 180, 200] // Múltiplas escalas para diferentes tamanhos de QR
  
  for (const currentGridSize of gridSizes) {
    if (currentGridSize > Math.min(width, height)) continue
    
    // Overlap mais agressivo para grids menores (para pegar QR codes pequenos)
    const overlapRatio = currentGridSize <= 120 ? 0.5 : 0.6 // 50% overlap para pequenos, 40% para grandes
    const currentStep = Math.floor(currentGridSize * (1 - overlapRatio))
    
    for (let y = 0; y <= height - currentGridSize; y += currentStep) {
      for (let x = 0; x <= width - currentGridSize; x += currentStep) {
        processedRegions++
        
        if (onProgress && processedRegions % 5 === 0) {
          onProgress({ 
            current: processedRegions, 
            total: totalRegions, 
            message: `Varrendo... Encontrados ${detectedAreas.length} QR code(s)` 
          })
        }

        try {
          // Extrair região
          const regionImageData = ctx.getImageData(x, y, currentGridSize, currentGridSize)
          
          // Tentar detectar QR code nesta região
          const detection = jsQR(regionImageData.data, currentGridSize, currentGridSize)
          
          if (detection && detection.location) {
            const bounds = getBoundsFromLocation(detection.location, x, y)
            
            if (isValidArea(bounds, width, height, minSize)) {
              // Verificar se é realmente um novo QR code (não duplicado)
              const isDuplicate = detectedAreas.some(area => {
                const centerX1 = area.x + area.width / 2
                const centerY1 = area.y + area.height / 2
                const centerX2 = bounds.x + bounds.width / 2
                const centerY2 = bounds.y + bounds.height / 2
                
                const distance = Math.sqrt(
                  Math.pow(centerX1 - centerX2, 2) + Math.pow(centerY1 - centerY2, 2)
                )
                
                // Se os centros estão muito próximos, é duplicata
                const threshold = Math.min(area.width, area.height, bounds.width, bounds.height) * 0.5
                return distance < threshold
              })
              
              if (!isDuplicate) {
                detectedAreas.push({
                  x: bounds.x,
                  y: bounds.y,
                  width: bounds.width,
                  height: bounds.height,
                  confidence: 0.9,
                  method: `jsQR-grid-${currentGridSize}`
                })
                
                console.log(`QR code detectado: ${detectedAreas.length} - Posição: (${Math.round(bounds.x)}, ${Math.round(bounds.y)}) Tamanho: ${Math.round(bounds.width)}x${Math.round(bounds.height)}`)
                
                // Atualizar progresso quando encontrar novo QR code
                if (onProgress) {
                  onProgress({ 
                    current: processedRegions, 
                    total: totalRegions, 
                    message: `✅ QR code #${detectedAreas.length} encontrado! Continuando busca...` 
                  })
                }
              }
            }
          }
        } catch (error) {
          // Continuar mesmo se houver erro
          continue
        }

        // Pequeno delay para não travar a UI
        if (processedRegions % 20 === 0) {
          await new Promise(resolve => setTimeout(resolve, 5))
        }
      }
    }
  }

  // Fase 3: Refinar áreas detectadas - remover apenas duplicatas reais
  console.log(`Total de QR codes detectados antes da remoção de duplicatas: ${detectedAreas.length}`)
  const refinedAreas = removeTrueDuplicates(detectedAreas)
  console.log(`Total de QR codes únicos após remoção de duplicatas: ${refinedAreas.length}`)
  
  if (onProgress) {
    onProgress({ 
      current: totalRegions, 
      total: totalRegions, 
      message: `✅ Finalizado! ${refinedAreas.length} QR code(s) único(s) encontrado(s)` 
    })
  }

  return refinedAreas
}

/**
 * Remove apenas duplicatas reais (áreas que realmente se sobrepõem significativamente)
 */
function removeTrueDuplicates(areas) {
  if (areas.length <= 1) return areas

  const unique = []
  const used = new Set()

  for (let i = 0; i < areas.length; i++) {
    if (used.has(i)) continue

    const area1 = areas[i]
    let isDuplicate = false

    // Verificar se esta área se sobrepõe significativamente com alguma já adicionada
    for (const existingArea of unique) {
      const overlap = calculateOverlap(area1, existingArea)
      const minArea = Math.min(
        area1.width * area1.height,
        existingArea.width * existingArea.height
      )
      const overlapRatio = overlap / minArea

      // Se mais de 60% de sobreposição, considerar duplicata
      if (overlapRatio > 0.6) {
        isDuplicate = true
        // Manter a área com maior confiança
        if (area1.confidence > existingArea.confidence) {
          const index = unique.indexOf(existingArea)
          unique[index] = area1
        }
        break
      }
    }

    if (!isDuplicate) {
      unique.push(area1)
    }
    used.add(i)
  }

  return unique
}

/**
 * Calcula área de sobreposição entre duas áreas
 */
function calculateOverlap(area1, area2) {
  const xOverlap = Math.max(0, 
    Math.min(area1.x + area1.width, area2.x + area2.width) - 
    Math.max(area1.x, area2.x)
  )
  const yOverlap = Math.max(0,
    Math.min(area1.y + area1.height, area2.y + area2.height) - 
    Math.max(area1.y, area2.y)
  )
  return xOverlap * yOverlap
}

/**
 * Valida se uma área é válida
 */
function isValidArea(area, canvasWidth, canvasHeight, minSize) {
  return area.width >= minSize && 
         area.height >= minSize &&
         area.width <= canvasWidth * 0.95 &&
         area.height <= canvasHeight * 0.95 &&
         area.x >= -10 && // Permitir pequeno offset
         area.y >= -10 &&
         area.x + area.width <= canvasWidth + 10 &&
         area.y + area.height <= canvasHeight + 10
}

/**
 * Converte localização do jsQR em bounds
 */
function getBoundsFromLocation(location, offsetX = 0, offsetY = 0) {
  if (!location || !location.topLeftCorner) {
    return { x: offsetX, y: offsetY, width: 100, height: 100 }
  }

  const topLeft = location.topLeftCorner
  const topRight = location.topRightCorner || location.topLeftCorner
  const bottomLeft = location.bottomLeftCorner || location.topLeftCorner
  const bottomRight = location.bottomRightCorner || location.topLeftCorner

  const minX = Math.min(topLeft.x, topRight.x, bottomLeft.x, bottomRight.x)
  const maxX = Math.max(topLeft.x, topRight.x, bottomLeft.x, bottomRight.x)
  const minY = Math.min(topLeft.y, topRight.y, bottomLeft.y, bottomRight.y)
  const maxY = Math.max(topLeft.y, topRight.y, bottomLeft.y, bottomRight.y)

  // Adicionar padding de 20% ao redor para garantir que capture o QR code completo
  const paddingX = (maxX - minX) * 0.2
  const paddingY = (maxY - minY) * 0.2

  return {
    x: Math.max(0, minX + offsetX - paddingX),
    y: Math.max(0, minY + offsetY - paddingY),
    width: (maxX - minX) + paddingX * 2,
    height: (maxY - minY) + paddingY * 2
  }
}
