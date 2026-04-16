"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Navbar from "@/components/Navbar"
import { apiClient, getAuthUser } from "@/lib/api"

interface Member {
  id: number
  userId: number
  username?: string
  displayName?: string
  email?: string
  role?: string
}

export default function OrgMembersPage({ params }: { params: { id: string } }) {
  const orgId = params.id
  const router = useRouter()
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const user = getAuthUser()
    const isOrgAdmin = user && Array.isArray((user as any).organisations) && (user as any).organisations.some((o: any) => String(o.id) === String(orgId) && o.role === 'org_admin')
    if (!user || !isOrgAdmin) {
      setError('Organisation admin access required')
      setLoading(false)
      return
    }

    apiClient.getOrgMembers(orgId)
      .then((res) => {
        const payload = res.data
        const list = payload?.data ?? payload ?? []
        setMembers(Array.isArray(list) ? list : [])
      })
      .catch((err) => setError(err?.response?.data?.message || err.message || 'Failed to load'))
      .finally(() => setLoading(false))
  }, [orgId])

  const handleRemove = async (memberId: number) => {
    if (!confirm('Remove this member from the organisation?')) return
    try {
      await apiClient.removeOrgMember(orgId, memberId)
      setMembers((s) => s.filter((m) => m.id !== memberId))
    } catch (e: any) {
      setError(e?.response?.data?.message || e.message || 'Remove failed')
    }
  }

  return (
    <div>
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-semibold mb-4">Organisation Members</h1>

        {loading ? (
          <p>Loading...</p>
        ) : error ? (
          <div className="text-red-600">{error}</div>
        ) : members.length === 0 ? (
          <p>No members found.</p>
        ) : (
          <div className="space-y-4">
            {members.map((m) => (
              <div key={m.id} className="flex items-center justify-between bg-white p-4 rounded shadow">
                <div>
                  <div className="font-medium">{m.displayName || m.username}</div>
                  <div className="text-sm text-gray-500">{m.email}</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-sm text-gray-600">{m.role}</div>
                  <button
                    onClick={() => handleRemove(m.id)}
                    className="px-3 py-1 bg-red-600 text-white rounded"
                  >
                    Remove
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
