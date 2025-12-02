export enum AppStatus {
  PROCESSING = 'processing',
  SUCCESS = 'success',
  ERROR = 'error'
}

export type HistoryItem = {
  id: string
  original: string // data URL
  result: string | null // object URL to resulting PNG
  originalName?: string // original uploaded filename
  resultFilename?: string | null // suggested filename for download (from server)
  status: AppStatus
  timestamp: number
  errorMessage?: string
}

export default AppStatus
