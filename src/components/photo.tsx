import { cn } from "@/lib/utils";

export function Photo({
  src,
  className,
  onClick,
}: {
  src?: string;
  className?: string;
  onClick?: () => void;
}) {
  if (!src) return <div aria-hidden onClick={onClick} className={cn("bg-surface-2", className)} />;
  return <img src={src} alt="" className={className} onClick={onClick} />;
}
