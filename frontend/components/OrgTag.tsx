"use client"

import React from "react"

interface OrgTagProps {
  name: string
  role?: string
}

export default function OrgTag({ name, role }: OrgTagProps) {
  return (
    <span className="inline-flex items-center gap-2 px-2 py-1 bg-gray-100 text-sm rounded">
      <strong className="text-sm">{name}</strong>
      {role && (
        <span className="text-xs text-gray-600 px-1 py-0.5 bg-white rounded">{role}</span>
      )}
    </span>
  )
}
