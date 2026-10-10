import { createFileRoute } from "@tanstack/react-router";
import { ClipsAds } from "@/components/clips-app";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <ClipsAds />;
}
