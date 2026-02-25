"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { api } from "@/lib/api"
import type { ProjectDTO } from "@/lib/types/dto"

interface ProjectContextValue {
  projects: ProjectDTO[]
  currentProject: ProjectDTO | null
  currentProjectId: string | null
  setCurrentProjectId: (id: string) => void
  loading: boolean
  reload: () => Promise<void>
}

const ProjectContext = createContext<ProjectContextValue | null>(null)

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<ProjectDTO[]>([])
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    try {
      const data = await api.get<ProjectDTO[]>("/api/projects")
      setProjects(data)
      if (!currentProjectId && data.length > 0) {
        setCurrentProjectId(data[0].id)
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }, [currentProjectId])

  useEffect(() => {
    reload()
  }, [reload])

  const currentProject = projects.find(p => p.id === currentProjectId) ?? null

  return (
    <ProjectContext.Provider value={{
      projects,
      currentProject,
      currentProjectId,
      setCurrentProjectId,
      loading,
      reload,
    }}>
      {children}
    </ProjectContext.Provider>
  )
}

export function useProject() {
  const ctx = useContext(ProjectContext)
  if (!ctx) throw new Error("useProject must be used within ProjectProvider")
  return ctx
}
