import { Scissors, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const Header = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string>("");

  useEffect(() => {
    const user = localStorage.getItem("artextiles_user") || "User";
    setUserId(user);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("artextiles_auth");
    localStorage.removeItem("artextiles_user");
    localStorage.removeItem("artextiles_last_activity");
    toast.success("Logged out successfully");
    navigate("/login");
  };

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
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="hidden md:block text-right">
            <p className="text-primary-foreground/60 text-xs uppercase tracking-wider">
              Garment Manufacturing
            </p>
            <p className="text-amber font-semibold">Stitching Division</p>
          </div>
          <Button 
            onClick={handleLogout} 
            variant="outline"
            size="sm"
            className="bg-white/90 text-primary hover:bg-white hover:text-primary border-white/20 font-medium"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full hover:bg-accent/20">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-accent text-accent-foreground">
                    {userId.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">User {userId}</p>
                  <p className="text-xs leading-none text-muted-foreground">AR Textiles Admin</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default Header;
