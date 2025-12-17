import { useState } from "react";
import Header from "@/components/Header";
import LabourForm from "@/components/LabourForm";
import LabourList from "@/components/LabourList";

const Index = () => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleLabourAdded = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          <LabourForm onLabourAdded={handleLabourAdded} />
          <LabourList refreshTrigger={refreshTrigger} />
        </div>
      </main>

      <footer className="py-6 border-t border-border mt-auto">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} AR TEXTILES — Garment Manufacturing
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
