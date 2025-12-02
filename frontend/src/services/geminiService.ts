const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://remove.zeabur.app'

export async function removeBackground(file: File): Promise<string> {
  const fd = new FormData()
  fd.append('file', file)

  const res = await fetch(`${API_BASE_URL}/remove`, {
    method: 'POST',
    body: fd,
  })

  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`Server error: ${res.status} ${txt}`)
  }

  const blob = await res.blob()
  return URL.createObjectURL(blob)
}

function dataURLToBlob(dataurl: string): Blob {
  const arr = dataurl.split(',')
  const mimeMatch = arr[0].match(/:(.*?);/)
  const mime = mimeMatch ? mimeMatch[1] : 'image/png'
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }
  return new Blob([u8arr], { type: mime })
}

function parseFilenameFromContentDisposition(cd: string | null): string | null {
  if (!cd) return null
  // look for filename*= or filename=
  const fnStar = /filename\*=(?:UTF-8'')?([^;]+)/i.exec(cd)
  if (fnStar && fnStar[1]) {
    try { return decodeURIComponent(fnStar[1].trim()) } catch { return fnStar[1].trim() }
  }
  const fn = /filename="?([^";]+)"?/i.exec(cd)
  if (fn && fn[1]) return fn[1].trim()
  return null
}

export async function editImageBackground(base64Image: string, originalFilename?: string): Promise<{ blob: Blob, filename: string | null }> {
  // base64Image is expected to be a data URL (data:image/..;base64,...)
  const blob = dataURLToBlob(base64Image)
  // Use original filename if provided, otherwise default to 'upload.png'
  const uploadFilename = originalFilename || 'upload.png'
  const file = new File([blob], uploadFilename, { type: blob.type || 'image/png' })

  const fd = new FormData()
  fd.append('file', file)

  const res = await fetch(`${API_BASE_URL}/remove`, {
    method: 'POST',
    body: fd,
  })

  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`Server error: ${res.status} ${txt}`)
  }

  const resultBlob = await res.blob()
  const cd = res.headers.get('Content-Disposition')
  const filename = parseFilenameFromContentDisposition(cd)
  return { blob: resultBlob, filename }
}

