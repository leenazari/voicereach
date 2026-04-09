import type { AppProps } from 'next/app'
import { BulkUploadProvider } from '../context/BulkUploadContext'
import BulkUploadProgress from '../components/BulkUploadProgress'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <BulkUploadProvider>
      <Component {...pageProps} />
      <BulkUploadProgress />
    </BulkUploadProvider>
  )
}
