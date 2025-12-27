import { useState } from "react";
import Navigation from "@/components/Navigation";
import LabourForm from "@/components/LabourForm";
import LabourList from "@/components/LabourList";

const Index = () => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleLabourAdded = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-8">
      <Navigation />
      
      <main className="container mx-auto px-4 py-6 md:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 max-w-7xl mx-auto">
          <LabourForm onLabourAdded={handleLabourAdded} />
          <LabourList refreshTrigger={refreshTrigger} />
        </div>
      </main>

      <footer className="py-6 border-t border-border">
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
