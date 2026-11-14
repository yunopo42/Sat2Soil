import { ComingSoon } from "@/components/shell/coming-soon";

export default function Page({ params }: PageProps<"/[locale]/fields/[id]/summary">) {
  return <ComingSoon params={params} section="summary" phase={9} />;
}
