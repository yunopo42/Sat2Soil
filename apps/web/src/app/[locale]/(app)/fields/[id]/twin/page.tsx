import { ComingSoon } from "@/components/shell/coming-soon";

export default function Page({ params }: PageProps<"/[locale]/fields/[id]/twin">) {
  return <ComingSoon params={params} section="twin" phase={6} />;
}
