import type { ReactNode } from "react";
import { AppControls } from "@/components/layout/app-controls";
import { EchoWaveBackground } from "@/components/layout/echo-wave-background";
import { MobileNavigation } from "@/components/layout/mobile-navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { TopHeader } from "@/components/layout/top-header";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div
      data-interface-root
      className="relative isolate min-h-screen overflow-x-clip"
    >
      <EchoWaveBackground />
      <div className="relative z-10 min-h-screen lg:flex">
        <Sidebar />
        <div className="min-w-0 flex-1">
          <TopHeader />
          <main className="px-4 pb-28 pt-7 sm:px-6 sm:pt-9 lg:px-8 lg:pb-12">{children}</main>
        </div>
      </div>
      <MobileNavigation />
      <AppControls />
    </div>
  );
}
