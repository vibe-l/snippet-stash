
import SnippetManager from "@/components/SnippetManager";

const Index = () => {
  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Snippet Manager</h1>
          <p className="text-muted-foreground">Manage your text snippets with tags and search</p>
        </div>
        <SnippetManager />
      </div>
    </div>
  );
};

export default Index;
