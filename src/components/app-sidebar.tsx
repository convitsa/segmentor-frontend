"use client"

import { useState, useEffect, useCallback } from "react"
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
  PanelLeft,
  CreditCard,
  Plug,
  Video,
  MessageSquarePlus,
  MoreHorizontal,
  Trash2,
  Loader2,
} from "lucide-react"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"

interface Conversation {
  id: string
  title: string | null
  createdAt: string
  updatedAt: string
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
  const [visibleChatCount, setVisibleChatCount] = useState(15)

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
      } else {
        setActiveConversationId(null)
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
    setActiveSection(section)
    setActiveConversationId(null)
    router.push(`/dashboard/projects/${currentProjectId}?section=${section}`)
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

  async function deleteConversation(e: React.MouseEvent, convId: string) {
    e.stopPropagation()
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
        <div className={cn("shrink-0 border-b dark:border-[#484848] flex items-center gap-1", collapsed ? "px-1.5 py-2 flex-col" : "px-3 py-2")}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "flex items-center gap-2.5 rounded-lg p-2 text-sm hover:bg-sidebar-accent transition-colors w-full",
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
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="min-w-56 rounded-lg"
              side={collapsed ? "right" : "bottom"}
              align="start"
              sideOffset={4}
            >
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Projects
              </DropdownMenuLabel>
              {projects.map(p => (
                <DropdownMenuItem
                  key={p.id}
                  onClick={() => switchProject(p.id)}
                  className="gap-2 p-2"
                >
                  <div className="flex size-6 items-center justify-center rounded-sm border overflow-hidden">
                    <Favicon url={p.siteUrl} size={16} />
                  </div>
                  <span className="flex-1 truncate">{p.name}</span>
                  {p.id === currentProjectId && (
                    <Check className="size-4 text-primary" />
                  )}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setCreateOpen(true)} className="gap-2 p-2">
                <div className="flex size-6 items-center justify-center rounded-md border border-dashed">
                  <Plus className="size-4" />
                </div>
                <span className="text-muted-foreground">New project</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground dark:text-[#C2C0B6]" onClick={onToggle}>
            <PanelLeft className="size-4" />
          </Button>
        </div>

        <div className="flex-1 min-h-0 flex flex-col">
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
                        "relative flex items-center gap-2.5 rounded-lg py-[7px] text-[14px] transition-colors w-full",
                        active
                          ? "bg-primary/10 dark:bg-sidebar-primary text-foreground dark:text-black font-medium"
                          : "text-sidebar-foreground dark:text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                        collapsed ? "justify-center px-0" : "text-left px-2"
                      )}
                      title={collapsed ? item.label : undefined}
                    >
                      <item.icon className={cn("size-[17px] shrink-0", active && "text-foreground dark:text-black")} />
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
            <ScrollArea className={cn("flex-1 min-h-0", collapsed ? "px-1.5" : "px-3")}>
              <div className="flex flex-col gap-0.5 mt-0.5">
                {loadingConversations && conversations.length === 0 && (
                  <div className="flex items-center gap-2 px-2 py-2">
                    <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                    <span className="text-[12px] text-muted-foreground">Loading...</span>
                  </div>
                )}
                {conversations.slice(0, visibleChatCount).map((conv) => {
                  const isActive = activeSection === "chat" && activeConversationId === conv.id
                  const title = conv.title || "Untitled"
                  const displayTitle = title.length > 30 ? title.slice(0, 25) + "..." : title
                  return (
                    <div
                      key={conv.id}
                      className={cn(
                        "group flex items-center gap-2 rounded-lg py-[6px] text-[13px] transition-colors cursor-pointer",
                        isActive
                          ? "bg-primary/10 dark:bg-sidebar-primary text-foreground dark:text-black font-medium"
                          : "text-sidebar-foreground dark:text-sidebar-foreground hover:bg-sidebar-accent dark:hover:bg-[#3d3d3d] hover:text-sidebar-accent-foreground",
                        "pl-2 pr-1"
                      )}
                      onClick={() => navigateToChat(conv.id)}
                      title={title}
                    >
                      <span className="flex-1 min-w-0 truncate">
                        {displayTitle}
                      </span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            className={cn(
                              "shrink-0 h-6 w-6 rounded flex items-center justify-center hover:bg-muted transition-colors",
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
                        <DropdownMenuContent side="right" align="start" sideOffset={4}>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={(e) => deleteConversation(e, conv.id)}
                          >
                            <Trash2 className="mr-2 h-3.5 w-3.5" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
          )}
        </div>

        {/* Footer */}
        <div className={cn("border-t dark:border-[#484848] py-2 flex flex-col gap-1", collapsed ? "px-1.5" : "px-3")}>
          {/* User */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "flex items-center gap-2.5 rounded-lg p-2 text-sm hover:bg-sidebar-accent transition-colors w-full",
                  collapsed ? "justify-center" : "text-left"
                )}
              >
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary dark:bg-[#CDC4B6] dark:text-black text-[11px] font-semibold">
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
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="min-w-56 rounded-lg"
              side={collapsed ? "right" : "top"}
              align="end"
              sideOffset={4}
            >
              <div className="p-2">
                <p className="text-sm font-medium">{userName}</p>
                <p className="text-xs text-muted-foreground">{email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push("/dashboard/settings")}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/dashboard/billing")}>
                <CreditCard className="mr-2 h-4 w-4" />
                Billing
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigateToSection("recordings")}>
                <Video className="mr-2 h-4 w-4" />
                Recordings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigateToSection("integrations")}>
                <Plug className="mr-2 h-4 w-4" />
                Integrations
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigateToSection("setup")}>
                <Settings className="mr-2 h-4 w-4" />
                Setup
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
