import Image from "next/image";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import hero from "../../../public/images/hero-satellite-to-soil.webp";

/** "SAT2SOIL ——" letter-spaced label with a green rule (approved designs). */
export function Eyebrow({ children = "SAT2SOIL", className }: { children?: ReactNode; className?: string }) {
  return (
    <p className={cn("flex items-center gap-4 text-xs font-bold tracking-[0.32em] text-ink", className)}>
      {children}
      <span aria-hidden="true" className="h-px w-16 bg-green-600" />
    </p>
  );
}

/**
 * Page title block. `emphasis` renders in green italic after the title, as in
 * "NASA *Veri Merkezi*". `banner` adds the satellite-to-soil artwork on the right, fading into
 * the page on its left edge.
 */
export function PageHeader({
  title,
  emphasis,
  description,
  aside,
  banner = false,
  className,
}: {
  title: ReactNode;
  emphasis?: ReactNode;
  description?: ReactNode;
  aside?: ReactNode;
  banner?: boolean;
  className?: string;
}) {
  return (
    <header className={cn("relative isolate overflow-hidden", banner && "min-h-44", className)}>
      {banner ? (
        <div
          aria-hidden="true"
          className="absolute inset-y-0 right-0 -z-10 hidden w-[58%] md:block [mask-image:linear-gradient(to_right,transparent,black_38%)]"
        >
          <Image src={hero} alt="" fill sizes="60vw" className="object-cover object-[60%_35%]" priority />
        </div>
      ) : null}
      <div className="flex flex-wrap items-end justify-between gap-6 py-6">
        <div className="max-w-2xl">
          <Eyebrow />
          <h1 className="mt-4 text-xl font-extrabold tracking-tight text-ink sm:text-[2.25rem] sm:leading-[1.1]">
            {title}
            {emphasis ? (
              <>
                {" "}
                <em className="font-extrabold text-green-700">{emphasis}</em>
              </>
            ) : null}
          </h1>
          {description ? <p className="mt-3 text-base text-ink-muted">{description}</p> : null}
        </div>
        {aside ? <div className="flex shrink-0 items-center gap-3">{aside}</div> : null}
      </div>
    </header>
  );
}
