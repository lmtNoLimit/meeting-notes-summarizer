'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
import { format } from 'date-fns'

interface Summary {
  id: string
  title: string
  audioUrl: string
  transcription: string
  summary: {
    key_points: string[]
    action_items: string[]
    main_topics: string[]
  }
  createdAt: string
}

export default function SummariesPage() {
  const [summaries, setSummaries] = useState<Summary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSummary, setSelectedSummary] = useState<Summary | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [lastId, setLastId] = useState<string | null>(null)

  const fetchSummaries = async (lastSummaryId?: string) => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (lastSummaryId) params.append('lastId', lastSummaryId)
      params.append('pageSize', '10')

      const { data } = await axios.get(`/api/summaries?${params.toString()}`)
      
      if (lastSummaryId) {
        setSummaries(prev => [...prev, ...data.summaries])
      } else {
        setSummaries(data.summaries)
      }
      
      setHasMore(data.hasMore)
      if (data.summaries.length > 0) {
        setLastId(data.summaries[data.summaries.length - 1].id)
      }
    } catch (err) {
      setError('Failed to load summaries')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSummaries()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
          Meeting Summaries
        </h1>

        {error && (
          <div className="bg-red-50 dark:bg-red-900 p-4 rounded-md mb-6">
            <p className="text-red-700 dark:text-red-100">{error}</p>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {summaries.map(summary => (
            <div
              key={summary.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer"
              onClick={() => setSelectedSummary(summary)}
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {summary.title}
                  </h2>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {format(new Date(summary.createdAt), 'MMM d, yyyy')}
                  </span>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Main Topics
                    </h3>
                    <ul className="mt-2 list-disc list-inside text-sm text-gray-600 dark:text-gray-400">
                      {summary.summary.main_topics.slice(0, 2).map((topic, i) => (
                        <li key={i}>{topic}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Key Points
                    </h3>
                    <ul className="mt-2 list-disc list-inside text-sm text-gray-600 dark:text-gray-400">
                      {summary.summary.key_points.slice(0, 2).map((point, i) => (
                        <li key={i}>{point}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {loading && (
          <div className="flex justify-center mt-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
          </div>
        )}

        {hasMore && !loading && (
          <div className="flex justify-center mt-8">
            <button
              onClick={() => fetchSummaries(lastId || undefined)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Load More
            </button>
          </div>
        )}

        {/* Modal for full summary */}
        {selectedSummary && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 space-y-6">
                <div className="flex justify-between items-start">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {selectedSummary.title}
                  </h2>
                  <button
                    onClick={() => setSelectedSummary(null)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    <span className="sr-only">Close</span>
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                      Summary
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Main Topics
                        </h4>
                        <ul className="mt-2 list-disc list-inside text-gray-600 dark:text-gray-400">
                          {selectedSummary.summary.main_topics.map((topic, i) => (
                            <li key={i}>{topic}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Key Points
                        </h4>
                        <ul className="mt-2 list-disc list-inside text-gray-600 dark:text-gray-400">
                          {selectedSummary.summary.key_points.map((point, i) => (
                            <li key={i}>{point}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Action Items
                        </h4>
                        <ul className="mt-2 list-disc list-inside text-gray-600 dark:text-gray-400">
                          {selectedSummary.summary.action_items.map((item, i) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                      Full Transcription
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                      {selectedSummary.transcription}
                    </p>
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {format(new Date(selectedSummary.createdAt), 'MMMM d, yyyy h:mm a')}
                    </span>
                    <a
                      href={selectedSummary.audioUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      Listen to Audio
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 