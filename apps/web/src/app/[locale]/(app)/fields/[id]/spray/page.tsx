import { ComingSoon } from "@/components/shell/coming-soon";

export default function Page({ params }: PageProps<"/[locale]/fields/[id]/spray">) {
  return <ComingSoon params={params} section="spray" phase={7} />;
}
