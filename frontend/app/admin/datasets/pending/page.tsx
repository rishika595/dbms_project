"use client"

import { useEffect, useState } from "react"
import Navbar from "@/components/Navbar"
import DatasetCard from "@/components/DatasetCard"
import { apiClient, getAuthUser } from "@/lib/api"

interface Dataset {
  id: string | number
  title: string
  description?: string
  publication_status?: string
  rating?: number
  credibilityScore?: number
  tags?: string[]
}

export default function AdminPendingPage() {
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<'pending' | 'all'>('pending')

  useEffect(() => {
    const user = getAuthUser()
    if (!user || (user as any).role !== "admin") {
      setError("Admin access required")
      setLoading(false)
      return
    }
  }, [])

  useEffect(() => {
    // refetch when view changes
    const user = getAuthUser()
    if (!user || (user as any).role !== 'admin') {
      setError('Admin access required')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    const fetcher = view === 'pending' ? apiClient.getAdminPendingDatasets : apiClient.getDatasets
    fetcher()
      .then((res) => {
        const payload = res.data
        const list = payload?.data ?? payload ?? []
        setDatasets(Array.isArray(list) ? list : [])
      })
      .catch((err) => setError(err?.response?.data?.message || err.message || 'Failed to load'))
      .finally(() => setLoading(false))
  }, [view])

  const handleDelete = async (id: string | number) => {
    try {
      await apiClient.deleteDataset(id)
      setDatasets((s) => s.filter((d) => String(d.id) !== String(id)))
    } catch (e: any) {
      setError(e?.response?.data?.message || e.message || "Delete failed")
    }
  }

  const handleReview = async (id: string | number, action: 'approve' | 'reject' | 'flag') => {
    try {
      await apiClient.reviewDataset(id, { action })
      setDatasets((s) => s.filter((d) => String(d.id) !== String(id)))
    } catch (e: any) {
      setError(e?.response?.data?.message || e.message || "Action failed")
    }
  }

  return (
    <div>
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-semibold mb-4">Admin — Datasets</h1>

        <div className="mb-4 flex items-center gap-2">
          <button
            onClick={() => setView('pending')}
            className={`px-3 py-1 rounded ${view === 'pending' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
          >
            Pending / Flagged
          </button>
          <button
            onClick={() => setView('all')}
            className={`px-3 py-1 rounded ${view === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
          >
            All Datasets
          </button>
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : error ? (
          <div className="text-red-600">{error}</div>
        ) : datasets.length === 0 ? (
          <p>{view === 'pending' ? 'No pending or flagged datasets found.' : 'No datasets found.'}</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {datasets.map((ds) => (
              <div key={String(ds.id)} className="flex flex-col">
                <DatasetCard
                  id={String(ds.id)}
                  title={ds.title}
                  description={ds.description || ""}
                  rating={ds.rating}
                  credibilityScore={ds.credibilityScore}
                  tags={ds.tags}
                  organisation={(ds as any).organisation}
                />

                {ds.tags && ds.tags.length > 0 && (
                  <p className="mt-2 text-sm text-gray-600">
                    Tags: {ds.tags.join(", ")}
                  </p>
                )}

                <div className="mt-2 flex gap-2">
                  {view === 'pending' && (
                    <>
                      <button
                        onClick={() => handleReview(ds.id, 'approve')}
                        className="px-3 py-1 bg-green-600 text-white rounded"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReview(ds.id, 'reject')}
                        className="px-3 py-1 bg-yellow-600 text-white rounded"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleReview(ds.id, 'flag')}
                        className="px-3 py-1 bg-orange-600 text-white rounded"
                      >
                        Flag
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => handleDelete(ds.id)}
                    className="px-3 py-1 bg-red-600 text-white rounded"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
