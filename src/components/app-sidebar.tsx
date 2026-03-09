"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { useProject } from "@/lib/project-context"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { posthog } from "@/lib/posthog"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { Favicon } from "@/components/favicon"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { useConfirm } from "@/components/confirm-dialog"
import type { ReplayDTO, PaginationDTO } from "@/lib/types/dto"
import {
  LayoutDashboard,
  Sparkles,
  Users,
  BarChart3,
  Settings,
  Pencil,
  LogOut,
  ChevronsUpDown,
  Plus,
  Check,
  Globe,
  CreditCard,
  Plug,
  MessageSquarePlus,
  MoreHorizontal,
  Trash2,
  Loader2,
  PlayCircle,
  ArrowLeft,
  ChevronDown,
  Clock,
  MousePointerClick,
  Monitor,
  Smartphone,
  Tablet,
} from "lucide-react"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"

interface Conversation {
  id: string
  title: string | null
  createdAt: string
  updatedAt: string
}

const AVATAR_STYLES = [
  "adventurer", "adventurer-neutral", "avataaars", "big-ears", "big-smile",
  "lorelei", "notionists", "open-peeps", "personas", "thumbs",
] as const

function hashSeed(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

function visitorAvatarUrl(v: { visitorEmail?: string | null; visitorId: string }, size = 80): string {
  const seed = v.visitorEmail || v.visitorId
  const style = AVATAR_STYLES[hashSeed(seed) % AVATAR_STYLES.length]
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}&size=${size}&radius=50&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} sec`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m < 60) return `${m} min${s ? ` ${s}s` : ""}`
  const h = Math.floor(m / 60)
  return `${h}h ${m % 60}m`
}

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (seconds < 60) return "just now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

const NAV_GROUPS = [
  {
    label: null,
    items: [
      { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Insights",
    items: [
      { key: "analytics", label: "Analytics", icon: BarChart3 },
      { key: "visitors", label: "Visitors", icon: Globe },
      { key: "recordings", label: "Recordings", icon: PlayCircle },
      { key: "editor", label: "Editor", icon: Pencil },
    ],
  },
  
]

const createSchema = z.object({
  name: z.string().min(1, "Name is required"),
  siteUrl: z.string().url("Must be a valid URL"),
})
type CreateFormData = z.infer<typeof createSchema>

interface AppSidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function AppSidebar({ collapsed, onToggle }: AppSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()
  const { projects, currentProject, currentProjectId, setCurrentProjectId, reload } = useProject()

  const searchParams = useSearchParams()
  const [createOpen, setCreateOpen] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [activeSection, setActiveSection] = useState("dashboard")
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loadingConversations, setLoadingConversations] = useState(false)
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [deletingConversationId, setDeletingConversationId] = useState<string | null>(null)
  const [renamingConversationId, setRenamingConversationId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const [savingRename, setSavingRename] = useState(false)
  const [visibleChatCount, setVisibleChatCount] = useState(15)
  const [projectSwitcherOpen, setProjectSwitcherOpen] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const confirm = useConfirm()
  const chatScrollRef = useRef<HTMLDivElement>(null)

  const [recordingsBrowserOpen, setRecordingsBrowserOpen] = useState(false)
  const [recordings, setRecordings] = useState<ReplayDTO[]>([])
  const [recordingsLoading, setRecordingsLoading] = useState(false)
  const [recordingsTotal, setRecordingsTotal] = useState(0)
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)

  useEffect(() => {
    if (!renamingConversationId) return
    const viewport = chatScrollRef.current?.querySelector("[data-slot='scroll-area-viewport']") as HTMLElement | null
    if (!viewport) return
    const lockedTop = viewport.scrollTop
    const lock = () => { viewport.scrollTop = lockedTop }
    viewport.addEventListener("scroll", lock)
    return () => viewport.removeEventListener("scroll", lock)
  }, [renamingConversationId])

  useEffect(() => {
    if (pathname === "/dashboard/settings") {
      setActiveSection("settings")
    } else if (pathname === "/dashboard/billing") {
      setActiveSection("billing")
    } else if (pathname.includes("/editor")) {
      setActiveSection("editor")
    } else {
      const section = searchParams.get("section") || "dashboard"
      setActiveSection(section)
      if (section === "chat") {
        setActiveConversationId(searchParams.get("conversationId") || null)
        setRecordingsBrowserOpen(false)
        setSelectedSessionId(null)
      } else {
        setActiveConversationId(null)
      }
      if (section === "recordings") {
        setRecordingsBrowserOpen(true)
        setSelectedSessionId(searchParams.get("sessionId") || null)
      } else if (section !== "recordings") {
        setRecordingsBrowserOpen(false)
      }
    }
  }, [pathname, searchParams])

  const loadConversations = useCallback(async () => {
    if (!currentProjectId) return
    setLoadingConversations(true)
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("segmentor_token") : null
      const res = await fetch(`${API_URL}/api/projects/${currentProjectId}/segi/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setConversations(data.conversations || [])
      }
    } catch { /* ignore */ } finally {
      setLoadingConversations(false)
    }
  }, [currentProjectId])

  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  useEffect(() => {
    const handler = () => loadConversations()
    window.addEventListener("segi-conversations-updated", handler)
    return () => window.removeEventListener("segi-conversations-updated", handler)
  }, [loadConversations])

  const loadRecordings = useCallback(async () => {
    if (!currentProjectId) return
    setRecordingsLoading(true)
    try {
      const res = await api.get<{ replays: ReplayDTO[]; pagination: PaginationDTO }>(
        `/api/projects/${currentProjectId}/replays?limit=50&sortBy=startedAt&sortOrder=desc`
      )
      setRecordings(res.replays)
      setRecordingsTotal(res.pagination.total)
    } catch { /* ignore */ } finally {
      setRecordingsLoading(false)
    }
  }, [currentProjectId])

  useEffect(() => {
    if (recordingsBrowserOpen) loadRecordings()
  }, [recordingsBrowserOpen, loadRecordings])

  const form = useForm<CreateFormData>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: "", siteUrl: "" },
  })

  const email = user?.email ?? ""
  const userName = user?.name || email.split("@")[0]
  const initials = (user?.name || email.split("@")[0]).slice(0, 2).toUpperCase()

  function handleLogout() {
    logout()
    router.push("/auth/signin")
  }

  function navigateToSection(section: string) {
    if (section === "billing") {
      router.push("/dashboard/billing")
      setActiveSection("billing")
      return
    }
    if (!currentProjectId) return
    if (section === "editor") {
      router.push(`/dashboard/projects/${currentProjectId}/editor`)
      setActiveSection("editor")
      return
    }
    if (section === "recordings") {
      setRecordingsBrowserOpen(true)
      setActiveSection("recordings")
      setSelectedSessionId(null)
      router.push(`/dashboard/projects/${currentProjectId}?section=recordings`)
      return
    }
    setActiveSection(section)
    setActiveConversationId(null)
    setRecordingsBrowserOpen(false)
    router.push(`/dashboard/projects/${currentProjectId}?section=${section}`)
  }

  function selectRecording(sessionId: string) {
    if (!currentProjectId) return
    setSelectedSessionId(sessionId)
    router.push(`/dashboard/projects/${currentProjectId}?section=recordings&sessionId=${sessionId}`)
  }

  function closeRecordingsBrowser() {
    setRecordingsBrowserOpen(false)
    setSelectedSessionId(null)
    navigateToSection("dashboard")
  }

  function navigateToChat(conversationId?: string) {
    if (!currentProjectId) return
    setActiveSection("chat")
    setActiveConversationId(conversationId || null)

    if (!conversationId) {
      const isAlreadyNewChat = activeSection === "chat" && !activeConversationId
      if (isAlreadyNewChat) {
        window.dispatchEvent(new CustomEvent("segi-new-chat"))
        return
      }
    }

    const url = conversationId
      ? `/dashboard/projects/${currentProjectId}?section=chat&conversationId=${conversationId}`
      : `/dashboard/projects/${currentProjectId}?section=chat`
    router.push(url)
  }

  function startRenaming(convId: string) {
    const conv = conversations.find(c => c.id === convId)
    setRenamingConversationId(convId)
    setRenameValue(conv?.title || "")
  }

  async function commitRename(convId: string) {
    const trimmed = renameValue.trim()
    if (!trimmed) {
      setRenamingConversationId(null)
      return
    }
    setSavingRename(true)
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("segmentor_token") : null
      const res = await fetch(`${API_URL}/api/projects/${currentProjectId}/segi/conversations/${convId}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed }),
      })
      if (res.ok) {
        setConversations(prev => prev.map(c => c.id === convId ? { ...c, title: trimmed } : c))
        window.dispatchEvent(new CustomEvent("segi-title-updated", { detail: trimmed }))
      }
    } catch {
      toast.error("Failed to rename")
    } finally {
      setSavingRename(false)
      setRenamingConversationId(null)
    }
  }

  async function deleteConversation(convId: string) {
    const ok = await confirm({
      title: "Delete conversation",
      description: "This conversation will be permanently deleted. This cannot be undone.",
      confirmLabel: "Delete",
      destructive: true,
    })
    if (!ok) return
    setDeletingConversationId(convId)
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("segmentor_token") : null
      const res = await fetch(`${API_URL}/api/projects/${currentProjectId}/segi/conversations/${convId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        setConversations(prev => prev.filter(c => c.id !== convId))
        if (activeConversationId === convId) {
          navigateToSection("dashboard")
        }
        toast.success("Conversation deleted")
      }
    } catch {
      toast.error("Failed to delete conversation")
    } finally {
      setDeletingConversationId(null)
    }
  }

  function switchProject(projectId: string) {
    posthog.capture("project_switched", { project_id: projectId })
    setCurrentProjectId(projectId)
    setVisibleChatCount(15)
    router.push(`/dashboard/projects/${projectId}?section=${activeSection}`)
  }

  async function onCreateSubmit(data: CreateFormData) {
    setCreateLoading(true)
    try {
      const created = await api.post<{ id: string }>("/api/projects", data)
      posthog.capture("project_created", { project_id: created.id, name: data.name })
      toast.success("Project created!")
      form.reset()
      setCreateOpen(false)
      await reload()
      setCurrentProjectId(created.id)
      router.push(`/dashboard/projects/${created.id}?section=dashboard`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create")
    } finally {
      setCreateLoading(false)
    }
  }

  return (
    <>
      <aside
        className={cn(
          "fixed top-0 left-0 bottom-0 z-30 flex flex-col bg-white dark:bg-[#343434] text-sidebar-foreground transition-[width] duration-200 ease-in-out m-2 rounded-xl border dark:border-[#484848] shadow-sm overflow-hidden",
          collapsed ? "w-[60px]" : "w-[calc(18rem-1rem)]"
        )}
      >
        {/* Project Switcher */}
        <div className="shrink-0 relative">
          <div className={cn(
            "flex items-center gap-1 border-b dark:border-[#484848]",
            collapsed ? "px-1.5 py-2 flex-col" : "px-1.5 pt-1.5 pb-1.5",
          )}>
            <button
              onClick={() => !collapsed && setProjectSwitcherOpen(o => !o)}
              className={cn(
                "flex items-center gap-2.5 rounded-[9px] p-2 text-sm hover:bg-sidebar-accent dark:hover:bg-[#3d3d3d] transition-colors duration-150 w-full",
                collapsed ? "justify-center" : "text-left"
              )}
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted dark:bg-white overflow-hidden">
                {currentProject?.siteUrl ? (
                  <Favicon url={currentProject.siteUrl} size={20} />
                ) : (
                  <span className="font-bold text-xs text-primary dark:text-black">{currentProject?.name?.charAt(0)?.toUpperCase() ?? "S"}</span>
                )}
              </div>
              {!collapsed && (
                <>
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-semibold text-[14px] leading-tight dark:text-white">
                      {currentProject?.name ?? "No project"}
                    </p>
                    {currentProject && (
                      <p className="truncate text-[11px] text-muted-foreground dark:text-[#C2C0B6] leading-tight mt-0.5">
                        {(() => { try { return new URL(currentProject.siteUrl).hostname } catch { return currentProject.siteUrl } })()}
                      </p>
                    )}
                  </div>
                  <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground dark:text-[#C2C0B6]" />
                </>
              )}
            </button>
          </div>

          {/* Overlay project list */}
          {projectSwitcherOpen && !collapsed && (
            <>
              <div className="fixed inset-0 z-40" onMouseDown={() => setProjectSwitcherOpen(false)} />
              <div className="absolute left-0 right-0 top-0 z-50 rounded-[9px] bg-white dark:bg-[#3d3d3d] border dark:border-[#484848] shadow-lg animate-in fade-in slide-in-from-top-1 duration-150">
                <button
                  onClick={() => setProjectSwitcherOpen(false)}
                  className="flex items-center gap-2.5 p-2 w-full text-left"
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted dark:bg-white overflow-hidden">
                    {currentProject?.siteUrl ? (
                      <Favicon url={currentProject.siteUrl} size={20} />
                    ) : (
                      <span className="font-bold text-xs text-primary dark:text-black">{currentProject?.name?.charAt(0)?.toUpperCase() ?? "S"}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-semibold text-[14px] leading-tight dark:text-white">
                      {currentProject?.name ?? "No project"}
                    </p>
                    {currentProject && (
                      <p className="truncate text-[11px] text-muted-foreground dark:text-[#C2C0B6] leading-tight mt-0.5">
                        {(() => { try { return new URL(currentProject.siteUrl).hostname } catch { return currentProject.siteUrl } })()}
                      </p>
                    )}
                  </div>
                  <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground dark:text-[#C2C0B6]" />
                </button>
                <div className="px-2 pb-1.5">
                  <div className="flex flex-col gap-2.5">
                    <p className="px-1 text-[12px] text-muted-foreground/60 dark:text-[#999999]/60">
                      Projects
                    </p>
                    {projects.map(p => (
                      <button
                        key={p.id}
                        onClick={() => {
                          switchProject(p.id)
                          setProjectSwitcherOpen(false)
                        }}
                        className="flex items-center justify-between px-1 w-full"
                      >
                        <div className="flex items-center gap-1.5">
                          <div className="flex size-5 items-center justify-center rounded-sm overflow-hidden">
                            <Favicon url={p.siteUrl} size={16} />
                          </div>
                          <span className="text-[14px] text-sidebar-foreground dark:text-[#C2C0B6]">{p.name}</span>
                        </div>
                        {p.id === currentProjectId && (
                          <Check className="size-4 text-primary" />
                        )}
                      </button>
                    ))}
                  </div>
                  <Separator className="my-2 dark:bg-[#484848]" />
                  <button
                    onClick={() => {
                      setProjectSwitcherOpen(false)
                      setCreateOpen(true)
                    }}
                    className="flex items-center gap-2 rounded-lg py-[7px] px-2 text-[14px] text-sidebar-foreground dark:text-[#C2C0B6] hover:bg-sidebar-accent dark:hover:bg-[#484848] transition-colors duration-150 w-full"
                  >
                    <Plus className="size-[18px] shrink-0" />
                    <span>New project</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
          {recordingsBrowserOpen && !collapsed ? (
            <motion.div
              key="recordings-browser"
              initial={{ x: "100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="flex-1 min-h-0 flex flex-col"
            >
              {/* Recording Browser Header */}
              <div className="shrink-0 px-3 pt-3 flex flex-col gap-2">
                <button
                  onClick={closeRecordingsBrowser}
                  className="flex items-center gap-1.5 text-[14px] dark:text-[#C2C0B6] hover:dark:text-white transition-colors"
                >
                  <ArrowLeft className="size-[18px]" />
                  <span>Back</span>
                </button>

                <button
                  onClick={() => setFiltersOpen(o => !o)}
                  className="flex items-center justify-between px-2 py-2 rounded-lg hover:bg-sidebar-accent dark:hover:bg-[#3d3d3d] transition-colors"
                >
                  <span className="text-[11px] font-medium text-sidebar-foreground/50 dark:text-[#999999]/60 tracking-wide">Filters</span>
                  <ChevronDown className={cn("size-[18px] dark:text-[#C2C0B6] transition-transform duration-150", filtersOpen && "rotate-180")} />
                </button>
              </div>

              {/* Recordings Count + List */}
              <div className="shrink-0 px-3 mt-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium dark:text-[#C2C0B6]/60">Recordings</span>
                  <span className="text-[11px] dark:text-[#C2C0B6]/60">{recordingsTotal.toLocaleString()}</span>
                </div>
              </div>

              <ScrollArea className="flex-1 min-h-0 px-3 mt-2">
                <div className="flex flex-col gap-2">
                  {recordingsLoading && recordings.length === 0 && (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-4 w-4 animate-spin dark:text-[#C2C0B6]" />
                    </div>
                  )}
                  {recordings.map((rec) => {
                    const isSelected = selectedSessionId === rec.sessionId
                    return (
                      <button
                        key={rec.id}
                        onClick={() => selectRecording(rec.sessionId)}
                        className={cn(
                          "rounded-lg border text-left transition-colors w-full",
                          isSelected
                            ? "dark:border-[#C2C0B6]/30 dark:bg-[#3d3d3d]"
                            : "dark:border-[#484848] dark:hover:border-[#C2C0B6]/20 dark:hover:bg-[#3d3d3d]/50"
                        )}
                      >
                        <div className="px-2.5 py-2 flex items-center gap-2">
                          <img
                            src={visitorAvatarUrl(rec, 32)}
                            alt=""
                            className="size-4 rounded-full shrink-0 bg-muted"
                            loading="lazy"
                          />
                          <span className="text-[13px] dark:text-white truncate flex-1">{rec.visitorName}</span>
                          <span className="text-[13px] dark:text-[#C2C0B6]/60 shrink-0">{timeAgo(rec.startedAt)}</span>
                        </div>
                        <div className="mx-2.5 border-t dark:border-[#484848]" />
                        <div className="px-2.5 py-2 flex flex-col gap-1.5">
                          <div className="flex items-center gap-1.5 text-[13px] dark:text-[#C2C0B6]">
                            <Clock className="size-3 shrink-0" />
                            <span>{formatDuration(rec.duration)}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[13px] dark:text-[#C2C0B6]">
                            <MousePointerClick className="size-3 shrink-0" />
                            <span>{rec.clickCount}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[13px] dark:text-[#C2C0B6]">
                            {rec.device === "mobile" ? <Smartphone className="size-3 shrink-0" /> : rec.device === "tablet" ? <Tablet className="size-3 shrink-0" /> : <Monitor className="size-3 shrink-0" />}
                            <span>{rec.browser || "—"}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[13px] dark:text-[#C2C0B6]">
                            <Globe className="size-3 shrink-0" />
                            <span>{rec.country || "—"}</span>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </ScrollArea>
            </motion.div>
          ) : (
          <motion.div
            key="main-nav"
            initial={{ x: "-100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "-100%", opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="flex-1 min-h-0 flex flex-col"
          >
          {/* Nav Groups (fixed) */}
          <div className={cn("flex flex-col gap-0.5 pt-3 shrink-0", collapsed ? "px-1.5" : "px-3")}>
            {NAV_GROUPS.map((group, gi) => (
              <div key={gi} className={cn("flex flex-col gap-0.5", gi > 0 && "mt-4")}>
                {group.label && !collapsed && (
                  <p className="px-2 pb-1 text-[11px] font-medium text-sidebar-foreground/50 dark:text-[#999999]/60 tracking-wide">
                    {group.label}
                  </p>
                )}
                {collapsed && gi > 0 && <Separator className="my-1" />}
                {group.items.map((item) => {
                  const active =
                    item.key === "editor"
                      ? pathname.includes("/editor")
                      : activeSection === item.key && !pathname.includes("/editor")
                  return (
                    <button
                      key={item.key}
                      onClick={() => navigateToSection(item.key)}
                      className={cn(
                        "relative flex items-center gap-2.5 rounded-lg py-[7px] text-[14px] transition-colors duration-150 w-full",
                        active
                          ? "bg-primary/10 dark:bg-[#3d3d3d] text-foreground dark:text-[#C2C0B6] font-medium"
                          : "text-sidebar-foreground dark:text-[#C2C0B6] hover:bg-sidebar-accent dark:hover:bg-[#3d3d3d] hover:text-sidebar-accent-foreground",
                        collapsed ? "justify-center px-0" : "text-left px-2"
                      )}
                      title={collapsed ? item.label : undefined}
                    >
                      <item.icon className={cn("size-[17px] shrink-0", active ? "text-foreground dark:text-[#C2C0B6]" : "text-sidebar-foreground dark:text-[#C2C0B6]")} />
                      {!collapsed && <span>{item.label}</span>}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>

          {/* Reports Section (scrollable) */}
          <div className={cn("mt-4 flex flex-col gap-0.5 shrink-0", collapsed ? "px-1.5" : "px-3")}>
            {!collapsed && (
              <p className="px-2 pb-1 text-[11px] font-medium text-sidebar-foreground/50 dark:text-[#999999]/60 tracking-wide">
                Reports
              </p>
            )}
            {collapsed && <Separator className="my-1" />}

            {/* New Chat Button */}
            <button
              onClick={() => navigateToChat()}
              className={cn(
                "relative flex items-center gap-2.5 rounded-lg py-[7px] text-[14px] transition-colors w-full cursor-pointer",
                "text-sidebar-foreground dark:text-sidebar-foreground hover:bg-sidebar-accent dark:hover:bg-[#3d3d3d] hover:text-sidebar-accent-foreground",
                collapsed ? "justify-center px-0" : "text-left px-2"
              )}
              title={collapsed ? "New chat" : undefined}
            >
              <div className="flex size-[18px] shrink-0 items-center justify-center rounded-full dark:bg-white/10">
                <Plus className="size-3.5" />
              </div>
              {!collapsed && <span>New chat</span>}
            </button>
          </div>

          {/* Conversation List (scrollable) */}
          {!collapsed && (
            <div ref={chatScrollRef} className="flex-1 min-h-0">
            <ScrollArea className={cn("h-full", collapsed ? "px-1.5" : "px-3")}>
              <div className="flex flex-col gap-0.5 mt-0.5">
                {loadingConversations && conversations.length === 0 && (
                  <div className="flex items-center gap-2 px-2 py-2">
                    <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                    <span className="text-[12px] text-muted-foreground">Loading...</span>
                  </div>
                )}
                {conversations.slice(0, visibleChatCount).map((conv) => {
                  const isActive = activeSection === "chat" && activeConversationId === conv.id
                  const isRenaming = renamingConversationId === conv.id
                  const title = conv.title || "Untitled"
                  return (
                    <div
                      key={conv.id}
                      className={cn(
                        "group flex items-center gap-1 rounded-lg py-[5px] text-[14px] transition-colors cursor-pointer",
                        isActive
                          ? "dark:bg-[#3d3d3d] dark:text-[#C2C0B6]"
                          : "text-sidebar-foreground dark:text-[#C2C0B6] hover:bg-sidebar-accent dark:hover:bg-[#3d3d3d]",
                        "pl-[6px] pr-1"
                      )}
                      onClick={() => !isRenaming && navigateToChat(conv.id)}
                      onDoubleClick={() => isActive && startRenaming(conv.id)}
                      title={title}
                    >
                      {isRenaming ? (
                        <div className="flex-1 min-w-0 overflow-hidden flex items-center gap-1.5" style={{ overscrollBehavior: "contain" }}>
                          <input
                            autoFocus
                            disabled={savingRename}
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onBlur={() => !savingRename && commitRename(conv.id)}
                            onKeyDown={(e) => {
                              e.stopPropagation()
                              if (savingRename) return
                              if (e.key === "Enter") { e.preventDefault(); commitRename(conv.id) }
                              if (e.key === "Escape") { e.preventDefault(); setRenamingConversationId(null) }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className={cn(
                              "w-full bg-transparent border-none outline-none text-[14px] dark:text-white py-0 px-0 leading-[20px]",
                              savingRename && "opacity-50"
                            )}
                          />
                          {savingRename && <Loader2 className="h-3 w-3 animate-spin shrink-0 dark:text-[#C2C0B6]" />}
                        </div>
                      ) : (
                        <span className="flex-1 min-w-0 truncate leading-[20px]">
                          {title.length > 25 ? title.slice(0, 25) + "…" : title}
                        </span>
                      )}
                      {!isRenaming && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              className={cn(
                                "shrink-0 h-[18px] w-[18px] rounded flex items-center justify-center hover:bg-white/10 transition-colors",
                                isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                              )}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {deletingConversationId === conv.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <MoreHorizontal className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            side="right"
                            align="start"
                            sideOffset={4}
                            className="dark:bg-[#3d3d3d] dark:border-[#484848] rounded-[9px] min-w-[100px] p-1.5"
                          >
                            <DropdownMenuItem
                              className="text-[14px] dark:text-[#C2C0B6] rounded-lg px-2 py-1 gap-2 cursor-pointer"
                              onClick={() => startRenaming(conv.id)}
                            >
                              <Pencil className="h-[18px] w-[18px]" />
                              Rename
                            </DropdownMenuItem>
                            <Separator className="my-1.5 dark:bg-[#484848]" />
                            <DropdownMenuItem
                              className="text-[14px] dark:text-[#FE8181] text-destructive rounded-lg px-2 py-1 gap-2 cursor-pointer focus:text-destructive dark:focus:text-[#FE8181]"
                              onClick={() => deleteConversation(conv.id)}
                            >
                              <Trash2 className="h-[18px] w-[18px]" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  )
                })}
                {conversations.length > visibleChatCount && (
                  <button
                    onClick={() => setVisibleChatCount(prev => prev + 10)}
                    className="px-2 py-1.5 text-[12px] text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors text-left"
                  >
                    Load more...
                  </button>
                )}
              </div>
            </ScrollArea>
            </div>
          )}
          </motion.div>
          )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className={cn("relative border-t dark:border-[#484848] py-1.5", collapsed ? "px-1.5" : "px-1.5")}>
          <button
            onClick={() => !collapsed && setProfileMenuOpen(o => !o)}
            className={cn(
              "flex items-center gap-2.5 rounded-[9px] p-2 text-sm hover:bg-sidebar-accent dark:hover:bg-[#3d3d3d] transition-colors duration-150 w-full",
              collapsed ? "justify-center" : "text-left"
            )}
          >
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary dark:bg-[#CDC4B6] dark:text-black text-[11px] font-semibold">
              {initials}
            </div>
            {!collapsed && (
              <>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-[13px] font-medium leading-tight dark:text-white">{userName}</p>
                  <p className="truncate text-[11px] text-muted-foreground dark:text-[#999999] leading-tight">{email}</p>
                </div>
                <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground dark:text-[#999999]" />
              </>
            )}
          </button>

          {profileMenuOpen && !collapsed && (
            <>
              <div className="fixed inset-0 z-40" onMouseDown={() => setProfileMenuOpen(false)} />
              <div className="absolute left-1.5 right-1.5 bottom-1.5 z-50 rounded-[9px] bg-white dark:bg-[#3d3d3d] border dark:border-[#484848] shadow-lg animate-in fade-in slide-in-from-bottom-1 duration-150">
                <div className="px-2 pt-1.5 pb-0.5 flex flex-col gap-0.5">
                  {([
                    { label: "Settings", icon: Settings, action: () => { setProfileMenuOpen(false); router.push("/dashboard/settings") } },
                    { label: "Billing", icon: CreditCard, action: () => { setProfileMenuOpen(false); router.push("/dashboard/billing") } },
                    { label: "Integrations", icon: Plug, action: () => { setProfileMenuOpen(false); navigateToSection("integrations") } },
                    { label: "Setup", icon: Settings, action: () => { setProfileMenuOpen(false); navigateToSection("setup") } },
                    { label: "Log out", icon: LogOut, action: () => { setProfileMenuOpen(false); handleLogout() } },
                  ] as const).map((item) => (
                    <button
                      key={item.label}
                      onClick={item.action}
                      className="flex items-center gap-2 rounded-lg py-[7px] px-2 text-[14px] text-sidebar-foreground dark:text-[#C2C0B6] hover:bg-sidebar-accent dark:hover:bg-[#484848] transition-colors duration-150 w-full"
                    >
                      <item.icon className="size-[18px] shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
                <Separator className="dark:bg-[#484848] mx-2" />
                <button
                  onClick={() => setProfileMenuOpen(false)}
                  className="flex items-center gap-2.5 p-2 w-full text-left"
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary dark:bg-[#CDC4B6] dark:text-black text-[11px] font-semibold">
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-[13px] font-medium leading-tight dark:text-white">{userName}</p>
                    <p className="truncate text-[11px] text-muted-foreground dark:text-[#999999] leading-tight">{email}</p>
                  </div>
                  <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground dark:text-[#999999]" />
                </button>
              </div>
            </>
          )}
        </div>
      </aside>

      {/* Create project dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Project</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onCreateSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Name</FormLabel>
                    <FormControl>
                      <Input placeholder="My Website" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="siteUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Site URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={createLoading}>
                {createLoading ? "Creating…" : "Create Project"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  )
}
