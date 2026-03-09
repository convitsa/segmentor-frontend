import { SegiOrb } from "@/components/segi-orb";

export default function DashboardLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <SegiOrb size={48} thinking />
    </div>
  );
}
