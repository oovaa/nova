// src/components/DocumentUpload/DocumentUpload.tsx
import { useCallback, useState } from 'react'
import { FilePlus2, CheckCircle2, Loader2 } from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import { toast } from '@/components/ui/use-toast'

interface DocumentUploadProps {
  onDocumentUpload: (file: File) => Promise<void>
}

export const DocumentUpload = ({ onDocumentUpload }: DocumentUploadProps) => {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([])

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return

      const file = acceptedFiles[0]
      setIsUploading(true)

      try {
        await onDocumentUpload(file)
        setUploadedFiles((prev) => [...prev, file.name])
        toast({
          title: 'Document uploaded',
          description: `${file.name} has been successfully added to the knowledge base.`,
          variant: 'default',
        })
      } catch (error) {
        console.error('Error uploading document:', error)
        toast({
          title: 'Upload failed',
          description: 'There was an error processing your document.',
          variant: 'destructive',
        })
      } finally {
        setIsUploading(false)
      }
    },
    [onDocumentUpload]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        ['.docx'],
    },
    maxFiles: 1,
    disabled: isUploading,
  })

  return (
    <div className='space-y-4'>
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-primary bg-primary/10'
            : 'border-border hover:border-primary/50 hover:bg-primary/5'
        } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input {...getInputProps()} />
        <div className='flex flex-col items-center justify-center gap-2'>
          {isUploading ? (
            <Loader2 className='h-8 w-8 animate-spin text-primary' />
          ) : (
            <FilePlus2 className='h-8 w-8 text-primary' />
          )}
          <p className='text-sm text-muted-foreground'>
            {isUploading
              ? 'Processing document...'
              : isDragActive
              ? 'Drop the document here'
              : 'Drag & drop a document here, or click to select'}
          </p>
          <p className='text-xs text-muted-foreground'>
            Supports PDF, TXT, and DOCX files
          </p>
        </div>
      </div>

      {uploadedFiles.length > 0 && (
        <div className='space-y-2'>
          <h3 className='text-sm font-medium'>Uploaded Documents</h3>
          <ul className='space-y-1'>
            {uploadedFiles.map((fileName, index) => (
              <li key={index} className='flex items-center gap-2 text-sm'>
                <CheckCircle2 className='h-4 w-4 text-green-500' />
                <span className='truncate'>{fileName}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
