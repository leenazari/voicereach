import { createContext, useContext, useState, useRef, ReactNode } from 'react'

export type UploadResult = {
  filename: string
  name?: string
  email?: string
  success: boolean
  reason?: string
}

export type BulkUploadState = {
  active: boolean
  total: number
  current: number
  currentFile: string
  results: UploadResult[]
  done: boolean
  jobId?: string
  jobTitle?: string
}

type BulkUploadContextType = {
  state: BulkUploadState
  startUpload: (files: File[], token: string, jobId?: string, jobTitle?: string) => void
  dismiss: () => void
}

const defaultState: BulkUploadState = {
  active: false, total: 0, current: 0, currentFile: '', results: [], done: false
}

const BulkUploadContext = createContext<BulkUploadContextType>({
  state: defaultState,
  startUpload: () => {},
  dismiss: () => {}
})

export function BulkUploadProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<BulkUploadState>(defaultState)
  const abortRef = useRef(false)

  async function startUpload(files: File[], token: string, jobId?: string, jobTitle?: string) {
    abortRef.current = false
    setState({ active: true, total: files.length, current: 0, currentFile: '', results: [], done: false, jobId, jobTitle })

    const results: UploadResult[] = []

    for (let i = 0; i < files.length; i++) {
      if (abortRef.current) break
      const file = files[i]
      setState(prev => ({ ...prev, current: i + 1, currentFile: file.name }))

      try {
        const base64 = await new Promise<string>((res, rej) => {
          const r = new FileReader()
          r.onload = () => res((r.result as string).split(',')[1])
          r.onerror = () => rej(new Error('Read failed'))
          r.readAsDataURL(file)
        })

        const response = await fetch('/api/bulk-upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ base64, filename: file.name, jobId })
        })

        const data = await response.json()

        if (data.success) {
          results.push({ filename: file.name, name: data.name, email: data.email, success: true })
        } else {
          results.push({ filename: file.name, success: false, reason: data.reason || 'Unknown error' })
        }
      } catch {
        results.push({ filename: file.name, success: false, reason: 'Processing failed' })
      }

      setState(prev => ({ ...prev, results: [...results] }))
      await new Promise(r => setTimeout(r, 300))
    }

    setState(prev => ({ ...prev, done: true, active: false }))
  }

  function dismiss() {
    setState(defaultState)
  }

  return (
    <BulkUploadContext.Provider value={{ state, startUpload, dismiss }}>
      {children}
    </BulkUploadContext.Provider>
  )
}

export function useBulkUpload() {
  return useContext(BulkUploadContext)
}
