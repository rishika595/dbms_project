import axios from 'axios'

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'https://dbms-project-u67u.onrender.com'

const api = axios.create({
  baseURL: API_BASE_URL,
})

export interface RegisterPayload {
  username: string
  email: string
  password: string
  displayName: string
}

export interface LoginPayload {
  email: string
  password: string
}

export interface FeedbackPayload {
  rating: number
  comment: string
}

export interface Tag {
  id: number
  name: string
}

export interface AIResponsePayload {
  success: boolean
  status?: string
  summary?: string
  metadata?: Record<string, unknown>
  error?: string
  message?: string
}

const AUTH_TOKEN_KEY = 'token'
const AUTH_USER_KEY = 'user'

export const getAuthToken = () => {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(AUTH_TOKEN_KEY)
}

export const setAuthToken = (token: string) => {
  if (typeof window === 'undefined') return
  localStorage.setItem(AUTH_TOKEN_KEY, token)
}

export const setAuthUser = (user: Record<string, unknown>) => {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user))
  } catch (e) {
    // ignore
  }
}

export const getAuthUser = (): Record<string, unknown> | null => {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch (e) {
    return null
  }
}

export const clearAuthUser = () => {
  if (typeof window === 'undefined') return
  localStorage.removeItem(AUTH_USER_KEY)
}

export const clearAuthToken = () => {
  if (typeof window === 'undefined') return
  localStorage.removeItem(AUTH_TOKEN_KEY)
}

export const isAuthenticated = () => Boolean(getAuthToken())

// Add token to requests
api.interceptors.request.use((config) => {
  const isAuthRoute = config.url?.includes('/auth/login') || config.url?.includes('/auth/register')

  if (isAuthRoute) {
    delete config.headers.Authorization
    return config
  }

  const token = getAuthToken()
  if (token) {
      config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

export const apiClient = {
  health: () => api.get('/health'),
  register: (payload: RegisterPayload) => api.post('/auth/register', payload),
  login: (payload: LoginPayload) => api.post('/auth/login', payload),

  getDatasets: (tag?: string) =>
    api.get('/datasets', {
      params: tag ? { tag } : undefined,
    }),
  getDatasetById: (datasetId: string | number) => api.get(`/datasets/${datasetId}`),
  getDatasetFeedback: (datasetId: string | number) => api.get(`/datasets/${datasetId}/feedback`),
  postDatasetFeedback: (datasetId: string | number, payload: FeedbackPayload) =>
    api.post(`/datasets/${datasetId}/feedback`, payload),
  getTags: () => api.get('/tags'),
  createTag: (name: string) => api.post('/tags', { name }),
  attachDatasetTags: (datasetId: string | number, tags: string[]) =>
    api.post(`/datasets/${datasetId}/tags`, { tags }),

  uploadDataset: (formData: FormData) =>
    api.post('/datasets/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),

  downloadVersion: (versionId: string | number) =>
    api.get(`/versions/${versionId}/download`, { responseType: 'blob' }),

  suggestMetadata: (datasetId: string | number) =>
    api.post('/ai/suggest-metadata', {
      datasetId: String(datasetId),
    }),

  // Admin endpoints
  getAdminPendingDatasets: () => api.get('/admin/datasets/pending'),
  deleteDataset: (datasetId: string | number) => api.delete(`/datasets/${datasetId}`),
  reviewDataset: (
    datasetId: string | number,
    payload: { action: 'approve' | 'reject' | 'flag'; notes?: string }
  ) => api.post(`/admin/datasets/${datasetId}/review`, payload),
  // Organisation endpoints
  createOrg: (payload: { name: string; slug?: string }) => api.post('/orgs', payload),
  getOrgMembers: (orgId: string | number) => api.get(`/orgs/${orgId}/members`),
  addOrgMember: (orgId: string | number, payload: { userId: number; role?: 'member' | 'org_admin' }) =>
    api.post(`/orgs/${orgId}/members`, payload),
  removeOrgMember: (orgId: string | number, memberId: string | number) =>
    api.delete(`/orgs/${orgId}/members/${memberId}`),
}

export default api
