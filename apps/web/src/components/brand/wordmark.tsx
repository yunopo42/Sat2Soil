import Image from "next/image";
import { cn } from "@/lib/cn";
import logoDevice from "../../../public/images/logo-device.png";

/**
 * Sat2Soil logo: "Sat" + the "2" field device (from the team's logo artwork, docs/design/brand)
 * + "Soil", standing on a soil strip. Text stays live for accessibility and crisp rendering.
 */
export function Wordmark({ size = "md", className }: { size?: "sm" | "md" | "lg"; className?: string }) {
  const text = { sm: "text-[22px]", md: "text-[28px]", lg: "text-[40px]" }[size];
  const device = { sm: "h-[34px]", md: "h-[44px]", lg: "h-[62px]" }[size];
  const strip = { sm: "h-[6px]", md: "h-[8px]", lg: "h-[11px]" }[size];

  return (
    <span role="img" className={cn("relative inline-flex flex-col items-stretch", className)} aria-label="Sat2Soil">
      <span aria-hidden="true" className={cn("flex items-end font-extrabold leading-none tracking-tight text-navy-900", text)}>
        <span className="pb-[0.12em]">Sat</span>
        <Image src={logoDevice} alt="" priority className={cn("-mx-[0.04em] w-auto translate-y-[18%]", device)} />
        <span className="pb-[0.12em]">Soil</span>
      </span>
      <span aria-hidden="true" className={cn("soil-strip -mt-[2px] rounded-[2px]", strip)} />
    </span>
  );
}
