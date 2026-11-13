import { createFileRoute, notFound } from "@tanstack/react-router";
import { checkAdminPageAccess } from "@/lib/admin/server";
import { AdminPanel } from "@/components/admin-panel";

export const Route = createFileRoute("/admin")({
  loader: async () => {
    try {
      await checkAdminPageAccess();
    } catch (error) {
      if (error instanceof Error && ["ADMIN_NOT_FOUND", "Unauthorized"].includes(error.message)) {
        throw notFound();
      }
      throw error;
    }
  },
  component: AdminPanel,
  notFoundComponent: () => (
    <main className="grid min-h-screen place-items-center bg-bg px-6 text-center">
      <div>
        <p className="font-display text-5xl font-extrabold text-cyan">404</p>
        <h1 className="mt-3 text-lg font-bold">Página no encontrada</h1>
      </div>
    </main>
  ),
});
