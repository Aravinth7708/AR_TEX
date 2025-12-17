import { Scissors } from "lucide-react";

const Header = () => {
  return (
    <header className="gradient-primary py-6 px-4 sm:px-8">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
            <Scissors className="w-6 h-6 text-amber" />
          </div>
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-primary-foreground tracking-tight">
              AR TEXTILES
            </h1>
            <p className="text-primary-foreground/70 text-sm">
              Labour Salary Calculator
            </p>
          </div>
        </div>
        <div className="hidden sm:block text-right">
          <p className="text-primary-foreground/60 text-xs uppercase tracking-wider">
            Garment Manufacturing
          </p>
          <p className="text-amber font-semibold">Stitching Division</p>
        </div>
      </div>
    </header>
  );
};

export default Header;
