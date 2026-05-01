import { PromptArchitect } from "@/components/PromptArchitect";
import { Toaster } from "@/components/ui/toaster";

export default function Home() {
  return (
    <main className="min-h-screen">
      <PromptArchitect />
      <Toaster />
    </main>
  );
}
