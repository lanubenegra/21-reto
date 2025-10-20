import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import authOptions from "@/auth.config";
import ClearViewAsButton from "@/components/admin/ClearViewAsButton";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/auth/signin");
  }

  const role = session.user?.role ?? "user";
  if (!["support", "admin", "superadmin"].includes(role)) {
    redirect("/");
  }

  const viewAs = cookies().get("admin_view_as")?.value ?? null;

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-4">
      {viewAs && (
        <div className="bg-amber-100 border border-amber-300 text-amber-900 px-3 py-2 rounded flex items-center justify-between gap-4">
          <div>
            <span className="font-medium">Viendo datos como:</span>{" "}
            <span className="font-mono">{viewAs}</span>{" "}
            <span className="text-xs opacity-80">(solo lectura)</span>
          </div>
          <ClearViewAsButton />
        </div>
      )}
      {children}
    </div>
  );
}
