// Gera o cardápio de produtos em PDF (A4).
// Só usa nome, categoria, preço de venda e foto — o custo nunca entra aqui.
import { groupBySection, splitLanguage } from './catalog.js'
import { formatBRL } from './format.js'

const CONTACT = {
  whatsapp: '(31) 98462-2230',
  instagram: '@yellowducktcg',
}

const NAVY = [10, 14, 26]
const GOLD = [245, 197, 24]
const GRAY_TEXT = [107, 114, 128]
const GRAY_LINE = [229, 231, 235]
const GRAY_FILL = [243, 244, 246]

const PAGE_W = 210
const PAGE_H = 297
const MARGIN = 12
const COLS = 4
const GAP = 4
const CARD_W = (PAGE_W - MARGIN * 2 - GAP * (COLS - 1)) / COLS
const CARD_H = 58
const IMG_H = 33
const PAGE_BOTTOM = PAGE_H - 12
const FIRST_PAGE_TOP = 36
const NEXT_PAGE_TOP = 15
const SECTION_H = 10
const LIST_ROW_H = 7

// Fontes padrão do PDF só têm Latin-1: troca pontuação comum e descarta o que não existe.
function pdfSafe(text) {
  return String(text ?? '')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    .replace(/ /g, ' ')
    .replace(/[^\x20-\x7E¡-ÿ]/g, '')
}

function priceText(value) {
  return pdfSafe(formatBRL(value))
}

function sortedItems(items) {
  return [...items].sort((a, b) => {
    const byName = splitLanguage(a.name).rest.localeCompare(splitLanguage(b.name).rest, 'pt-BR', {
      numeric: true,
    })
    if (byName !== 0) return byName
    return a.name.localeCompare(b.name, 'pt-BR')
  })
}

function fitLines(doc, text, width, maxLines) {
  const lines = doc.splitTextToSize(pdfSafe(text), width)
  if (lines.length <= maxLines) return lines
  const kept = lines.slice(0, maxLines)
  let last = kept[maxLines - 1]
  while (last.length > 1 && doc.getTextWidth(last + '...') > width) last = last.slice(0, -1)
  kept[maxLines - 1] = last.trimEnd() + '...'
  return kept
}

async function mapLimit(items, limit, fn, onDone) {
  const results = new Array(items.length)
  let next = 0
  let done = 0
  async function worker() {
    while (next < items.length) {
      const index = next++
      results[index] = await fn(items[index])
      onDone?.(++done, items.length)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

/**
 * @param {object} options
 * @param {Array<{name: string, category?: string, sale_price: number, photo_url?: string}>} options.products
 * @param {boolean} [options.includePhotos]
 * @param {(url: string) => Promise<string|null>} [options.loadImage] devolve um data URL JPEG, ou null se falhar
 * @param {(done: number, total: number) => void} [options.onProgress] progresso do carregamento das fotos
 * @param {Date} [options.date]
 */
export async function buildMenuPdf({
  products,
  includePhotos = true,
  loadImage,
  onProgress,
  date = new Date(),
}) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const dateText = date.toLocaleDateString('pt-BR')
  const groups = groupBySection(products).map((g) => ({ ...g, items: sortedItems(g.items) }))

  const photos = new Map()
  if (includePhotos && loadImage) {
    const urls = [...new Set(products.map((p) => p.photo_url).filter(Boolean))]
    const loaded = await mapLimit(urls, 6, (url) => loadImage(url).catch(() => null), onProgress)
    urls.forEach((url, i) => photos.set(url, loaded[i]))
  }

  let y = 0

  function drawHeader(first) {
    doc.setFillColor(...NAVY)
    if (first) {
      doc.rect(0, 0, PAGE_W, 30, 'F')
      doc.setFillColor(...GOLD)
      doc.rect(0, 30, PAGE_W, 1.2, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(22)
      doc.setTextColor(...GOLD)
      doc.text('YELLOW DUCK TCG', MARGIN, 14)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(11)
      doc.setTextColor(255, 255, 255)
      doc.text('Cardápio de produtos', MARGIN, 22)
      doc.setFontSize(9)
      doc.setTextColor(209, 213, 219)
      doc.text(`Atualizado em ${dateText}`, PAGE_W - MARGIN, 22, { align: 'right' })
    } else {
      doc.rect(0, 0, PAGE_W, 9, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8.5)
      doc.setTextColor(...GOLD)
      doc.text('YELLOW DUCK TCG', MARGIN, 6)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(209, 213, 219)
      doc.text(`Cardápio - ${dateText}`, PAGE_W - MARGIN, 6, { align: 'right' })
    }
  }

  function newPage() {
    doc.addPage()
    drawHeader(false)
    y = NEXT_PAGE_TOP
  }

  function drawSectionTitle(group, continued) {
    doc.setFillColor(...GOLD)
    doc.rect(MARGIN, y, 1.6, 6, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(...NAVY)
    const title = pdfSafe(group.title + (continued ? ' (cont.)' : ''))
    doc.text(title, MARGIN + 4, y + 4.8)
    if (!continued) {
      const titleWidth = doc.getTextWidth(title)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
      doc.setTextColor(...GRAY_TEXT)
      doc.text(`${group.items.length} ${group.items.length === 1 ? 'item' : 'itens'}`, MARGIN + 6 + titleWidth, y + 4.8)
    }
    doc.setDrawColor(...GRAY_LINE)
    doc.setLineWidth(0.3)
    doc.line(MARGIN, y + 7.5, PAGE_W - MARGIN, y + 7.5)
    y += SECTION_H
  }

  function drawCard(item, x, top) {
    doc.setDrawColor(...GRAY_LINE)
    doc.setLineWidth(0.3)
    doc.roundedRect(x, top, CARD_W, CARD_H, 2, 2, 'S')

    const imgX = x + 2
    const imgY = top + 2
    const imgW = CARD_W - 4
    doc.setFillColor(...GRAY_FILL)
    doc.roundedRect(imgX, imgY, imgW, IMG_H, 1.5, 1.5, 'F')

    const data = includePhotos ? photos.get(item.photo_url) : null
    if (data) {
      const props = doc.getImageProperties(data)
      const scale = Math.min((imgW - 2) / props.width, (IMG_H - 2) / props.height)
      const w = props.width * scale
      const h = props.height * scale
      doc.addImage(data, 'JPEG', imgX + (imgW - w) / 2, imgY + (IMG_H - h) / 2, w, h, undefined, 'FAST')
    }

    const { language } = splitLanguage(item.name)
    if (language) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(6.5)
      const badgeW = doc.getTextWidth(language.label) + 3
      doc.setFillColor(...GOLD)
      doc.roundedRect(imgX + 1, imgY + 1, badgeW, 4, 1, 1, 'F')
      doc.setTextColor(...NAVY)
      doc.text(language.label, imgX + 2.5, imgY + 3.9)
    }

    let textY = imgY + IMG_H + 4
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.8)
    doc.setTextColor(...GRAY_TEXT)
    const category = fitLines(doc, item.category || '', CARD_W - 4, 1)[0] || ''
    doc.text(category, x + 2, textY)

    textY += 3.6
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.6)
    doc.setTextColor(...NAVY)
    const nameLines = fitLines(doc, splitLanguage(item.name).rest, CARD_W - 4, 3)
    nameLines.forEach((line, i) => doc.text(line, x + 2, textY + i * 3.1))

    doc.setFontSize(11)
    doc.text(priceText(item.sale_price), x + 2, top + CARD_H - 3)
  }

  function drawListRow(item, index) {
    if (index % 2 === 0) {
      doc.setFillColor(...GRAY_FILL)
      doc.rect(MARGIN, y, PAGE_W - MARGIN * 2, LIST_ROW_H, 'F')
    }
    const { language, rest } = splitLanguage(item.name)
    const textY = y + 4.7
    let nameX = MARGIN + 2
    if (language) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(6.5)
      const badgeW = doc.getTextWidth(language.label) + 3
      doc.setFillColor(...GOLD)
      doc.roundedRect(nameX, y + 1.6, badgeW, 4, 1, 1, 'F')
      doc.setTextColor(...NAVY)
      doc.text(language.label, nameX + 1.5, textY - 0.1)
      nameX += badgeW + 2
    }
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...NAVY)
    doc.text(fitLines(doc, rest, 112 - (nameX - MARGIN), 1)[0] || '', nameX, textY)
    doc.setFontSize(7.5)
    doc.setTextColor(...GRAY_TEXT)
    doc.text(fitLines(doc, item.category || '', 36, 1)[0] || '', 128, textY)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    doc.setTextColor(...NAVY)
    doc.text(priceText(item.sale_price), PAGE_W - MARGIN - 2, textY, { align: 'right' })
    y += LIST_ROW_H
  }

  drawHeader(true)
  y = FIRST_PAGE_TOP

  for (const group of groups) {
    const firstBlock = includePhotos ? CARD_H : LIST_ROW_H * 2
    if (y + SECTION_H + firstBlock > PAGE_BOTTOM) newPage()
    drawSectionTitle(group, false)

    if (includePhotos) {
      for (let i = 0; i < group.items.length; i += COLS) {
        if (y + CARD_H > PAGE_BOTTOM) {
          newPage()
          drawSectionTitle(group, true)
        }
        group.items.slice(i, i + COLS).forEach((item, col) => drawCard(item, MARGIN + col * (CARD_W + GAP), y))
        y += CARD_H + GAP
      }
    } else {
      group.items.forEach((item, i) => {
        if (y + LIST_ROW_H > PAGE_BOTTOM) {
          newPage()
          drawSectionTitle(group, true)
        }
        drawListRow(item, i)
      })
    }
    y += 4
  }

  const pages = doc.getNumberOfPages()
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page)
    doc.setDrawColor(...GRAY_LINE)
    doc.setLineWidth(0.3)
    doc.line(MARGIN, PAGE_H - 10, PAGE_W - MARGIN, PAGE_H - 10)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...GRAY_TEXT)
    doc.text(
      `WhatsApp ${CONTACT.whatsapp}  |  Instagram ${CONTACT.instagram}  |  Preços e disponibilidade sujeitos a alteração`,
      MARGIN,
      PAGE_H - 6
    )
    doc.text(`Página ${page} de ${pages}`, PAGE_W - MARGIN, PAGE_H - 6, { align: 'right' })
  }

  return { doc, pages, count: products.length }
}
