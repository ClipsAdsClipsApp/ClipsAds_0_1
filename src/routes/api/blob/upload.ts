import { issueSignedToken } from "@vercel/blob";
import {
  handleUploadPresigned,
  type HandleUploadPresignedBody,
} from "@vercel/blob/client";
import { createFileRoute } from "@tanstack/react-router";

const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
const VIDEO_CONTENT_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-m4v",
  "video/ogg",
  "video/3gpp",
];
class UploadAuthorizationError extends Error {}

async function authenticatedUid(request: Request): Promise<string> {
  const authorization = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(authorization);
  if (!match) throw new UploadAuthorizationError();

  const { getFirebaseAdmin } = await import("@/lib/admin/firebase.server");
  const { auth, db } = getFirebaseAdmin();
  let identity: Awaited<ReturnType<typeof auth.verifyIdToken>>;
  try {
    identity = await auth.verifyIdToken(match[1], true);
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? error.code : "";
    if (typeof code === "string" && code.startsWith("auth/")) {
      throw new UploadAuthorizationError();
    }
    throw error;
  }
  const status = await db.collection("user_status").doc(identity.uid).get();
  if (status.get("blocked") === true) throw new UploadAuthorizationError();
  return identity.uid;
}

function validateUploadPath(pathname: string, uid: string): void {
  const [folder, owner, filename, ...extra] = pathname.split("/");
  if (
    folder !== "clips" ||
    owner !== uid ||
    extra.length !== 0 ||
    !/^[a-zA-Z0-9_-]+\.(mp4|webm|mov|m4v|ogg|3gp)$/i.test(filename ?? "")
  ) {
    throw new UploadAuthorizationError();
  }
}

export const Route = createFileRoute("/api/blob/upload")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as HandleUploadPresignedBody;
          const result = await handleUploadPresigned({
            body,
            request,
            getSignedToken: async (pathname) => {
              const uid = await authenticatedUid(request);
              validateUploadPath(pathname, uid);
              const validUntil = Date.now() + 10 * 60 * 1000;
              const token = await issueSignedToken({
                pathname,
                operations: ["put"],
                allowedContentTypes: VIDEO_CONTENT_TYPES,
                maximumSizeInBytes: MAX_VIDEO_BYTES,
                validUntil,
              });
              return {
                token,
                urlOptions: {
                  allowedContentTypes: VIDEO_CONTENT_TYPES,
                  maximumSizeInBytes: MAX_VIDEO_BYTES,
                  validUntil,
                  addRandomSuffix: false,
                  allowOverwrite: false,
                  cacheControlMaxAge: 30 * 24 * 60 * 60,
                },
              };
            },
          });
          return Response.json(result);
        } catch (error) {
          if (error instanceof UploadAuthorizationError) {
            return Response.json({ error: "No autorizado para subir este video." }, { status: 401 });
          }
          console.error("[blob] Video upload authorization failed.", error);
          return Response.json({ error: "No se pudo preparar la subida del video." }, { status: 500 });
        }
      },
    },
  },
});
