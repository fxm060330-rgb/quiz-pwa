"use client";

import { usePathname, useRouter } from "next/navigation";

const tabs = [
  { path: "/practice", label: "练习", icon: "📖" },
  { path: "/exam", label: "考试", icon: "📝" },
  { path: "/wrong", label: "错题", icon: "📋" },
  { path: "/groups", label: "群组", icon: "👥" },
  { path: "/profile", label: "我的", icon: "👤" },
];

export default function TabBar() {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (path: string) => {
    if (path === "/practice") return pathname === "/" || pathname.startsWith("/practice");
    return pathname.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 safe-bottom z-50">
      <div className="flex items-center justify-around h-14 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const active = isActive(tab.path);
          return (
            <button
              key={tab.path}
              onClick={() => router.push(tab.path)}
              className={`flex flex-col items-center justify-center gap-0.5 w-full h-full transition-colors ${
                active ? "text-primary" : "text-text-secondary"
              }`}
            >
              <span className="text-lg">{tab.icon}</span>
              <span className={`text-xs ${active ? "font-semibold" : ""}`}>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
