'use client'

import Link from 'next/link'
import RatingStars from './RatingStars'
import OrgTag from './OrgTag'
import { Badge } from './ui/badge'

interface DatasetCardProps {
  id: string
  title: string
  description: string
  rating?: number | string | null
  credibilityScore?: number
  tags?: string[]
  organisation?: { id: string | number; name: string; role?: string }
}

export default function DatasetCard({
  id,
  title,
  description,
  rating = 0,
  credibilityScore,
  tags = [],
  organisation,
}: DatasetCardProps) {
  const normalizedRating = Number.isFinite(Number(rating)) ? Number(rating) : 0

  return (
    <Link href={`/dataset/${id}`}>
      <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow cursor-pointer">
        {organisation && (
          <div className="mb-2">
            <OrgTag name={organisation.name} role={organisation.role} />
          </div>
        )}
        <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">{title}</h3>
        <p className="text-gray-600 text-sm mb-4 line-clamp-3">{description}</p>

        {tags.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {tags.slice(0, 4).map((tag) => (
              <Badge key={tag} variant="secondary" className="bg-blue-50 text-blue-700">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <RatingStars rating={Math.round(normalizedRating)} />
              <span className="text-sm text-gray-600">
                {normalizedRating.toFixed(1)}
              </span>
            </div>
            {credibilityScore !== undefined && (
              <p className="text-xs text-gray-500">
                Credibility: {credibilityScore}%
              </p>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
