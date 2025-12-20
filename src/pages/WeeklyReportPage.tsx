import { useState } from "react";
import Navigation from "@/components/Navigation";
import WeeklyReport from "@/components/WeeklyReport";

const WeeklyReportPage = () => {
  return (
    <div className="min-h-screen bg-background pb-20 md:pb-8">
      <Navigation />
      
      <main className="container mx-auto px-4 py-6 md:py-8">
        <WeeklyReport />
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

export default WeeklyReportPage;
