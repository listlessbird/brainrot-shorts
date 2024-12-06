import { validateRequest } from "@/lib/auth";
import { GenerationViewer } from "@/app/(history)/_components/generation-viewer";

export default async function Generation(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;

  const { id } = params;

  await validateRequest();

  return (
    <>
      <GenerationViewer generationId={id} />
    </>
  );
}
