import {
  collection,
  doc,
  limit,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  type DocumentData,
} from "firebase/firestore";
import { getFirebaseAuth, getFirebaseFirestore } from "@/lib/firebase/client";

export type ProductSurveySummary = {
  boughtYes: number;
  boughtNo: number;
  ratingCount: number;
  ratingAverage: number;
  mine?: { bought: boolean; qualityPrice?: number };
};

export function subscribeProductSurveys(
  productId: string,
  onData: (summary: ProductSurveySummary) => void,
  onError?: (error: Error) => void,
): () => void {
  const uid = getFirebaseAuth().currentUser?.uid;
  return onSnapshot(
    query(collection(getFirebaseFirestore(), "product-insights", productId, "surveys"), limit(1000)),
    (snapshot) => {
      const summary: ProductSurveySummary = { boughtYes: 0, boughtNo: 0, ratingCount: 0, ratingAverage: 0 };
      let ratingSum = 0;
      snapshot.forEach((entry) => {
        const data = entry.data();
        const quality = typeof data.qualityPrice === "number" ? data.qualityPrice : undefined;
        if (data.bought === true) {
          summary.boughtYes += 1;
          if (quality && quality >= 1 && quality <= 5) {
            summary.ratingCount += 1;
            ratingSum += quality;
          }
        } else {
          summary.boughtNo += 1;
        }
        if (entry.id === uid) summary.mine = { bought: data.bought === true, qualityPrice: quality };
      });
      summary.ratingAverage = summary.ratingCount ? ratingSum / summary.ratingCount : 0;
      onData(summary);
    },
    (error) => onError?.(error),
  );
}

export async function submitProductSurvey(
  productId: string,
  answer: { bought: boolean; qualityPrice?: number },
): Promise<void> {
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) throw new Error("Inicia sesión para responder.");
  const qualityPrice = answer.bought ? Math.min(5, Math.max(1, Math.round(answer.qualityPrice ?? 0))) : undefined;
  if (answer.bought && !answer.qualityPrice) throw new Error("Elige una puntuación de calidad-precio.");
  await setDoc(doc(getFirebaseFirestore(), "product-insights", productId, "surveys", uid), {
    userId: uid,
    bought: answer.bought,
    ...(qualityPrice ? { qualityPrice } : {}),
    updatedAt: serverTimestamp(),
  });
}

export const PRODUCT_ADVANTAGES = [
  "Buena calidad",
  "Materiales resistentes",
  "Fácil de usar",
] as const;

export const PRODUCT_ISSUES = [
  "Empaque mejorable",
  "Atención lenta",
] as const;

export type ProductInsightSummary = {
  productId: string;
  advantages: Record<(typeof PRODUCT_ADVANTAGES)[number], number>;
  issues: Record<(typeof PRODUCT_ISSUES)[number], number>;
  totalFeedback: number;
};

export type ProductFeedbackSelection = {
  advantages: string[];
  issues: string[];
};

function countersFor<T extends readonly string[]>(labels: T, value?: unknown): Record<T[number], number> {
  const source = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return Object.fromEntries(
    labels.map((label) => {
      const count = source[label];
      return [label, typeof count === "number" && Number.isFinite(count) ? Math.max(0, count) : 0];
    }),
  ) as Record<T[number], number>;
}

export function emptyProductInsight(productId: string): ProductInsightSummary {
  return {
    productId,
    advantages: countersFor(PRODUCT_ADVANTAGES),
    issues: countersFor(PRODUCT_ISSUES),
    totalFeedback: 0,
  };
}

function summaryFromDocument(productId: string, data?: DocumentData): ProductInsightSummary {
  return {
    productId,
    advantages: countersFor(PRODUCT_ADVANTAGES, data?.advantages),
    issues: countersFor(PRODUCT_ISSUES, data?.issues),
    totalFeedback:
      typeof data?.totalFeedback === "number" ? Math.max(0, data.totalFeedback) : 0,
  };
}

export function subscribeProductInsights(
  productId: string,
  onData: (summary: ProductInsightSummary) => void,
  onError?: (error: Error) => void,
): () => void {
  // Firebase connection: this snapshot listens to product-insights/{productId}.
  return onSnapshot(
    doc(getFirebaseFirestore(), "product-insights", productId),
    (snapshot) =>
      onData(
        snapshot.exists()
          ? summaryFromDocument(productId, snapshot.data())
          : emptyProductInsight(productId),
      ),
    (error) => onError?.(error),
  );
}

export async function submitProductFeedback(
  productId: string,
  selection: ProductFeedbackSelection,
): Promise<void> {
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) throw new Error("Inicia sesión para enviar tu opinión.");

  const advantages = [...new Set(selection.advantages)].filter((label) =>
    PRODUCT_ADVANTAGES.includes(label as (typeof PRODUCT_ADVANTAGES)[number]),
  );
  const issues = [...new Set(selection.issues)].filter((label) =>
    PRODUCT_ISSUES.includes(label as (typeof PRODUCT_ISSUES)[number]),
  );
  const db = getFirebaseFirestore();
  const insightRef = doc(db, "product-insights", productId);
  const voteRef = doc(db, "product-insights", productId, "votes", uid);

  // Firebase connection: this transaction writes product-insights/{productId} and votes/{uid} atomically.
  await runTransaction(db, async (transaction) => {
    const [insightSnapshot, voteSnapshot] = await Promise.all([
      transaction.get(insightRef),
      transaction.get(voteRef),
    ]);
    const current = summaryFromDocument(
      productId,
      insightSnapshot.exists() ? insightSnapshot.data() : undefined,
    );
    const previous = voteSnapshot.exists() ? voteSnapshot.data() : {};
    const previousAdvantages = new Set<string>(previous.advantages ?? []);
    const previousIssues = new Set<string>(previous.issues ?? []);
    const nextAdvantages = new Set(advantages);
    const nextIssues = new Set(issues);

    const advantageCounts = countersFor(PRODUCT_ADVANTAGES, current.advantages);
    const issueCounts = countersFor(PRODUCT_ISSUES, current.issues);
    for (const label of PRODUCT_ADVANTAGES) {
      advantageCounts[label] = Math.max(
        0,
        advantageCounts[label] - Number(previousAdvantages.has(label)) + Number(nextAdvantages.has(label)),
      );
    }
    for (const label of PRODUCT_ISSUES) {
      issueCounts[label] = Math.max(
        0,
        issueCounts[label] - Number(previousIssues.has(label)) + Number(nextIssues.has(label)),
      );
    }

    transaction.set(insightRef, {
      productId,
      advantages: advantageCounts,
      issues: issueCounts,
      totalFeedback: current.totalFeedback + Number(!voteSnapshot.exists()),
      updatedAt: serverTimestamp(),
    });
    transaction.set(voteRef, {
      productId,
      userId: uid,
      advantages,
      issues,
      updatedAt: serverTimestamp(),
    });
  });
}