import { cn } from "../../lib/cn";
import { GradientButton } from "../ui";

export interface PremiumUpsellCardProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  onPress?: () => void;
  className?: string;
}

/** Home-rail premium upsell card with the gradient CTA. */
export function PremiumUpsellCard({
  title = "Unlock all learning with Premium",
  description = "Get smarter, faster.",
  actionLabel = "Explore Premium",
  onPress,
  className,
}: PremiumUpsellCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-accent-soft p-5",
        className,
      )}
    >
      <p className="text-3xl" aria-hidden>
        ✨
      </p>
      <p className="mt-2 font-bold text-foreground">{title}</p>
      <p className="text-sm text-muted">{description}</p>
      <GradientButton fullWidth className="mt-4" onPress={onPress}>
        {actionLabel}
      </GradientButton>
    </div>
  );
}
