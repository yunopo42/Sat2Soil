import { ComingSoon } from "@/components/shell/coming-soon";

export default function Page({ params }: PageProps<"/[locale]/fields/[id]/planning/rotation">) {
  return <ComingSoon params={params} section="rotation" phase={5} />;
}
