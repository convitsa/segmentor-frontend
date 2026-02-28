"use client"

import { useState, useEffect } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { useProject } from "@/lib/project-context"
import { useTheme } from "next-themes"
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
  Moon,
  Sun,
  LogOut,
  ChevronsUpDown,
  Plus,
  Check,
  Globe,
  PanelLeft,
  CreditCard,
  Plug,
} from "lucide-react"

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
    ],
  },
  {
    label: "Personalization",
    items: [
      { key: "personalizations", label: "Personalizations", icon: Sparkles },
      { key: "audiences", label: "Audiences", icon: Users },
      { key: "editor", label: "Editor", icon: Pencil },
    ],
  },
  {
    label: "Settings",
    items: [
      { key: "integrations", label: "Integrations", icon: Plug },
      { key: "setup", label: "Setup", icon: Settings },
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
  const { theme, setTheme } = useTheme()

  const searchParams = useSearchParams()
  const [createOpen, setCreateOpen] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [activeSection, setActiveSection] = useState("dashboard")

  useEffect(() => {
    if (pathname === "/dashboard/settings") {
      setActiveSection("settings")
    } else if (pathname === "/dashboard/billing") {
      setActiveSection("billing")
    } else if (pathname.includes("/editor")) {
      setActiveSection("editor")
    } else {
      setActiveSection(searchParams.get("section") || "dashboard")
    }
  }, [pathname, searchParams])

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
    router.push(`/dashboard/projects/${currentProjectId}?section=${section}`)
  }

  function switchProject(projectId: string) {
    posthog.capture("project_switched", { project_id: projectId })
    setCurrentProjectId(projectId)
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
          "fixed top-0 left-0 bottom-0 z-30 flex flex-col bg-white dark:bg-card text-sidebar-foreground transition-[width] duration-200 ease-in-out m-2 rounded-xl border shadow-sm overflow-hidden",
          collapsed ? "w-[60px]" : "w-[calc(18rem-1rem)]"
        )}
      >
        {/* Project Switcher */}
        <div className={cn("shrink-0 border-b flex items-center gap-1", collapsed ? "px-1.5 py-2 flex-col" : "px-3 py-2")}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "flex items-center gap-2.5 rounded-lg p-2 text-sm hover:bg-sidebar-accent transition-colors w-full",
                  collapsed ? "justify-center" : "text-left"
                )}
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted overflow-hidden">
                  {currentProject?.siteUrl ? (
                    <Favicon url={currentProject.siteUrl} size={20} />
                  ) : (
                    <span className="font-bold text-xs text-primary">{currentProject?.name?.charAt(0)?.toUpperCase() ?? "S"}</span>
                  )}
                </div>
                {!collapsed && (
                  <>
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-semibold text-[14px] leading-tight">
                        {currentProject?.name ?? "No project"}
                      </p>
                      {currentProject && (
                        <p className="truncate text-[11px] text-muted-foreground leading-tight mt-0.5">
                          {(() => { try { return new URL(currentProject.siteUrl).hostname } catch { return currentProject.siteUrl } })()}
                        </p>
                      )}
                    </div>
                    <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
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
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground" onClick={onToggle}>
            <PanelLeft className="size-4" />
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className={cn("flex flex-col gap-0.5 pt-3", collapsed ? "px-1.5" : "px-3")}>
            {/* Nav Groups */}
            {NAV_GROUPS.map((group, gi) => (
              <div key={gi} className={cn("flex flex-col gap-0.5", gi > 0 && "mt-4")}>
                {group.label && !collapsed && (
                  <p className="px-2 pb-1 text-[11px] font-medium text-sidebar-foreground/50 tracking-wide">
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
                          ? "bg-primary/5 dark:bg-primary/10 text-foreground font-medium"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                        collapsed ? "justify-center px-0" : "text-left px-2"
                      )}
                      title={collapsed ? item.label : undefined}
                    >
                      <item.icon className={cn("size-[17px] shrink-0", active && "text-foreground")} />
                      {!collapsed && <span>{item.label}</span>}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className={cn("border-t py-2 flex flex-col gap-1", collapsed ? "px-1.5" : "px-3")}>
          {/* Theme toggle */}
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className={cn(
              "flex items-center gap-2.5 rounded-lg py-[7px] text-[14px] text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors w-full",
              collapsed ? "justify-center px-0" : "text-left px-2"
            )}
            title={collapsed ? "Toggle theme" : undefined}
          >
            <Sun className="size-[17px] shrink-0 dark:hidden" />
            <Moon className="size-[17px] shrink-0 hidden dark:block" />
            {!collapsed && <span>Theme</span>}
          </button>

          {/* User */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "flex items-center gap-2.5 rounded-lg p-2 text-sm hover:bg-sidebar-accent transition-colors w-full",
                  collapsed ? "justify-center" : "text-left"
                )}
              >
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-[11px] font-semibold">
                  {initials}
                </div>
                {!collapsed && (
                  <>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-[13px] font-medium leading-tight">{userName}</p>
                      <p className="truncate text-[11px] text-muted-foreground leading-tight">{email}</p>
                    </div>
                    <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
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
