import { useEffect, useState } from "react";
import { Plus, Trash2, Edit, User, Phone, DollarSign, Search, Info, TrendingUp, Wallet, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import Navigation from "@/components/Navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

type LabourProfile = Database['public']['Tables']['labour_profiles']['Row'];
type SalaryHistory = Database['public']['Tables']['labour_salary_history']['Row'];

const LabourProfilePage = () => {
  const [labours, setLabours] = useState<LabourProfile[]>([]);
  const [filteredLabours, setFilteredLabours] = useState<LabourProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLabour, setEditingLabour] = useState<LabourProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewingLabour, setViewingLabour] = useState<LabourProfile | null>(null);
  const [isInfoDialogOpen, setIsInfoDialogOpen] = useState(false);
  const [isSalaryDialogOpen, setIsSalaryDialogOpen] = useState(false);
  const [salaryHistory, setSalaryHistory] = useState<SalaryHistory[]>([]);
  const [filteredSalaryHistory, setFilteredSalaryHistory] = useState<SalaryHistory[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<string>("all");
  const [availableWeeks, setAvailableWeeks] = useState<{ label: string; value: string; start: Date; end: Date }[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [salaryFormData, setSalaryFormData] = useState({
    weekly_salary: 0,
    weekly_advance: 0,
    advance_paid: 0,
    week_start_date: "",
    week_end_date: "",
    notes: "",
  });
  const [formData, setFormData] = useState({
    name: "",
    phone_number: "",
  });

  // Helper function to get week start (Wednesday) and end (Tuesday) dates
  const getWeekDates = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
    
    // Calculate days to subtract to get to previous Wednesday
    let diff;
    if (day >= 3) {
      diff = day - 3; // Days since Wednesday
    } else {
      diff = day + 4; // Days since last Wednesday (going back through previous week)
    }
    
    const wednesday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - diff);
    wednesday.setHours(0, 0, 0, 0);
    
    const tuesday = new Date(wednesday);
    tuesday.setDate(wednesday.getDate() + 6);
    tuesday.setHours(23, 59, 59, 999);
    
    return {
      start: wednesday.toISOString().split('T')[0],
      end: tuesday.toISOString().split('T')[0],
      startDate: wednesday,
      endDate: tuesday,
    };
  };

  // Format date range for display
  const formatDateRange = (start: Date, end: Date) => {
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return `${start.toLocaleDateString('en-IN', options)} - ${end.toLocaleDateString('en-IN', options)}, ${end.getFullYear()}`;
  };

  const fetchSalaryHistory = async (labourId: string) => {
    try {
      const { data, error } = await supabase
        .from("labour_salary_history")
        .select("*")
        .eq("labour_profile_id", labourId)
        .order("week_start_date", { ascending: false });

      if (error) {
        // If table doesn't exist, silently set empty history
        if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
          console.warn("Salary history table not yet created. Please run migration.");
          setSalaryHistory([]);
          setFilteredSalaryHistory([]);
          setAvailableWeeks([]);
          return;
        }
        throw error;
      }
      const historyData = data || [];
      setSalaryHistory(historyData);
      
      // Generate available weeks from data
      generateAvailableWeeksFromHistory(historyData);
      
      // Filter based on selected week
      filterSalaryHistoryByWeek(historyData, selectedWeek);
    } catch (error) {
      console.error("Error fetching salary history:", error);
      // Don't show error toast for missing table
      setSalaryHistory([]);
      setFilteredSalaryHistory([]);
      setAvailableWeeks([]);
    }
  };

  const generateAvailableWeeksFromHistory = (data: SalaryHistory[]) => {
    if (data.length === 0) {
      setAvailableWeeks([]);
      return;
    }

    const weeks: { label: string; value: string; start: Date; end: Date }[] = [];
    const currentWeek = getWeekDates(new Date());
    
    // Add "All Weeks" option
    weeks.push({
      label: "All Weeks",
      value: "all",
      start: new Date(0),
      end: new Date(),
    });

    // Get unique weeks from data
    const weekMap = new Map<string, { start: Date; end: Date }>();
    
    data.forEach(history => {
      const weekStart = new Date(history.week_start_date);
      const weekEnd = new Date(history.week_end_date);
      const weekKey = `${weekStart.toISOString()}_${weekEnd.toISOString()}`;
      
      if (!weekMap.has(weekKey)) {
        weekMap.set(weekKey, { start: weekStart, end: weekEnd });
      }
    });

    // Convert map to array and sort by date (most recent first)
    const sortedWeeks = Array.from(weekMap.values())
      .sort((a, b) => b.start.getTime() - a.start.getTime())
      .map((range) => {
        const isCurrentWeek = range.start.getTime() === currentWeek.startDate.getTime();
        return {
          label: isCurrentWeek 
            ? `Current Week (${formatDateRange(range.start, range.end)})`
            : formatDateRange(range.start, range.end),
          value: `${range.start.toISOString()}_${range.end.toISOString()}`,
          start: range.start,
          end: range.end
        };
      });

    setAvailableWeeks([...weeks, ...sortedWeeks]);
  };

  const filterSalaryHistoryByWeek = (data: SalaryHistory[], weekValue: string) => {
    if (weekValue === "all") {
      setFilteredSalaryHistory(data);
      return;
    }
    
    const [startStr, endStr] = weekValue.split('_');
    const weekStart = new Date(startStr);
    const weekEnd = new Date(endStr);
    
    const filteredData = data.filter(history => {
      const historyStart = new Date(history.week_start_date);
      const historyEnd = new Date(history.week_end_date);
      // Check if the history week overlaps with selected week
      return historyStart.getTime() <= weekEnd.getTime() && historyEnd.getTime() >= weekStart.getTime();
    });
    
    setFilteredSalaryHistory(filteredData);
  };

  // Effect to re-filter when selectedWeek changes
  useEffect(() => {
    if (salaryHistory.length > 0) {
      filterSalaryHistoryByWeek(salaryHistory, selectedWeek);
    } else {
      setFilteredSalaryHistory([]);
    }
  }, [selectedWeek, salaryHistory]);

  const fetchLabours = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("labour_profiles")
        .select("*")
        .order("name", { ascending: true });

      if (error) {
        console.error("Supabase error:", error);
        throw error;
      }

      setLabours(data || []);
      setFilteredLabours(data || []);
    } catch (error) {
      console.error("Error fetching labours:", error);
      toast.error(`Failed to load labour profiles: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLabours();
  }, []);

  // Filter labours based on search query
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredLabours(labours);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = labours.filter(
        (labour) =>
          labour.name.toLowerCase().includes(query) ||
          (labour.phone_number && labour.phone_number.includes(query))
      );
      setFilteredLabours(filtered);
    }
  }, [searchQuery, labours]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Please enter labour name");
      return;
    }

    if (!formData.phone_number.trim()) {
      toast.error("Please enter a phone number");
      return;
    }

    if (!/^[0-9]{10}$/.test(formData.phone_number)) {
      toast.error("Please enter a valid 10-digit phone number");
      return;
    }

    try {
      if (editingLabour) {
        const { error } = await supabase
          .from("labour_profiles")
          .update({
            name: formData.name.trim(),
            phone_number: formData.phone_number.trim(),
          })
          .eq("id", editingLabour.id);

        if (error) throw error;
        toast.success("Labour profile updated successfully");
      } else {
        const { error } = await supabase
          .from("labour_profiles")
          .insert({
            name: formData.name.trim(),
            phone_number: formData.phone_number.trim(),
          });

        if (error) {
          if (error.code === '23505') {
            toast.error("A labour with this name already exists");
          } else {
            throw error;
          }
          return;
        }
        toast.success("Labour profile created successfully");
      }

      setFormData({
        name: "",
        phone_number: "",
      });
      setEditingLabour(null);
      setIsDialogOpen(false);
      fetchLabours();
    } catch (error: any) {
      console.error("Error saving labour:", error);
      const errorMessage = error?.message || error?.error_description || "Unknown error";
      toast.error(`Failed to save labour profile: ${errorMessage}`);
    }
  };

  const handleEdit = (labour: LabourProfile) => {
    setEditingLabour(labour);
    setFormData({
      name: labour.name,
      phone_number: labour.phone_number || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("labour_profiles")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Labour profile deleted successfully");
      fetchLabours();
    } catch (error) {
      console.error("Error deleting labour:", error);
      toast.error("Failed to delete labour profile");
    }
  };

  const handleUpdateSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!viewingLabour) return;

    try {
      // Insert or update in salary history
      const { error } = await supabase
        .from("labour_salary_history")
        .upsert({
          labour_profile_id: viewingLabour.id,
          week_start_date: salaryFormData.week_start_date,
          week_end_date: salaryFormData.week_end_date,
          weekly_salary: salaryFormData.weekly_salary,
          weekly_advance: salaryFormData.weekly_advance,
          advance_paid: salaryFormData.advance_paid,
          notes: salaryFormData.notes,
        }, {
          onConflict: 'labour_profile_id,week_start_date'
        });

      if (error) {
        // Check if table doesn't exist
        if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
          toast.error("Database table not created. Please run the SQL migration first.", {
            description: "Check SALARY_TRACKING_SETUP.md for instructions",
            duration: 5000,
          });
          return;
        }
        throw error;
      }

      toast.success("Salary details saved successfully");
      setIsSalaryDialogOpen(false);
      await fetchSalaryHistory(viewingLabour.id);
      setIsInfoDialogOpen(true);
    } catch (error) {
      console.error("Error updating salary:", error);
      toast.error("Failed to update salary details");
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingLabour(null);
    setFormData({
      name: "",
      phone_number: "",
    });
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-8">
      <Navigation />

      <main className="container mx-auto px-4 py-6 md:py-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header Section */}
          <div className="card-elevated p-4 md:p-6">
            <div className="flex flex-col gap-4">
              {/* Title and Button Row */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                    Labour Profiles
                  </h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    Manage labour contact information and salary rates
                  </p>
                </div>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2 w-full sm:w-auto" onClick={() => handleDialogClose()}>
                      <Plus className="w-4 h-4" />
                      Add Labour Profile
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>
                        {editingLabour ? "Edit Labour Profile" : "Add New Labour Profile"}
                      </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Labour Name *</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                          }
                          placeholder="Enter labour name"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phone_number">Phone Number *</Label>
                        <Input
                          id="phone_number"
                          type="tel"
                          maxLength={10}
                          value={formData.phone_number}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, "");
                            setFormData({ ...formData, phone_number: value });
                          }}
                          placeholder="10-digit phone number"
                          required
                        />
                      </div>

                      <div className="flex gap-2 pt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleDialogClose}
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                        <Button type="submit" className="flex-1">
                          {editingLabour ? "Update" : "Create"} Profile
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Search Bar */}
              <div className="flex items-center gap-2 w-full sm:w-96">
                <Search className="w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or phone number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 gap-4">
            <div className="card-elevated p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-500/10 rounded-lg">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Labours</p>
                  <p className="text-2xl font-bold text-foreground">
                    {labours.length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Labour Profiles Grid */}
          <div className="card-elevated p-4 md:p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredLabours.length === 0 ? (
              <div className="text-center py-12">
                <User className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">
                  {searchQuery ? "No labours found matching your search" : "No labour profiles yet"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {!searchQuery && 'Click "Add Labour Profile" to create the first profile'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredLabours.map((labour) => (
                  <Card key={labour.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <div className="p-2 bg-blue-500/10 rounded-lg">
                            <User className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{labour.name}</CardTitle>
                            <CardDescription className="text-xs">
                              ID: {labour.id.slice(0, 8)}...
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              setViewingLabour(labour);
                              await fetchSalaryHistory(labour.id);
                              setIsInfoDialogOpen(true);
                            }}
                            className="h-8 w-8 p-0"
                          >
                            <Info className="w-4 h-4 text-blue-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(labour)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Labour Profile?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete the profile for {labour.name}. 
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(labour.id)}
                                  className="bg-destructive hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {labour.phone_number || "No phone number"}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Salary Info Dialog - Comprehensive View */}
      <Dialog open={isInfoDialogOpen} onOpenChange={(open) => {
        setIsInfoDialogOpen(open);
        if (!open) {
          setSalaryHistory([]);
          setFilteredSalaryHistory([]);
          setAvailableWeeks([]);
          setSelectedWeek("all");
        }
      }}>
        <DialogContent className="w-full max-w-[95vw] sm:max-w-4xl h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2 border-b">
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg md:text-xl">
              <User className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />
              <span className="truncate">{viewingLabour?.name} - Complete Profile</span>
            </DialogTitle>
          </DialogHeader>
          
          {viewingLabour && (
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
              <div className="space-y-4">
              {/* Contact Information */}
              <Card className="border">
                <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
                  <CardTitle className="text-sm sm:text-base md:text-lg flex items-center gap-2">
                    <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
                    <span>Contact Information</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 px-3 sm:px-6 pb-3 sm:pb-6">
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-0.5 sm:gap-2">
                    <span className="text-xs sm:text-sm text-muted-foreground">Name:</span>
                    <span className="font-medium text-xs sm:text-sm md:text-base break-words">{viewingLabour.name}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-0.5 sm:gap-2">
                    <span className="text-xs sm:text-sm text-muted-foreground">Phone Number:</span>
                    <span className="font-medium text-xs sm:text-sm md:text-base">{viewingLabour.phone_number || "Not provided"}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-0.5 sm:gap-2">
                    <span className="text-xs sm:text-sm text-muted-foreground">Profile Created:</span>
                    <span className="font-medium text-xs sm:text-sm md:text-base">
                      {new Date(viewingLabour.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Summary Cards Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                <Card className="border-blue-500/20 bg-blue-500/5">
                  <CardContent className="p-2.5 sm:p-3 md:p-4">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 sm:p-2 bg-blue-500/10 rounded-lg flex-shrink-0">
                        <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 text-blue-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] sm:text-xs text-muted-foreground">Total Records</p>
                        <p className="text-base sm:text-lg md:text-xl font-bold text-foreground">
                          {salaryHistory.length}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-green-500/20 bg-green-500/5">
                  <CardContent className="p-2.5 sm:p-3 md:p-4">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 sm:p-2 bg-green-500/10 rounded-lg flex-shrink-0">
                        <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 text-green-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                          {selectedWeek !== "all" ? "Week Salary" : "Total Salary"}
                        </p>
                        <p className="text-base sm:text-lg md:text-xl font-bold text-foreground truncate">
                          ₹{filteredSalaryHistory.reduce((sum, h) => sum + (h.weekly_salary || 0), 0).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-orange-500/20 bg-orange-500/5">
                  <CardContent className="p-2.5 sm:p-3 md:p-4">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 sm:p-2 bg-orange-500/10 rounded-lg flex-shrink-0">
                        <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 text-orange-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                          {selectedWeek !== "all" ? "Week Advance" : "Total Advance"}
                        </p>
                        <p className="text-base sm:text-lg md:text-xl font-bold text-foreground truncate">
                          ₹{filteredSalaryHistory.reduce((sum, h) => sum + (h.weekly_advance || 0), 0).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Salary History Table */}
              <Card>
                <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3">
                    <CardTitle className="text-sm sm:text-base md:text-lg flex items-center gap-2">
                      <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 flex-shrink-0" />
                      <span>Weekly Salary History</span>
                    </CardTitle>
                    {availableWeeks.length > 0 && (
                      <Select value={selectedWeek} onValueChange={setSelectedWeek}>
                        <SelectTrigger className="w-full sm:w-[240px] md:w-[280px] h-8 sm:h-9 text-xs sm:text-sm">
                          <SelectValue placeholder="Select week" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableWeeks.map((week) => (
                            <SelectItem key={week.value} value={week.value} className="text-xs sm:text-sm">
                              {week.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  {salaryHistory.length > 0 && (
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-2">
                      Showing {filteredSalaryHistory.length} of {salaryHistory.length} record(s)
                    </p>
                  )}
                </CardHeader>
                <CardContent className="px-0 sm:px-6 pb-3 sm:pb-6">
                  {salaryHistory.length === 0 ? (
                    <div className="text-center py-6 sm:py-8 text-muted-foreground px-4">
                      <Calendar className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 opacity-50" />
                      <p className="font-medium text-xs sm:text-sm">No salary history recorded yet</p>
                      <p className="text-[10px] sm:text-xs mt-1">Salary history is automatically created when you add labours</p>
                      <div className="mt-3 sm:mt-4 p-2 sm:p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-[10px] sm:text-xs text-left max-w-md mx-auto">
                        <p className="font-medium text-blue-700 dark:text-blue-400 mb-1">📝 Note:</p>
                        <p className="text-muted-foreground">
                          If you see errors, make sure to run the database migration:<br/>
                          <code className="text-[10px] sm:text-xs bg-muted px-1 py-0.5 rounded">20251227_create_salary_history.sql</code>
                        </p>
                      </div>
                    </div>
                  ) : filteredSalaryHistory.length === 0 ? (
                    <div className="text-center py-6 sm:py-8 text-muted-foreground px-4">
                      <Calendar className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 opacity-50" />
                      <p className="font-medium text-xs sm:text-sm">No records for selected week</p>
                      <p className="text-[10px] sm:text-xs mt-1">Try selecting a different week</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto -mx-4 sm:mx-0">
                      <div className="min-w-[600px]">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="min-w-[120px] text-xs sm:text-sm">Week Period</TableHead>
                              <TableHead className="text-right min-w-[90px] text-xs sm:text-sm">Salary</TableHead>
                              <TableHead className="text-right min-w-[90px] text-xs sm:text-sm">Advance</TableHead>
                              <TableHead className="text-right min-w-[90px] text-xs sm:text-sm">Paid Back</TableHead>
                              <TableHead className="text-right min-w-[100px] text-xs sm:text-sm">Net Balance</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredSalaryHistory.map((history) => (
                              <TableRow key={history.id}>
                                <TableCell className="font-medium">
                                  <div className="text-xs sm:text-sm">
                                    {new Date(history.week_start_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                    {' - '}
                                    {new Date(history.week_end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                  </div>
                                </TableCell>
                                <TableCell className="text-right text-green-600 font-medium text-xs sm:text-sm">
                                  ₹{history.weekly_salary.toFixed(2)}
                                </TableCell>
                                <TableCell className="text-right text-orange-600 font-medium text-xs sm:text-sm">
                                  ₹{history.weekly_advance.toFixed(2)}
                                </TableCell>
                                <TableCell className="text-right text-blue-600 font-medium text-xs sm:text-sm">
                                  ₹{history.advance_paid.toFixed(2)}
                                </TableCell>
                                <TableCell className={`text-right font-bold text-xs sm:text-sm ${
                                  history.net_balance >= 0 ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  ₹{history.net_balance.toFixed(2)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
              </div>
            </div>
          )}
          
          {viewingLabour && (
            <div className="border-t px-4 sm:px-6 py-3 sm:py-4">
              <Button 
                onClick={() => setIsInfoDialogOpen(false)} 
                variant="outline"
                className="w-full sm:w-auto sm:ml-auto sm:flex text-sm"
              >
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Update Salary Dialog - Hidden, kept for potential future edit functionality */}
      <Dialog open={false} onOpenChange={setIsSalaryDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              {salaryFormData.week_start_date ? 'Edit' : 'Add'} Weekly Salary - {viewingLabour?.name}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleUpdateSalary} className="space-y-4">
            {/* Week Selection */}
            <Card className="border-2 border-purple-500/20 bg-purple-500/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Week Period</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="week_start_date" className="text-xs">Start Date (Monday)</Label>
                    <Input
                      id="week_start_date"
                      type="date"
                      value={salaryFormData.week_start_date}
                      onChange={(e) => {
                        const startDate = new Date(e.target.value);
                        const endDate = new Date(startDate);
                        endDate.setDate(startDate.getDate() + 6);
                        setSalaryFormData({ 
                          ...salaryFormData, 
                          week_start_date: e.target.value,
                          week_end_date: endDate.toISOString().split('T')[0]
                        });
                      }}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="week_end_date" className="text-xs">End Date (Sunday)</Label>
                    <Input
                      id="week_end_date"
                      type="date"
                      value={salaryFormData.week_end_date}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      const weekDates = getWeekDates(new Date());
                      setSalaryFormData({
                        ...salaryFormData,
                        week_start_date: weekDates.start,
                        week_end_date: weekDates.end,
                      });
                    }}
                  >
                    Current Week
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      const lastWeek = new Date();
                      lastWeek.setDate(lastWeek.getDate() - 7);
                      const weekDates = getWeekDates(lastWeek);
                      setSalaryFormData({
                        ...salaryFormData,
                        week_start_date: weekDates.start,
                        week_end_date: weekDates.end,
                      });
                    }}
                  >
                    Last Week
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Salary Details */}
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="weekly_salary" className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  Weekly Salary (₹)
                </Label>
                <Input
                  id="weekly_salary"
                  type="number"
                  step="0.01"
                  min="0"
                  value={salaryFormData.weekly_salary}
                  onChange={(e) =>
                    setSalaryFormData({ 
                      ...salaryFormData, 
                      weekly_salary: parseFloat(e.target.value) || 0 
                    })
                  }
                  placeholder="Enter weekly salary"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="weekly_advance" className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-orange-600" />
                  Weekly Advance (₹)
                </Label>
                <Input
                  id="weekly_advance"
                  type="number"
                  step="0.01"
                  min="0"
                  value={salaryFormData.weekly_advance}
                  onChange={(e) =>
                    setSalaryFormData({ 
                      ...salaryFormData, 
                      weekly_advance: parseFloat(e.target.value) || 0 
                    })
                  }
                  placeholder="Enter weekly advance"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="advance_paid" className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-green-600" />
                  Advance Paid Back (₹)
                </Label>
                <Input
                  id="advance_paid"
                  type="number"
                  step="0.01"
                  min="0"
                  value={salaryFormData.advance_paid}
                  onChange={(e) =>
                    setSalaryFormData({ 
                      ...salaryFormData, 
                      advance_paid: parseFloat(e.target.value) || 0 
                    })
                  }
                  placeholder="Enter advance paid"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={salaryFormData.notes}
                  onChange={(e) =>
                    setSalaryFormData({ 
                      ...salaryFormData, 
                      notes: e.target.value 
                    })
                  }
                  placeholder="Add any notes or remarks..."
                  rows={3}
                />
              </div>
            </div>

            {/* Preview Balance */}
            <Card className="border-purple-500/20 bg-purple-500/5">
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Salary:</span>
                    <span className="font-medium text-green-600">+₹{salaryFormData.weekly_salary.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Advance:</span>
                    <span className="font-medium text-orange-600">-₹{salaryFormData.weekly_advance.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Paid Back:</span>
                    <span className="font-medium text-blue-600">+₹{salaryFormData.advance_paid.toFixed(2)}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-bold">
                    <span>Net Balance:</span>
                    <span className={
                      (salaryFormData.weekly_salary - salaryFormData.weekly_advance + salaryFormData.advance_paid) >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }>
                      ₹{(salaryFormData.weekly_salary - salaryFormData.weekly_advance + salaryFormData.advance_paid).toFixed(2)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsSalaryDialogOpen(false);
                  setIsInfoDialogOpen(true);
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1">
                Save Changes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LabourProfilePage;
