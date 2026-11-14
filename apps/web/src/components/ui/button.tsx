import { Slot } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-green-600 text-white hover:bg-green-700",
  secondary: "border border-line bg-surface text-ink hover:border-line-strong hover:bg-surface-2",
  ghost: "text-ink hover:bg-surface-2",
  danger: "border border-line bg-surface text-red-700 hover:border-red-700/30 hover:bg-red-50",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-xs [&_svg]:size-3.5",
  md: "h-10 px-4 text-sm [&_svg]:size-4",
  lg: "h-12 px-5 text-sm [&_svg]:size-4.5",
};

export type ButtonProps = ComponentProps<"button"> & {
  variant?: Variant;
  size?: Size;
  /** Render the single child (e.g. a Link) with button styling. */
  asChild?: boolean;
};

/** One primary button per view; everything else is secondary or ghost. */
export function Button({
  variant = "secondary",
  size = "md",
  asChild = false,
  className,
  type,
  ...props
}: ButtonProps) {
  const Component = asChild ? Slot.Root : "button";
  return (
    <Component
      type={asChild ? undefined : (type ?? "button")}
      className={cn(
        "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium",
        "transition-[background-color,border-color,color,scale] duration-150 ease-out-soft active:scale-[0.98]",
        "disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
