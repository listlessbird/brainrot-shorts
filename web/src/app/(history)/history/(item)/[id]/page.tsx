import { validateRequest } from "@/lib/auth";
import { GenerationViewer } from "@/app/(history)/_components/generation-viewer";

export default async function Generation(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;

  const { id } = params;

  await validateRequest();

  return (
    <div className="max-w-4xl mx-auto">
      <GenerationViewer generationId={id} />
    </div>
  );
}
