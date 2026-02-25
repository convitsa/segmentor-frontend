"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useProject } from "@/lib/project-context";
import { RefreshCw } from "lucide-react";

export default function ProjectsPage() {
  const router = useRouter();
  const { projects, loading } = useProject();

  useEffect(() => {
    if (loading) return;
    if (projects.length > 0) {
      router.replace(`/dashboard/projects/${projects[0].id}?section=dashboard`);
    }
  }, [projects, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-muted-foreground mb-2">No projects yet.</p>
        <p className="text-sm text-muted-foreground">Create your first project using the project switcher in the sidebar.</p>
      </div>
    );
  }

  return null;
}
