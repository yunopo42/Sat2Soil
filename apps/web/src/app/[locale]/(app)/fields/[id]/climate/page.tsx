import { ComingSoon } from "@/components/shell/coming-soon";

export default function Page({ params }: PageProps<"/[locale]/fields/[id]/climate">) {
  return <ComingSoon params={params} section="nasa" phase={4} />;
}
