import { createFileRoute } from "@tanstack/react-router";
import { ClipsApp } from "@/components/clips-app";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <ClipsApp />;
}
