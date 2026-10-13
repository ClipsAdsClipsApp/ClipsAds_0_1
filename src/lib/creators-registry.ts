import type { Creator } from "@/lib/types";

/** Autores de clips compartidos (otros usuarios), rellenado desde Firestore. */
export const remoteCreators = new Map<string, Creator>();
