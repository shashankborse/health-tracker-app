import BottomNav from "@/components/BottomNav";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col">
      <div className="safe-top flex-1 pb-24">{children}</div>
      <BottomNav />
    </div>
  );
}
