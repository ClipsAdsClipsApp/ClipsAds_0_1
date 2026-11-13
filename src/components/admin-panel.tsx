import { useCallback, useEffect, useState, type ReactNode } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import {
  Activity,
  AlertCircle,
  BarChart3,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clapperboard,
  Flag,
  LoaderCircle,
  MessageSquare,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { getFirebaseAuth } from "@/lib/firebase/client";
import {
  getAdminOverview,
  listAdminUsers,
  getAdminUser,
  setAdminUserRole,
  setAdminUserBlocked,
  deleteAdminUser,
  listAdminClips,
  setAdminClipModeration,
  listAdminComments,
  setAdminCommentModeration,
  listAdminReports,
  resolveAdminReport,
  listAdminPayments,
} from "@/lib/admin/server";

type Overview = Awaited<ReturnType<typeof getAdminOverview>>;
type UserList = Awaited<ReturnType<typeof listAdminUsers>>;
type UserDetail = Awaited<ReturnType<typeof getAdminUser>>;
type Clip = Awaited<ReturnType<typeof listAdminClips>>[number];
type Comment = Awaited<ReturnType<typeof listAdminComments>>[number];
type Report = Awaited<ReturnType<typeof listAdminReports>>[number];
type Payment = Awaited<ReturnType<typeof listAdminPayments>>[number];
type Tab = "overview" | "users" | "clips" | "comments" | "reports" | "income";
type Reason = "offensive" | "discrimination" | "spam";
type Action = "hide" | "restore" | "delete";
type TokenCall = <T>(fn: (token: string) => Promise<T>) => Promise<T>;

const tabs = [
  { id: "overview", label: "Resumen", icon: BarChart3 },
  { id: "users", label: "Usuarios", icon: Users },
  { id: "clips", label: "Clips", icon: Clapperboard },
  { id: "comments", label: "Comentarios", icon: MessageSquare },
  { id: "reports", label: "Reportes", icon: Flag },
  { id: "income", label: "Ingresos", icon: CircleDollarSign },
] as const;
const button =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line px-4 py-2 text-sm font-semibold transition-colors hover:bg-fg/5 disabled:opacity-40";
const input =
  "min-h-11 w-full rounded-xl border border-line bg-bg-elevated px-3 text-sm text-fg outline-none focus:border-cyan";
const panel = "rounded-2xl border border-line bg-surface";
const roles: Record<string, string> = { user: "Usuario", creator: "Creador", company: "Empresa" };
const reasons: Record<Reason, string> = {
  offensive: "Contenido ofensivo",
  discrimination: "Discriminación",
  spam: "Spam",
};
const reportReasons: Record<string, string> = {
  ...reasons,
  other: "Otro",
};

function errorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "Error desconocido");
  if (message.includes("FIREBASE_ADMIN_NOT_CONFIGURED"))
    return "La cuenta de servicio de Firebase no está configurada en el servidor.";
  if (message.includes("FIREBASE_ADMIN_CREDENTIALS_INVALID"))
    return "La cuenta de servicio de Firebase del servidor no es válida.";
  if (message.includes("ADMIN_NOT_FOUND"))
    return "No se pudo verificar el acceso de administrador. Comprueba que ambas sesiones correspondan a la misma cuenta autorizada y que su correo esté verificado.";
  return message;
}
function date(value: string | number | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
}
function ErrorBox({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="flex gap-3 rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger"
    >
      <AlertCircle size={18} className="shrink-0" />
      <span>{message}</span>
    </div>
  );
}
function Loading() {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-sm text-muted" role="status">
      <LoaderCircle className="animate-spin" size={18} /> Cargando datos reales…
    </div>
  );
}
function Empty({ children }: { children: ReactNode }) {
  return <div className={`${panel} px-5 py-14 text-center text-sm text-muted`}>{children}</div>;
}
function Badge({ children, danger = false }: { children: ReactNode; danger?: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${danger ? "border-danger/30 bg-danger/10 text-danger" : "border-line bg-bg-elevated text-muted"}`}
    >
      {children}
    </span>
  );
}
function SearchBox({
  value,
  onChange,
  onSubmit,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder: string;
}) {
  return (
    <form
      className="flex gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <label className="relative min-w-0 flex-1">
        <span className="sr-only">{placeholder}</span>
        <Search size={17} className="pointer-events-none absolute left-3 top-3.5 text-muted" />
        <input
          className={`${input} pl-10`}
          value={value}
          maxLength={100}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
        />
      </label>
      <button className={button} type="submit">
        Buscar
      </button>
    </form>
  );
}

export function AdminPanel() {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authState, setAuthState] = useState<"loading" | "ready" | "error">("loading");
  const [authError, setAuthError] = useState("");
  const [tab, setTab] = useState<Tab>("overview");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [pageTokens, setPageTokens] = useState<(string | undefined)[]>([undefined]);
  const [onlyReported, setOnlyReported] = useState(true);
  const [reportStatus, setReportStatus] = useState<"pending" | "resolved" | "all">("pending");
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [users, setUsers] = useState<UserList | null>(null);
  const [clips, setClips] = useState<Clip[] | null>(null);
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [reports, setReports] = useState<Report[] | null>(null);
  const [payments, setPayments] = useState<Payment[] | null>(null);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      return onAuthStateChanged(
        getFirebaseAuth(),
        (user) => {
          setFirebaseUser(user);
          setAuthState("ready");
        },
        (err) => {
          setFirebaseUser(null);
          setAuthError(errorMessage(err));
          setAuthState("error");
        },
      );
    } catch (err) {
      setAuthError(errorMessage(err));
      setAuthState("error");
    }
  }, []);

  const call = useCallback<TokenCall>(
    async (fn) => {
      const current = getFirebaseAuth().currentUser;
      if (!current || !firebaseUser || current.uid !== firebaseUser.uid)
        throw new Error("Tu sesión de Firebase ha terminado. Inicia sesión de nuevo.");
      const token = await current.getIdToken(true);
      if (getFirebaseAuth().currentUser?.uid !== current.uid)
        throw new Error("La sesión ha cambiado. Vuelve a intentarlo.");
      return fn(token);
    },
    [firebaseUser],
  );
  const refresh = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    if (!firebaseUser) return;
    let active = true;
    setLoading(true);
    setError("");
    const load = async () => {
      try {
        switch (tab) {
          case "overview": {
            const result = await call((firebaseToken) =>
              getAdminOverview({ data: { firebaseToken } }),
            );
            if (active) setOverview(result);
            break;
          }
          case "users": {
            const result = await call((firebaseToken) =>
              listAdminUsers({
                data: { firebaseToken, query, pageToken: pageTokens[pageTokens.length - 1] },
              }),
            );
            if (active) setUsers(result);
            break;
          }
          case "clips": {
            const result = await call((firebaseToken) =>
              listAdminClips({ data: { firebaseToken, query } }),
            );
            if (active) setClips(result);
            break;
          }
          case "comments": {
            const result = await call((firebaseToken) =>
              listAdminComments({ data: { firebaseToken, query, onlyReported } }),
            );
            if (active) setComments(result);
            break;
          }
          case "reports": {
            const result = await call((firebaseToken) =>
              listAdminReports({ data: { firebaseToken, status: reportStatus } }),
            );
            if (active) setReports(result);
            break;
          }
          case "income": {
            const result = await call((firebaseToken) =>
              listAdminPayments({ data: { firebaseToken } }),
            );
            if (active) setPayments(result);
            break;
          }
        }
      } catch (err) {
        if (active) setError(errorMessage(err));
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [firebaseUser, call, tab, query, pageTokens, onlyReported, reportStatus, revision]);

  const mutate = async (fn: (token: string) => Promise<unknown>) => {
    setBusy(true);
    setError("");
    try {
      await call(fn);
      refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  const changeTab = (next: Tab) => {
    setTab(next);
    setSearch("");
    setQuery("");
    setPageTokens([undefined]);
    setSelectedUser(null);
    setError("");
  };
  const submitSearch = () => {
    setPageTokens([undefined]);
    setQuery(search.trim());
  };
  const currentTab = tabs.find((item) => item.id === tab)!;

  return (
    <main className="min-h-screen bg-bg text-fg">
      <header className="border-b border-line bg-bg-elevated">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-5 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl border border-cyan/30 bg-cyan/10 text-cyan">
              <ShieldCheck size={21} />
            </div>
            <div>
              <p className="font-display text-lg font-bold tracking-tight">
                Clips<span className="text-cyan">Ads</span>
              </p>
              <p className="text-xs text-muted">Administración</p>
            </div>
          </div>
          <a href="/" className="text-sm font-semibold text-muted hover:text-fg">
            Volver a la app
          </a>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-8">
        <div className="py-8">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-cyan">
            Centro de control
          </p>
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Panel de administración
          </h1>
          <p className="mt-2 text-sm text-muted">Supervisa la comunidad y gestiona su actividad.</p>
        </div>
        {authState === "loading" ? (
          <Loading />
        ) : authState === "error" ? (
          <ErrorBox message={authError} />
        ) : !firebaseUser ? (
          <div className={`${panel} p-6`}>
            <h2 className="font-display text-xl font-bold">Inicia sesión en Firebase</h2>
            <p className="mt-2 text-sm text-muted">
              Necesitas iniciar sesión con la cuenta de administrador para consultar el panel.
            </p>
            <a href="/login" className={`${button} mt-5 border-cyan bg-cyan text-bg`}>
              Ir a iniciar sesión
            </a>
          </div>
        ) : (
          <>
            <nav
              aria-label="Secciones de administración"
              className="-mx-4 flex gap-1 overflow-x-auto border-b border-line px-4 sm:mx-0 sm:px-0"
            >
              {tabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => changeTab(id)}
                  aria-current={tab === id ? "page" : undefined}
                  className={`flex min-h-12 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-semibold transition-colors ${tab === id ? "border-cyan text-cyan" : "border-transparent text-muted hover:text-fg"}`}
                >
                  <Icon size={16} />
                  {label}
                </button>
              ))}
            </nav>
            <div className="flex items-center justify-between gap-3 py-6">
              <div>
                <h2 className="font-display text-2xl font-bold">{currentTab.label}</h2>
                <p className="mt-1 text-sm text-muted">
                  {tab === "overview"
                    ? "Actividad y estado de la plataforma"
                    : tab === "income"
                      ? "Pagos registrados en la plataforma"
                      : "Consulta y gestiona los registros"}
                </p>
              </div>
              <button
                type="button"
                className={button}
                onClick={refresh}
                disabled={loading || busy}
                aria-label="Actualizar datos"
              >
                <RefreshCw size={16} />
                <span className="hidden sm:inline">Actualizar</span>
              </button>
            </div>
            {error && (
              <div className="mb-4">
                <ErrorBox message={error} />
              </div>
            )}
            {(tab === "users" || tab === "clips" || tab === "comments") && (
              <div className="mb-5">
                <SearchBox
                  value={search}
                  onChange={setSearch}
                  onSubmit={submitSearch}
                  placeholder={
                    tab === "users"
                      ? "Nombre, usuario o correo"
                      : tab === "clips"
                        ? "Buscar clips o autores"
                        : "Buscar comentarios o usuarios"
                  }
                />
              </div>
            )}
            {tab === "comments" && (
              <label className="mb-5 flex min-h-11 items-center gap-2 text-sm font-semibold text-muted">
                <input
                  type="checkbox"
                  checked={onlyReported}
                  onChange={(event) => setOnlyReported(event.target.checked)}
                  className="size-4 accent-cyan"
                />{" "}
                Solo comentarios reportados
              </label>
            )}
            {tab === "reports" && (
              <div className="mb-5 flex flex-wrap gap-2">
                {(
                  [
                    ["pending", "Pendientes"],
                    ["resolved", "Resueltos"],
                    ["all", "Todos"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setReportStatus(id)}
                    aria-pressed={reportStatus === id}
                    className={`${button} ${reportStatus === id ? "border-cyan/50 bg-cyan/10 text-cyan" : "text-muted"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
            {loading ? (
              <Loading />
            ) : (
              !error && (
                <>
                  {tab === "overview" && overview && <OverviewView data={overview} />}
                  {tab === "users" && users && (
                    <>
                      <div className="grid gap-3">
                        {users.users.length ? (
                          users.users.map((user) => (
                            <button
                              key={user.id}
                              type="button"
                              onClick={() => setSelectedUser(user.id)}
                              className={`${panel} flex min-w-0 items-center justify-between gap-4 p-4 text-left transition-colors hover:border-cyan/40`}
                            >
                              <div className="min-w-0">
                                <p className="truncate font-semibold">
                                  {user.displayName || user.username || user.email || user.id}
                                </p>
                                <p className="mt-1 truncate text-sm text-muted">
                                  {user.email || user.id}
                                  {user.username ? ` · @${user.username}` : ""}
                                </p>
                              </div>
                              <div className="flex shrink-0 items-center gap-2">
                                <Badge danger={!!user.blockedAt || user.disabled}>
                                  {user.blockedAt || user.disabled
                                    ? "Bloqueado"
                                    : roles[user.role] || user.role}
                                </Badge>
                                <ChevronRight size={17} className="text-muted" />
                              </div>
                            </button>
                          ))
                        ) : (
                          <Empty>No se encontraron usuarios.</Empty>
                        )}
                      </div>
                      <div className="mt-4 flex items-center justify-between gap-3">
                        <button
                          className={button}
                          disabled={pageTokens.length <= 1}
                          onClick={() => setPageTokens((tokens) => tokens.slice(0, -1))}
                        >
                          <ChevronLeft size={16} /> Anterior
                        </button>
                        <span className="text-xs text-muted">Página {pageTokens.length}</span>
                        <button
                          className={button}
                          disabled={!users.nextPageToken}
                          onClick={() => {
                            if (users.nextPageToken)
                              setPageTokens((tokens) => [...tokens, users.nextPageToken!]);
                          }}
                        >
                          Siguiente <ChevronRight size={16} />
                        </button>
                      </div>
                    </>
                  )}
                  {tab === "clips" &&
                    clips &&
                    (clips.length ? (
                      <div className="grid gap-3">
                        {clips.map((clip) => (
                          <ClipCard key={clip.id} clip={clip} busy={busy} mutate={mutate} />
                        ))}
                      </div>
                    ) : (
                      <Empty>No se encontraron clips.</Empty>
                    ))}
                  {tab === "comments" &&
                    comments &&
                    (comments.length ? (
                      <div className="grid gap-3">
                        {[...comments]
                          .sort((a, b) => b.reportCount - a.reportCount)
                          .map((comment) => (
                            <CommentCard
                              key={comment.path}
                              comment={comment}
                              busy={busy}
                              mutate={mutate}
                            />
                          ))}
                      </div>
                    ) : (
                      <Empty>
                        No se encontraron comentarios{onlyReported ? " reportados" : ""}.
                      </Empty>
                    ))}
                  {tab === "reports" &&
                    reports &&
                    (reports.length ? (
                      <div className="grid gap-3">
                        {reports.map((report) => (
                          <article key={report.id} className={`${panel} p-5`}>
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex flex-wrap gap-2">
                                  <Badge danger={report.status === "pending"}>
                                    {report.status === "pending" ? "Pendiente" : "Resuelto"}
                                  </Badge>
                                  <Badge>
                                    {report.target_type === "comment"
                                      ? "Comentario"
                                      : report.target_type === "clip"
                                        ? "Clip"
                                        : report.target_type}
                                  </Badge>
                                </div>
                                <p className="mt-3 font-semibold">
                                  Motivo: {reportReasons[report.reason] || report.reason}
                                </p>
                                <p className="mt-1 break-all text-sm text-muted">
                                  Contenido: {report.target_id}
                                </p>
                                <p className="mt-1 break-all text-xs text-muted">
                                  Reportado por {report.reporter_user_id} ·{" "}
                                  {date(report.created_at)}
                                </p>
                              </div>
                              {report.status === "pending" && (
                                <button
                                  className={button}
                                  disabled={busy}
                                  onClick={() =>
                                    void mutate((firebaseToken) =>
                                      resolveAdminReport({
                                        data: { firebaseToken, reportId: report.id },
                                      }),
                                    )
                                  }
                                >
                                  <CheckCircle2 size={16} /> Marcar resuelto
                                </button>
                              )}
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <Empty>No hay reportes en esta vista.</Empty>
                    ))}
                  {tab === "income" &&
                    payments &&
                    (payments.length ? (
                      <div className={`${panel} overflow-x-auto`}>
                        <table className="w-full min-w-max text-left text-sm">
                          <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
                            <tr>
                              <th className="p-4">Fecha</th>
                              <th className="p-4">Usuario</th>
                              <th className="p-4">Tipo</th>
                              <th className="p-4">Importe</th>
                              <th className="p-4">ID</th>
                            </tr>
                          </thead>
                          <tbody>
                            {payments.map((payment) => (
                              <tr key={payment.id} className="border-b border-line last:border-0">
                                <td className="p-4 text-muted">{date(payment.created_at)}</td>
                                <td className="p-4">{payment.user_id}</td>
                                <td className="p-4">{payment.type}</td>
                                <td className="p-4 font-semibold">{payment.amount}</td>
                                <td className="p-4 text-muted">{payment.id}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <Empty>No hay pagos registrados todavía.</Empty>
                    ))}
                </>
              )
            )}
            {selectedUser && (
              <UserDetails
                key={selectedUser}
                userId={selectedUser}
                selfId={firebaseUser.uid}
                call={call}
                onClose={() => setSelectedUser(null)}
                onChanged={refresh}
              />
            )}
          </>
        )}
      </div>
    </main>
  );
}

function OverviewView({ data }: { data: Overview }) {
  const metrics = [
    ["Usuarios", data.totalUsers, Users],
    ["Bloqueados", data.blockedUsers, ShieldCheck],
    ["Visualizaciones", data.views, Activity],
    ["Comentarios", data.comments, MessageSquare],
    ["Reportes pendientes", data.pendingReports, Flag],
  ] as const;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {metrics.map(([label, value, Icon]) => (
          <div key={label} className={`${panel} p-4 sm:p-5`}>
            <Icon size={18} className="text-cyan" />
            <p className="mt-4 font-display text-3xl font-bold">{value.toLocaleString("es-ES")}</p>
            <p className="mt-1 text-xs text-muted">{label}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <section className={`${panel} p-5`}>
          <h3 className="font-display text-lg font-bold">Usuarios por tipo</h3>
          <div className="mt-4 space-y-3">
            {Object.entries(data.roles).map(([role, count]) => (
              <div
                key={role}
                className="flex justify-between gap-4 border-b border-line pb-3 last:border-0 last:pb-0"
              >
                <span className="text-sm text-muted">{roles[role] || role}</span>
                <span className="font-semibold">{count.toLocaleString("es-ES")}</span>
              </div>
            ))}
          </div>
        </section>
        <section className={`${panel} p-5 lg:col-span-2`}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-display text-lg font-bold">Actividad reciente</h3>
            <span className="text-xs text-muted">Últimos 14 días · UTC</span>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="pb-3">Fecha</th>
                  <th className="pb-3 text-right">Nuevos usuarios</th>
                  <th className="pb-3 text-right">Nuevos clips</th>
                </tr>
              </thead>
              <tbody>
                {[...data.daily].reverse().map((day) => (
                  <tr key={day.date} className="border-t border-line">
                    <td className="py-2 text-muted">{day.date}</td>
                    <td className="py-2 text-right">{day.users}</td>
                    <td className="py-2 text-right">{day.clips}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

function UserDetails({
  userId,
  selfId,
  call,
  onClose,
  onChanged,
}: {
  userId: string;
  selfId: string;
  call: TokenCall;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [user, setUser] = useState<UserDetail | null>(null);
  const [role, setRole] = useState<"user" | "creator" | "company">("user");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    void call((firebaseToken) => getAdminUser({ data: { firebaseToken, userId } }))
      .then((result) => {
        if (active) {
          setUser(result);
          if (result.role === "user" || result.role === "creator" || result.role === "company")
            setRole(result.role);
        }
      })
      .catch((err) => {
        if (active) setError(errorMessage(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [call, userId, revision]);
  const run = async (fn: (token: string) => Promise<unknown>, deleted = false) => {
    setBusy(true);
    setError("");
    try {
      await call(fn);
      onChanged();
      if (deleted) onClose();
      else setRevision((value) => value + 1);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  const toggleBlock = () => {
    if (reason.trim().length < 3) {
      setError("Escribe un motivo de al menos 3 caracteres.");
      return;
    }
    if (!user) return;
    const blocking = !user.blockedAt && !user.disabled;
    if (
      blocking &&
      !window.confirm(`¿Bloquear la cuenta de ${user.email || user.displayName || userId}?`)
    ) return;
    void run((firebaseToken) =>
      setAdminUserBlocked({
        data: {
          firebaseToken,
          userId,
          blocked: blocking,
          reason: reason.trim(),
          confirm: blocking,
        },
      }),
    );
  };
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-bg/80 p-0 sm:items-center sm:p-6"
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-detail-title"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl border border-line bg-surface p-5 shadow-2xl sm:rounded-2xl sm:p-7"
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-cyan">Usuario</p>
            <h2 id="user-detail-title" className="mt-1 font-display text-2xl font-bold">
              Detalle de cuenta
            </h2>
          </div>
          <button className={button} onClick={onClose} disabled={busy} aria-label="Cerrar detalle">
            <X size={18} />
          </button>
        </div>
        {error && (
          <div className="mt-5">
            <ErrorBox message={error} />
          </div>
        )}
        {loading ? (
          <Loading />
        ) : (
          user && (
            <div className="mt-5 space-y-5">
              <div className="rounded-xl border border-line bg-bg-elevated p-4">
                <p className="font-semibold">
                  {user.displayName || user.username || user.email || user.id}
                </p>
                <p className="mt-1 break-all text-sm text-muted">
                  {user.email || "Sin correo"} · {user.id}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge danger={!!user.blockedAt || user.disabled}>
                    {user.blockedAt || user.disabled ? "Bloqueado" : "Activo"}
                  </Badge>
                  <Badge>{user.emailVerified ? "Correo verificado" : "Correo no verificado"}</Badge>
                  {userId === selfId && <Badge>Tu cuenta</Badge>}
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-muted">Registro</dt>
                    <dd>{date(user.createdAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Último acceso</dt>
                    <dd>{date(user.lastSignInAt)}</dd>
                  </div>
                  {user.profile.city && (
                    <div>
                      <dt className="text-muted">Ciudad</dt>
                      <dd>{user.profile.city}</dd>
                    </div>
                  )}
                  {user.profile.bio && (
                    <div className="col-span-2">
                      <dt className="text-muted">Biografía</dt>
                      <dd className="break-words">{user.profile.bio}</dd>
                    </div>
                  )}
                </dl>
                {user.blockedReason && (
                  <p className="mt-3 text-sm text-muted">
                    Motivo del bloqueo: {user.blockedReason}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="admin-role" className="mb-2 block text-sm font-semibold">
                  Tipo de cuenta
                </label>
                <div className="flex gap-2">
                  <select
                    id="admin-role"
                    className={input}
                    value={role}
                    onChange={(event) => setRole(event.target.value as typeof role)}
                  >
                    <option value="user">Usuario</option>
                    <option value="creator">Creador</option>
                    <option value="company">Empresa</option>
                  </select>
                  <button
                    className={button}
                    disabled={busy || role === user.role}
                    onClick={() =>
                      void run((firebaseToken) =>
                        setAdminUserRole({ data: { firebaseToken, userId, role } }),
                      )
                    }
                  >
                    Guardar
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="admin-block-reason" className="mb-2 block text-sm font-semibold">
                  Motivo de bloqueo o desbloqueo
                </label>
                <input
                  id="admin-block-reason"
                  className={input}
                  maxLength={300}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Describe el motivo"
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    className={button}
                    disabled={busy || (userId === selfId && !user.blockedAt && !user.disabled)}
                    onClick={toggleBlock}
                  >
                    {user.blockedAt || user.disabled ? "Desbloquear" : "Bloquear"}
                  </button>
                  <button
                    className={`${button} text-danger`}
                    disabled={busy || userId === selfId}
                    onClick={() => {
                      if (
                        window.confirm("¿Eliminar esta cuenta? Esta acción no se puede deshacer.")
                      )
                        void run(
                          (firebaseToken) =>
                            deleteAdminUser({ data: { firebaseToken, userId, confirm: true } }),
                          true,
                        );
                    }}
                  >
                    Eliminar usuario
                  </button>
                </div>
                {userId === selfId && (
                  <p className="mt-2 text-xs text-muted">
                    No puedes bloquear ni eliminar tu propia cuenta.
                  </p>
                )}
              </div>
              <div>
                <h3 className="font-semibold">Actividad administrativa</h3>
                {user.audit.length ? (
                  <ul className="mt-2 space-y-2">
                    {user.audit.map((entry) => (
                      <li key={entry.id} className="flex justify-between gap-3 text-sm">
                        <span className="break-all text-muted">{entry.action}</span>
                        <span className="shrink-0 text-muted">{date(entry.created_at)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-muted">Sin actividad registrada.</p>
                )}
              </div>
            </div>
          )
        )}
      </section>
    </div>
  );
}

function ClipCard({
  clip,
  busy,
  mutate,
}: {
  clip: Clip;
  busy: boolean;
  mutate: (fn: (token: string) => Promise<unknown>) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const act = (action: Action) => {
    if (
      action === "delete" &&
      !window.confirm(
        clip.deletedAt
          ? "¿Reintentar el borrado del archivo de este clip?"
          : "¿Eliminar este clip y su archivo? Esta acción no se puede deshacer.",
      )
    )
      return;
    void mutate((firebaseToken) =>
      setAdminClipModeration({
        data: {
          firebaseToken,
          clipId: clip.id,
          action,
          reason: reason.trim(),
          confirm: action === "delete",
        },
      }),
    );
  };
  return (
    <article className={`${panel} p-5`}>
      <div className="flex flex-wrap justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <Badge danger={!!clip.deletedAt || !!clip.hiddenAt}>
              {clip.deletedAt ? "Eliminado" : clip.hiddenAt ? "Oculto" : "Visible"}
            </Badge>
            <Badge>{clip.views.toLocaleString("es-ES")} visualizaciones</Badge>
          </div>
          <p className="mt-3 break-words font-semibold">{clip.caption || "Sin descripción"}</p>
          <p className="mt-1 break-all text-sm text-muted">
            {clip.authorName || clip.authorId || "Autor desconocido"} · {date(clip.createdAt)} ·{" "}
            {clip.id}
          </p>
          {clip.hiddenReason && (
            <p className="mt-2 text-sm text-muted">Motivo: {clip.hiddenReason}</p>
          )}
        </div>
      </div>
      {clip.deletedAt ? (
        <div className="mt-4">
          <button
            className={`${button} text-danger`}
            disabled={busy}
            onClick={() => act("delete")}
          >
            Reintentar borrado del archivo
          </button>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="sr-only">Motivo de moderación del clip</span>
            <input
              className={input}
              value={reason}
              maxLength={300}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Motivo de moderación (opcional)"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {clip.hiddenAt ? (
              <button className={button} disabled={busy} onClick={() => act("restore")}>
                Restaurar
              </button>
            ) : (
              <button className={button} disabled={busy} onClick={() => act("hide")}>
                Ocultar
              </button>
            )}
            <button
              className={`${button} text-danger`}
              disabled={busy}
              onClick={() => act("delete")}
            >
              Eliminar
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
function CommentCard({
  comment,
  busy,
  mutate,
}: {
  comment: Comment;
  busy: boolean;
  mutate: (fn: (token: string) => Promise<unknown>) => Promise<void>;
}) {
  const [reason, setReason] = useState<Reason>("offensive");
  const act = (action: Action) => {
    if (action === "delete" && !window.confirm("¿Eliminar este comentario?")) return;
    void mutate((firebaseToken) =>
      setAdminCommentModeration({
        data: {
          firebaseToken,
          commentPath: comment.path,
          action,
          reason,
          confirm: action === "delete",
        },
      }),
    );
  };
  return (
    <article className={`${panel} p-5`}>
      <div className="flex flex-wrap gap-2">
        <Badge danger={!!comment.deletedAt || !!comment.hiddenAt}>
          {comment.deletedAt ? "Eliminado" : comment.hiddenAt ? "Oculto" : "Visible"}
        </Badge>
        {comment.reportCount > 0 && (
          <Badge danger>
            {comment.reportCount} {comment.reportCount === 1 ? "reporte" : "reportes"}
          </Badge>
        )}
        {comment.reviewFlagged && <Badge danger>Revisar palabras</Badge>}
      </div>
      <p className="mt-3 break-words font-semibold">{comment.text || "Comentario vacío"}</p>
      <p className="mt-1 break-all text-sm text-muted">
        {comment.username ? `@${comment.username}` : comment.authorId || "Autor desconocido"} · Clip{" "}
        {comment.clipId} · {date(comment.createdAt)}
      </p>
      {comment.hiddenReason && (
        <p className="mt-2 text-sm text-muted">Motivo: {comment.hiddenReason}</p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <label className="min-w-48 flex-1">
          <span className="sr-only">Motivo de moderación</span>
          <select
            className={input}
            value={reason}
            onChange={(event) => setReason(event.target.value as Reason)}
          >
            {Object.entries(reasons).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        {comment.hiddenAt || comment.deletedAt ? (
          <button className={button} disabled={busy} onClick={() => act("restore")}>
            Restaurar
          </button>
        ) : (
          <button className={button} disabled={busy} onClick={() => act("hide")}>
            Ocultar
          </button>
        )}
        {!comment.deletedAt && (
          <button className={`${button} text-danger`} disabled={busy} onClick={() => act("delete")}>
            Eliminar
          </button>
        )}
      </div>
    </article>
  );
}
