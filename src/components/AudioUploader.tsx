'use client'

import { useState, useRef } from 'react'
import axios from 'axios'

type UploadStatus = 'idle' | 'uploading' | 'transcribing' | 'summarizing' | 'success' | 'error'

interface Summary {
  key_points: string[];
  action_items: string[];
  main_topics: string[];
}

interface UploadResponse {
  success: boolean;
  url?: string;
  transcription?: string;
  summary?: Summary;
  error?: string;
  progress?: {
    status: 'transcribing' | 'summarizing';
    chunk?: number;
    totalChunks?: number;
  };
}

export default function AudioUploader() {
  const [status, setStatus] = useState<UploadStatus>('idle')
  const [progress, setProgress] = useState(0)
  const [processingProgress, setProcessingProgress] = useState<{
    chunk: number;
    total: number;
  } | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [fileUrl, setFileUrl] = useState<string | null>(null)
  const [transcription, setTranscription] = useState<string | null>(null)
  const [summary, setSummary] = useState<Summary | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const allowedTypes = [
    'audio/mpeg',  // .mp3
    'audio/wav',   // .wav
    'audio/x-m4a', // .m4a
    'audio/mp4'    // alternative MIME type for .m4a
  ]

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!allowedTypes.includes(file.type)) {
      setStatus('error')
      setErrorMessage('Please upload an MP3, WAV, or M4A file')
      return
    }

    // Show warning for large files
    if (file.size > 25 * 1024 * 1024) {
      setStatus('uploading')
      setProgress(0)
      console.log('Large file detected, processing may take longer...')
    }

    try {
      setStatus('uploading')
      setProgress(0)

      const formData = new FormData()
      formData.append('audio', file)

      const { data } = await axios.post<UploadResponse>('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            )
            setProgress(percentCompleted)
          }
        },
      })

      if (data.progress) {
        if (data.progress.status === 'transcribing') {
          setStatus('transcribing')
          if (data.progress.chunk && data.progress.totalChunks) {
            setProcessingProgress({
              chunk: data.progress.chunk,
              total: data.progress.totalChunks
            })
          }
        } else if (data.progress.status === 'summarizing') {
          setStatus('summarizing')
        }
      }

      if (data.url) {
        setFileUrl(data.url)
        setTranscription(data.transcription || null)
        setSummary(data.summary || null)
        setStatus('success')
        setProcessingProgress(null)
      } else {
        throw new Error('No URL returned')
      }
    } catch (error) {
      setStatus('error')
      if (axios.isAxiosError(error) && error.response?.data?.error) {
        setErrorMessage(error.response.data.error)
      } else {
        setErrorMessage('Failed to upload file. Please try again.')
      }
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && fileInputRef.current) {
      const dataTransfer = new DataTransfer()
      dataTransfer.items.add(file)
      fileInputRef.current.files = dataTransfer.files
      handleFileChange({ target: { files: dataTransfer.files } } as React.ChangeEvent<HTMLInputElement>)
    }
  }

  return (
    <div className="max-w-xl mx-auto p-6">
      <div
        className={`border-2 border-dashed rounded-lg p-8 ${
          status === 'error' ? 'border-red-500' : 'border-gray-300'
        }`}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="space-y-4">
          <label className="block text-center">
            <span className="text-gray-700 dark:text-gray-200">
              Drop your audio file here, or
            </span>
            <input
              type="file"
              className="hidden"
              accept=".mp3,.wav,.m4a"
              onChange={handleFileChange}
              ref={fileInputRef}
            />
            <span className="ml-1 text-blue-500 hover:text-blue-600 cursor-pointer">
              browse
            </span>
          </label>

          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
            Supported formats: MP3, WAV, M4A
          </p>

          {status === 'uploading' && (
            <div className="space-y-2">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-sm text-center text-gray-600 dark:text-gray-400">
                Uploading... {progress}%
              </p>
            </div>
          )}

          {status === 'transcribing' && (
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Transcribing audio
                  {processingProgress && ` (Chunk ${processingProgress.chunk}/${processingProgress.total})`}
                </p>
              </div>
              {processingProgress && (
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${(processingProgress.chunk / processingProgress.total) * 100}%` }}
                  />
                </div>
              )}
            </div>
          )}

          {status === 'summarizing' && (
            <div className="flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" />
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Generating summary...
              </p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center space-y-4">
              <p className="text-green-500">File uploaded successfully!</p>
              {fileUrl && (
                <a 
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline text-sm block"
                >
                  View uploaded file
                </a>
              )}
              {summary && (
                <div className="mt-6 text-left">
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 space-y-4">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Meeting Summary</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
                          Key Points
                        </h4>
                        <ul className="list-disc pl-5 space-y-1">
                          {summary.key_points.map((point, index) => (
                            <li key={index} className="text-gray-600 dark:text-gray-300">
                              {point}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
                          Action Items
                        </h4>
                        <ul className="list-disc pl-5 space-y-1">
                          {summary.action_items.map((item, index) => (
                            <li key={index} className="text-gray-600 dark:text-gray-300">
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
                          Main Topics
                        </h4>
                        <ul className="list-disc pl-5 space-y-1">
                          {summary.main_topics.map((topic, index) => (
                            <li key={index} className="text-gray-600 dark:text-gray-300">
                              {topic}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {transcription && (
                <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <h3 className="text-lg font-semibold mb-2">Full Transcription:</h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300 text-left whitespace-pre-wrap">
                    {transcription}
                  </p>
                </div>
              )}
            </div>
          )}

          {status === 'error' && (
            <p className="text-center text-red-500">{errorMessage}</p>
          )}
        </div>
      </div>
    </div>
  )
} 