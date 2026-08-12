import BottomNav from "@/components/BottomNav";
import OfflineQueueIndicator from "@/components/OfflineQueueIndicator";
import PullToRefresh from "@/components/PullToRefresh";
import HealthAutoSync from "@/components/HealthAutoSync";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col">
      <div className="safe-top flex-1 pb-24">
        <ServiceWorkerRegister />
        <HealthAutoSync />
        <OfflineQueueIndicator />
        <PullToRefresh>{children}</PullToRefresh>
      </div>
      <BottomNav />
    </div>
  );
}
