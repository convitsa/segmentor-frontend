"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Trash2,
  ExternalLink,
} from "lucide-react";

interface Project {
  id: string;
  name: string;
  siteUrl: string;
  ownerEmail: string;
  elementsCount: number;
  createdAt: string;
}

interface ProjectsResponse {
  projects: Project[];
  total: number;
  pages: number;
}

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  function loadProjects() {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (search.trim()) params.set("search", search.trim());
    api
      .get<ProjectsResponse>(`/api/admin/projects?${params}`)
      .then((data) => {
        setProjects(data.projects);
        setTotal(data.total);
        setPages(data.pages);
      })
      .catch(() => toast.error("Failed to load projects"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadProjects();
  }, [page, search]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  }

  function handleDelete(projectId: string) {
    if (!window.confirm("Delete this project? This action cannot be undone."))
      return;
    setActionLoading(projectId);
    api
      .delete(`/api/admin/projects/${projectId}`)
      .then(() => {
        toast.success("Project deleted");
        loadProjects();
      })
      .catch(() => toast.error("Failed to delete project"))
      .finally(() => setActionLoading(null));
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Projects</h1>
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or URL..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
          <Button type="submit" variant="secondary" size="sm">
            Search
          </Button>
        </form>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : projects.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground">
              No projects found
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <div className="min-w-[700px]">
                  <div className="grid grid-cols-[1fr_1fr_1fr_80px_100px_100px] gap-4 px-6 py-4 border-b bg-muted/30 text-sm font-medium text-muted-foreground">
                    <div>Name</div>
                    <div>Site URL</div>
                    <div>Owner Email</div>
                    <div className="text-right">Elements</div>
                    <div>Created</div>
                    <div className="text-right">Actions</div>
                  </div>
                  {projects.map((p) => (
                    <div
                      key={p.id}
                      className="grid grid-cols-[1fr_1fr_1fr_80px_100px_100px] gap-4 px-6 py-4 border-b last:border-b-0 items-center text-sm"
                    >
                      <div className="font-medium truncate">{p.name}</div>
                      <div className="truncate">
                        <a
                          href={p.siteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          <span className="truncate">{p.siteUrl}</span>
                          <ExternalLink className="size-3 shrink-0" />
                        </a>
                      </div>
                      <div className="truncate text-muted-foreground">
                        {p.ownerEmail}
                      </div>
                      <div className="text-right tabular-nums">
                        {p.elementsCount}
                      </div>
                      <div className="text-muted-foreground">
                        {formatDate(p.createdAt)}
                      </div>
                      <div className="flex justify-end">
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          title="Delete project"
                          onClick={() => handleDelete(p.id)}
                          disabled={actionLoading === p.id}
                        >
                          {actionLoading === p.id ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            <Trash2 className="size-3" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {pages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    {total} project{total !== 1 ? "s" : ""} total
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                    >
                      <ChevronLeft className="size-4" />
                    </Button>
                    <span className="text-sm tabular-nums">
                      Page {page} of {pages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(pages, p + 1))}
                      disabled={page >= pages}
                    >
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
