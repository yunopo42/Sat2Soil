import { ComingSoon } from "@/components/shell/coming-soon";

export default function Page({ params }: PageProps<"/[locale]/fields/[id]/planning/water">) {
  return <ComingSoon params={params} section="water" phase={5} />;
}
