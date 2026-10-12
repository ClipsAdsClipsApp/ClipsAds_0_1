import { issueSignedToken } from "@vercel/blob";
import {
  handleUploadPresigned,
  type HandleUploadPresignedBody,
} from "@vercel/blob/client";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { createFileRoute } from "@tanstack/react-router";

const FIREBASE_PROJECT_ID = import.meta.env.VITE_FIREBASE_PROJECT_ID;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
const VIDEO_CONTENT_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-m4v",
  "video/ogg",
  "video/3gpp",
];
const FIREBASE_JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"),
);

class UploadAuthorizationError extends Error {}

async function authenticatedUid(request: Request): Promise<string> {
  const authorization = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(authorization);
  if (!match || !FIREBASE_PROJECT_ID) throw new UploadAuthorizationError();

  try {
    const { payload } = await jwtVerify(match[1], FIREBASE_JWKS, {
      algorithms: ["RS256"],
      issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
      audience: FIREBASE_PROJECT_ID,
      requiredClaims: ["sub", "iat", "exp"],
    });
    if (typeof payload.sub !== "string" || !payload.sub) {
      throw new UploadAuthorizationError();
    }
    return payload.sub;
  } catch {
    throw new UploadAuthorizationError();
  }
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
