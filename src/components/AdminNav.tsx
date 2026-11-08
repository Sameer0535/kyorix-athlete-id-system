"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Users, Building, Scale, LayoutDashboard, CreditCard, LogOut, ExternalLink, UserPlus } from "lucide-react";

export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    router.push("/admin/login");
  };

  const navItems = [
    { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { label: "Registrations", href: "/admin/registrations", icon: Users },
    { label: "ID Cards", href: "/admin/id-cards", icon: CreditCard },
    { label: "Academies", href: "/admin/academies", icon: Building },
    { label: "Weight Categories", href: "/admin/weight-categories", icon: Scale },
  ];

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm backdrop-blur-md bg-white/95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left Brand & Title */}
          <div className="flex items-center gap-6">
            <Link href="/admin/dashboard" className="flex items-center gap-3">
              <Image
                src="/images/kyorix-logo.png"
                alt="Kyorix Logo"
                width={200}
                height={60}
                className="h-11 sm:h-12 w-auto object-contain"
              />
              <div className="hidden sm:flex flex-col border-l border-slate-200 pl-3">
                <span className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">Admin Console</span>
                <span className="text-xs font-bold text-slate-800 tracking-tight">Accreditation Portal</span>
              </div>
            </Link>

            {/* Nav Links */}
            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      isActive
                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            <Link
              href="/athlete/register?from=admin"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm shadow-blue-500/20"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Add Player</span>
            </Link>

            <Link
              href="/"
              target="_blank"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-600 px-2.5 py-1 rounded-lg hover:bg-slate-100 transition"
            >
              <span>Public Portal</span>
              <ExternalLink className="w-3 h-3" />
            </Link>

            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-red-600 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-red-50 border border-slate-200 hover:border-red-200 transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="flex md:hidden items-center justify-around py-2 border-t border-slate-100 gap-1 overflow-x-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap ${
                  isActive ? "bg-blue-50 text-blue-700 font-bold" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
