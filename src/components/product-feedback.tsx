import { useEffect, useState, type CSSProperties } from "react";
import { Check, LoaderCircle, X } from "lucide-react";
import {
  emptyProductInsight,
  PRODUCT_ADVANTAGES,
  PRODUCT_ISSUES,
  submitProductFeedback,
  subscribeProductInsights,
  type ProductInsightSummary,
} from "@/lib/firebase/product-insights";
import { cn } from "@/lib/utils";

export function PostPurchaseFeedback({
  productId,
  productName,
  onClose,
}: {
  productId: string;
  productName: string;
  onClose: () => void;
}) {
  const [advantages, setAdvantages] = useState<string[]>([]);
  const [issues, setIssues] = useState<string[]>([]);
  const [status, setStatus] = useState<"form" | "saving" | "thanks">("form");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "thanks") return;
    const timeout = window.setTimeout(onClose, 2000);
    return () => window.clearTimeout(timeout);
  }, [onClose, status]);

  function toggle(label: string, selected: string[], update: (next: string[]) => void) {
    update(selected.includes(label) ? selected.filter((item) => item !== label) : [...selected, label]);
  }

  async function submit() {
    setStatus("saving");
    setError(null);
    try {
      // Firebase connection: this transaction saves the user's selections and updates the shared counters.
      await submitProductFeedback(productId, { advantages, issues });
      setStatus("thanks");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo guardar tu opinión.");
      setStatus("form");
    }
  }

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget && status !== "saving") onClose();
      }}
    >
      <section
        aria-labelledby="purchase-feedback-title"
        aria-modal="true"
        className="rise-in max-h-[88%] w-full max-w-md overflow-auto rounded-2xl border border-white/10 bg-surface p-5 shadow-2xl"
        role="dialog"
      >
        {status === "thanks" ? (
          <div className="grid min-h-56 place-items-center text-center">
            <div>
              <span className="mx-auto mb-3 grid size-12 place-items-center rounded-full bg-mint/15 text-mint">
                <Check size={24} />
              </span>
              <h2 className="font-display text-lg font-bold">¡Gracias por compartir!</h2>
              <p className="mt-1 text-sm text-muted">Tu opinión ayuda a la comunidad a elegir mejor.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase text-mint">Compra confirmada</p>
                <h2 id="purchase-feedback-title" className="mt-1 font-display text-lg font-bold">
                  ¿Qué destacarías?
                </h2>
                <p className="mt-1 truncate text-xs text-muted">{productName}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={status === "saving"}
                aria-label="Cerrar"
                className="grid size-9 shrink-0 place-items-center rounded-full text-muted hover:bg-fg/5 disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            <FeedbackChips
              title="Ventajas"
              labels={PRODUCT_ADVANTAGES}
              selected={advantages}
              onToggle={(label) => toggle(label, advantages, setAdvantages)}
            />
            <FeedbackChips
              title="Detalles a mejorar (opcional)"
              labels={PRODUCT_ISSUES}
              selected={issues}
              onToggle={(label) => toggle(label, issues, setIssues)}
              issue
            />

            {error ? <p role="alert" className="mb-3 text-xs text-danger">{error}</p> : null}
            <button
              type="button"
              onClick={() => void submit()}
              disabled={status === "saving" || (advantages.length === 0 && issues.length === 0)}
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-mint to-cyan px-4 py-3 text-sm font-extrabold text-bg disabled:cursor-not-allowed disabled:opacity-45"
            >
              {status === "saving" ? <LoaderCircle size={17} className="animate-spin" /> : null}
              {status === "saving" ? "Guardando…" : "Enviar y continuar"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={status === "saving"}
              className="mt-2 w-full py-2 text-xs font-semibold text-muted"
            >
              Ahora no
            </button>
          </>
        )}
      </section>
    </div>
  );
}

function FeedbackChips({
  title,
  labels,
  selected,
  onToggle,
  issue = false,
}: {
  title: string;
  labels: readonly string[];
  selected: string[];
  onToggle: (label: string) => void;
  issue?: boolean;
}) {
  return (
    <fieldset className="mb-4">
      <legend className="mb-2 text-xs font-bold">{title}</legend>
      <div className="flex flex-wrap gap-2">
        {labels.map((label) => {
          const active = selected.includes(label);
          return (
            <button
              key={label}
              type="button"
              aria-pressed={active}
              onClick={() => onToggle(label)}
              className={cn(
                "rounded-full border px-3 py-2 text-xs font-semibold transition-colors",
                active
                  ? issue
                    ? "border-pink bg-pink/15 text-pink"
                    : "border-mint bg-mint/15 text-mint"
                  : "border-line bg-bg-elevated text-muted hover:text-fg",
              )}
            >
              {label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function CommunityInsightsModal({
  open,
  productId,
  productName,
  onClose,
}: {
  open: boolean;
  productId: string;
  productName: string;
  onClose: () => void;
}) {
  const [summary, setSummary] = useState<ProductInsightSummary>(() => emptyProductInsight(productId));
  const [loading, setLoading] = useState(open);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(false);
    // Firebase connection: this live listener reads the aggregate document for the selected product.
    return subscribeProductInsights(
      productId,
      (next) => {
        setSummary(next);
        setLoading(false);
      },
      () => {
        setError(true);
        setLoading(false);
      },
    );
  }, [open, productId]);

  if (!open) return null;
  const advantageRows = Object.entries(summary.advantages).sort((a, b) => b[1] - a[1]);
  const issueRows = Object.entries(summary.issues).sort((a, b) => b[1] - a[1]);

  return (
    <div
      className="absolute inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        aria-labelledby="community-insights-title"
        aria-modal="true"
        className="rise-in max-h-[82%] w-full overflow-auto rounded-t-2xl border border-white/10 bg-surface px-5 pb-[calc(18px+env(safe-area-inset-bottom))] pt-4 sm:max-w-md sm:rounded-2xl sm:pb-5"
        role="dialog"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase text-cyan">Opinión real</p>
            <h2 id="community-insights-title" className="mt-1 font-display text-lg font-bold">
              Opinión de la comunidad
            </h2>
            <p className="mt-1 truncate text-xs text-muted">{productName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar opinión de la comunidad"
            className="grid size-9 shrink-0 place-items-center rounded-full text-muted hover:bg-fg/5"
          >
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div className="grid min-h-40 place-items-center text-sm text-muted">Cargando opiniones…</div>
        ) : error ? (
          <p role="alert" className="py-8 text-center text-sm text-muted">
            No se pudieron cargar las opiniones de la comunidad.
          </p>
        ) : summary.totalFeedback === 0 ? (
          <p className="py-8 text-center text-sm text-muted">
            Aún no hay opiniones de compras confirmadas para este producto.
          </p>
        ) : (
          <>
            <p className="mb-4 text-xs text-muted">
              Basado en {summary.totalFeedback} {summary.totalFeedback === 1 ? "compra" : "compras"}.
            </p>
            <InsightSection
              title="Ventajas principales"
              rows={advantageRows}
              total={summary.totalFeedback}
              accent="mint"
            />
            <InsightSection
              title="Detalles a tener en cuenta"
              rows={issueRows}
              total={summary.totalFeedback}
              accent="pink"
            />
          </>
        )}
      </section>
    </div>
  );
}

function InsightSection({
  title,
  rows,
  total,
  accent,
}: {
  title: string;
  rows: [string, number][];
  total: number;
  accent: "mint" | "pink";
}) {
  return (
    <section className="mb-5 last:mb-0">
      <h3 className="mb-3 text-xs font-bold">{title}</h3>
      <div className="space-y-3">
        {rows.map(([label, count]) => {
          const percentage = Math.round((count / total) * 100);
          return (
            <div key={label}>
              <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                <span className="truncate text-fg">{label}</span>
                <span className={accent === "mint" ? "shrink-0 text-mint" : "shrink-0 text-pink"}>
                  {percentage}%
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-fg/10">
                <div
                  className={cn(
                    "h-full rounded-full",
                    accent === "mint" ? "bg-mint" : "bg-pink",
                    "w-[var(--bar-width)]",
                  )}
                  style={{ "--bar-width": `${percentage}%` } as CSSProperties}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}