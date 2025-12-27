import { useEffect, useState } from "react";
import { Plus, Trash2, Edit, Calendar, DollarSign, CheckCircle2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import Navigation from "@/components/Navigation";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type LabourAdvance = Database['public']['Tables']['labour_advances']['Row'];

const LabourAdvancePage = () => {
  const [advances, setAdvances] = useState<LabourAdvance[]>([]);
  const [allAdvances, setAllAdvances] = useState<LabourAdvance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAdvance, setEditingAdvance] = useState<LabourAdvance | null>(null);
  const [activeTab, setActiveTab] = useState<string>("active");
  const [selectedWeek, setSelectedWeek] = useState<string>("current");
  const [availableWeeks, setAvailableWeeks] = useState<{ label: string; value: string; start: Date; end: Date }[]>([]);
  const [formData, setFormData] = useState({
    labour_name: "",
    advance_amount: "",
    advance_date: new Date().toISOString().split("T")[0],
    notes: "",
  });


  // Helper function to get week start and end dates (Wednesday to Tuesday)
  const getWeekRange = (date: Date) => {
    const d = new Date(date); // Create copy to avoid mutation
    const day = d.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday

    // Calculate days to subtract to get to previous Wednesday
    // If today is Wed (3), diff = 0
    // If today is Thu (4), diff = 1
    // If today is Tue (2), diff = 6 (go back to previous Wed)
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

    return { start: wednesday, end: tuesday };
  };

  // Get current week
  const getCurrentWeek = () => getWeekRange(new Date());

  // Format date for display
  const formatDateRange = (start: Date, end: Date) => {
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return `${start.toLocaleDateString('en-IN', options)} - ${end.toLocaleDateString('en-IN', options)}, ${end.getFullYear()}`;
  };

  // Generate available weeks from data
  const generateAvailableWeeks = (data: LabourAdvance[]) => {
    const weeks: { label: string; value: string; start: Date; end: Date }[] = [];
    const currentWeek = getCurrentWeek();

    // Always add current week, even if no data
    weeks.push({
      label: `Current Week (${formatDateRange(currentWeek.start, currentWeek.end)})`,
      value: "current",
      start: currentWeek.start,
      end: currentWeek.end
    });

    // If no data, still set the current week
    if (data.length === 0) {
      setAvailableWeeks(weeks);
      return;
    }

    // Get unique weeks from data
    const weekMap = new Map<string, { start: Date; end: Date }>();

    data.forEach(advance => {
      const createdDate = new Date(advance.advance_date);
      const weekRange = getWeekRange(createdDate);
      const weekKey = `${weekRange.start.toISOString()}_${weekRange.end.toISOString()}`;

      // Don't add current week again
      if (createdDate >= currentWeek.start && createdDate <= currentWeek.end) {
        return;
      }

      if (!weekMap.has(weekKey)) {
        weekMap.set(weekKey, weekRange);
      }
    });

    // Convert map to array and sort by date (most recent first)
    const pastWeeks = Array.from(weekMap.values())
      .sort((a, b) => b.start.getTime() - a.start.getTime())
      .map((range, index) => ({
        label: `Week ${index + 1} - ${formatDateRange(range.start, range.end)}`,
        value: `${range.start.toISOString()}_${range.end.toISOString()}`,
        start: range.start,
        end: range.end
      }));

    setAvailableWeeks([...weeks, ...pastWeeks]);
  };

  // Filter advances by week
  const filterAdvancesByWeek = (data: LabourAdvance[], weekValue: string) => {
    let filteredData: LabourAdvance[];

    if (weekValue === "current") {
      const currentWeek = getCurrentWeek();
      filteredData = data.filter(advance => {
        const createdDate = new Date(advance.advance_date);
        const createdTime = createdDate.getTime();
        return createdTime >= currentWeek.start.getTime() && createdTime <= currentWeek.end.getTime();
      });
    } else {
      const [startStr, endStr] = weekValue.split('_');
      const weekStart = new Date(startStr);
      const weekEnd = new Date(endStr);

      filteredData = data.filter(advance => {
        const createdDate = new Date(advance.advance_date);
        const createdTime = createdDate.getTime();
        return createdTime >= weekStart.getTime() && createdTime <= weekEnd.getTime();
      });
    }

    setAdvances(filteredData);
  };

  const fetchAdvances = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("labour_advances")
        .select("*")
        .order("advance_date", { ascending: false });

      if (error) {
        console.error("Supabase error:", error);
        throw error;
      }

      setAllAdvances(data || []);

      // Generate available weeks from data
      generateAvailableWeeks(data || []);

      // Filter data based on selected week
      filterAdvancesByWeek(data || [], selectedWeek);
    } catch (error) {
      console.error("Error fetching advances:", error);
      toast.error(`Failed to load advances: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdvances();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refetch when week selection changes
  useEffect(() => {
    if (allAdvances.length > 0) {
      filterAdvancesByWeek(allAdvances, selectedWeek);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWeek]);

  // Filter advances into active (unpaid) and paid
  const activeAdvances = advances.filter(
    (advance) => (advance.advance_amount - (advance.paid_amount || 0)) > 0
  );
  const paidAdvances = advances.filter(
    (advance) => (advance.advance_amount - (advance.paid_amount || 0)) <= 0
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.labour_name.trim()) {
      toast.error("Please enter labour name");
      return;
    }

    if (!formData.advance_amount || parseFloat(formData.advance_amount) <= 0) {
      toast.error("Please enter a valid advance amount");
      return;
    }

    try {
      if (editingAdvance) {
        const { error } = await supabase
          .from("labour_advances")
          .update({
            labour_name: formData.labour_name.trim(),
            advance_amount: parseFloat(formData.advance_amount),
            advance_date: new Date(formData.advance_date).toISOString(),
            notes: formData.notes.trim() || null,
          })
          .eq("id", editingAdvance.id);

        if (error) throw error;
        toast.success("Advance updated successfully");
      } else {
        const { error } = await supabase
          .from("labour_advances")
          .insert({
            labour_name: formData.labour_name.trim(),
            advance_amount: parseFloat(formData.advance_amount),
            advance_date: new Date(formData.advance_date).toISOString(),
            notes: formData.notes.trim() || null,
          });

        if (error) throw error;
        toast.success("Advance added successfully");
      }

      setFormData({
        labour_name: "",
        advance_amount: "",
        advance_date: new Date().toISOString().split("T")[0],
        notes: "",
      });
      setEditingAdvance(null);
      setIsDialogOpen(false);
      fetchAdvances();
    } catch (error) {
      console.error("Error saving advance:", error);
      toast.error("Failed to save advance");
    }
  };

  const handleEdit = (advance: LabourAdvance) => {
    setEditingAdvance(advance);
    setFormData({
      labour_name: advance.labour_name,
      advance_amount: advance.advance_amount.toString(),
      advance_date: new Date(advance.advance_date).toISOString().split("T")[0],
      notes: advance.notes || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("labour_advances")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Advance deleted successfully");
      fetchAdvances();
    } catch (error) {
      console.error("Error deleting advance:", error);
      toast.error("Failed to delete advance");
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingAdvance(null);
    setFormData({
      labour_name: "",
      advance_amount: "",
      advance_date: new Date().toISOString().split("T")[0],
      notes: "",
    });
  };

  const getTotalAdvances = () => {
    return advances.reduce((sum, advance) => sum + Number(advance.advance_amount), 0);
  };

  const getTotalPaid = () => {
    return advances.reduce((sum, advance) => sum + (Number(advance.paid_amount) || 0), 0);
  };

  const getTotalBalance = () => {
    return advances.reduce((sum, advance) => {
      const balance = Number(advance.advance_amount) - (Number(advance.paid_amount) || 0);
      return sum + balance;
    }, 0);
  };

  const renderAdvancesList = (advancesList: LabourAdvance[], showActions: boolean = true) => {
    // Group advances by labour name
    const groupedAdvances = advancesList.reduce((acc, advance) => {
      const name = advance.labour_name;
      if (!acc[name]) {
        acc[name] = {
          labour_name: name,
          total_advance: 0,
          total_paid: 0,
          records: []
        };
      }
      acc[name].total_advance += Number(advance.advance_amount);
      acc[name].total_paid += Number(advance.paid_amount || 0);
      acc[name].records.push(advance);
      return acc;
    }, {} as Record<string, { labour_name: string; total_advance: number; total_paid: number; records: LabourAdvance[] }>);

    const mergedList = Object.values(groupedAdvances);

    if (mergedList.length === 0) {
      return (
        <div className="text-center py-12">
          <DollarSign className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No advances in this category</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {/* Desktop Table */}
        <div className="hidden md:block">
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left py-3 px-4 font-semibold whitespace-nowrap">Labour Name</th>
                  <th className="text-right py-3 px-4 font-semibold whitespace-nowrap">Advance</th>
                  <th className="text-right py-3 px-4 font-semibold whitespace-nowrap">Paid</th>
                  <th className="text-right py-3 px-4 font-semibold whitespace-nowrap">Balance</th>
                  <th className="text-center py-3 px-4 font-semibold whitespace-nowrap">Date</th>
                  <th className="text-left py-3 px-4 font-semibold whitespace-nowrap">Notes/Info</th>
                  {showActions && <th className="text-center py-3 px-4 font-semibold whitespace-nowrap">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {mergedList.map((group) => {
                  const paidAmount = group.total_paid;
                  const balance = group.total_advance - paidAmount;
                  const isFullyPaid = balance <= 0;
                  const isMerged = group.records.length > 1;

                  return (
                    <tr key={group.labour_name} className={`border-b border-border hover:bg-muted/50 ${isFullyPaid ? 'opacity-70' : ''}`}>
                      <td className="py-3 px-4 font-medium">{group.labour_name}</td>
                      <td className="py-3 px-4 text-right text-blue-600 font-semibold">
                        ₹{group.total_advance.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right text-orange-600 font-semibold">
                        ₹{paidAmount.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold">
                        <span className={isFullyPaid ? 'text-green-600' : 'text-red-600'}>
                          ₹{balance.toFixed(2)}
                        </span>
                        {isFullyPaid && (
                          <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                            Paid
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center text-sm text-muted-foreground whitespace-nowrap">
                        {Array.from(new Set(group.records.map(r =>
                          new Date(r.advance_date).toLocaleDateString("en-IN", { day: '2-digit', month: '2-digit' })
                        ))).join(", ")}
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <span className="truncate max-w-[150px]">
                            {isMerged ? `${group.records.length} records merged` : (group.records[0].notes || "-")}
                          </span>
                          {isMerged && (
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                  <Info className="w-4 h-4 text-blue-500" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-80">
                                <div className="space-y-3">
                                  <h4 className="font-semibold text-sm border-b pb-2">Advance History (This Week)</h4>
                                  <div className="max-h-[300px] overflow-y-auto space-y-2">
                                    {group.records.map((record, idx) => (
                                      <div key={record.id} className="text-xs p-2 bg-muted/50 rounded flex justify-between items-center group">
                                        <div className="flex-1">
                                          <p className="font-medium">{new Date(record.advance_date).toLocaleDateString("en-IN")}</p>
                                          <p className="text-blue-600">₹{Number(record.advance_amount).toFixed(2)}</p>
                                          {record.notes && <p className="text-muted-foreground italic mt-1 font-normal break-words">{record.notes}</p>}
                                        </div>
                                        {showActions && (
                                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleEdit(record)}>
                                              <Edit className="w-3 h-3" />
                                            </Button>
                                            <AlertDialog>
                                              <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                                  <Trash2 className="w-3 h-3 text-destructive" />
                                                </Button>
                                              </AlertDialogTrigger>
                                              <AlertDialogContent>
                                                <AlertDialogHeader>
                                                  <AlertDialogTitle>Delete Advance?</AlertDialogTitle>
                                                  <AlertDialogDescription>
                                                    Are you sure you want to delete this record from {new Date(record.advance_date).toLocaleDateString("en-IN")}?
                                                  </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                  <AlertDialogAction onClick={() => handleDelete(record.id)} className="bg-destructive hover:bg-destructive/90">
                                                    Delete
                                                  </AlertDialogAction>
                                                </AlertDialogFooter>
                                              </AlertDialogContent>
                                            </AlertDialog>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </PopoverContent>
                            </Popover>
                          )}
                        </div>
                      </td>
                      {showActions && (
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-2">
                            {isMerged ? (
                              <span className="text-xs text-muted-foreground">Manage via Info</span>
                            ) : (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEdit(group.records[0])}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <Trash2 className="w-4 h-4 text-destructive" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Advance?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This will permanently delete the advance record for{" "}
                                        {group.labour_name}. This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDelete(group.records[0].id)}
                                        className="bg-destructive hover:bg-destructive/90"
                                      >
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-3">
          {mergedList.map((group) => {
            const paidAmount = group.total_paid;
            const balance = group.total_advance - paidAmount;
            const isFullyPaid = balance <= 0;
            const isMerged = group.records.length > 1;

            return (
              <div key={group.labour_name} className={`border border-border rounded-lg p-3 space-y-3 ${isFullyPaid ? 'bg-muted/30' : ''}`}>
                {/* Header with Name and Actions */}
                <div className="flex justify-between items-start gap-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-base">{group.labour_name}</h3>
                    {isMerged && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="h-6 px-1.5 gap-1 text-[10px]">
                            <Info className="w-3 h-3 text-blue-500" />
                            {group.records.length} Records
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[calc(100vw-32px)] max-w-sm ml-4">
                          <div className="space-y-3">
                            <h4 className="font-semibold text-sm border-b pb-2">Advance History</h4>
                            <div className="max-h-[300px] overflow-y-auto space-y-2">
                              {group.records.map((record) => (
                                <div key={record.id} className="text-xs p-2 bg-muted/50 rounded flex justify-between items-center">
                                  <div>
                                    <p className="font-medium">{new Date(record.advance_date).toLocaleDateString("en-IN")}</p>
                                    <p className="text-blue-600 font-bold">₹{Number(record.advance_amount).toFixed(2)}</p>
                                    {record.notes && <p className="text-muted-foreground italic mt-1">{record.notes}</p>}
                                  </div>
                                  {showActions && (
                                    <div className="flex gap-1">
                                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleEdit(record)}>
                                        <Edit className="w-4 h-4" />
                                      </Button>
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                            <Trash2 className="w-4 h-4 text-destructive" />
                                          </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent className="w-[90vw] max-w-sm rounded-lg">
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>Delete Advance?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                              Delete record from {new Date(record.advance_date).toLocaleDateString("en-IN")}?
                                            </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter className="flex-row gap-2">
                                            <AlertDialogCancel className="mt-0 flex-1">Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDelete(record.id)} className="bg-destructive hover:bg-destructive/90 flex-1">
                                              Delete
                                            </AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>

                  {showActions && !isMerged && (
                    <div className="flex gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(group.records[0])}
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
                        <AlertDialogContent className="w-[90vw] max-w-sm rounded-lg">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Advance?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete the advance record for{" "}
                              {group.labour_name}.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="flex-row gap-2">
                            <AlertDialogCancel className="mt-0 flex-1">Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(group.records[0].id)}
                              className="bg-destructive hover:bg-destructive/90 flex-1"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </div>

                {/* Amount Grid */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-2 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Advance</p>
                    <p className="text-sm font-bold text-blue-600 break-words">
                      ₹{group.total_advance.toFixed(2)}
                    </p>
                  </div>
                  <div className="text-center p-2 bg-orange-50 dark:bg-orange-950 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Paid</p>
                    <p className="text-sm font-bold text-orange-600 break-words">
                      ₹{paidAmount.toFixed(2)}
                    </p>
                  </div>
                  <div className={`text-center p-2 rounded-lg ${isFullyPaid ? 'bg-green-50 dark:bg-green-950' : 'bg-red-50 dark:bg-red-950'}`}>
                    <p className="text-xs text-muted-foreground mb-1">Balance</p>
                    <p className={`text-sm font-bold break-words ${isFullyPaid ? 'text-green-600' : 'text-red-600'}`}>
                      ₹{balance.toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Status Badge */}
                {isFullyPaid && (
                  <div className="flex justify-center">
                    <span className="inline-flex items-center gap-1 text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-3 py-1 rounded-full font-medium">
                      <CheckCircle2 className="w-3 h-3" />
                      Fully Paid
                    </span>
                  </div>
                )}

                {/* Date and Notes */}
                <div className="pt-2 border-t border-border space-y-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    {Array.from(new Set(group.records.map(r =>
                      new Date(r.advance_date).toLocaleDateString("en-IN", { day: '2-digit', month: '2-digit' })
                    ))).join(", ")}
                  </div>
                  {!isMerged && group.records[0].notes && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{group.records[0].notes}</p>
                  )}
                  {isMerged && (
                    <p className="text-xs text-muted-foreground italic">{group.records.length} advances merged for this week.</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
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
                    Labour Advances
                  </h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    Manage advance payments for labours
                  </p>
                </div>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2 w-full sm:w-auto" onClick={() => handleDialogClose()}>
                      <Plus className="w-4 h-4" />
                      Add Advance
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>
                        {editingAdvance ? "Edit Advance" : "Add New Advance"}
                      </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="labour_name">Labour Name *</Label>
                        <Input
                          id="labour_name"
                          value={formData.labour_name}
                          onChange={(e) =>
                            setFormData({ ...formData, labour_name: e.target.value })
                          }
                          placeholder="Enter labour name"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="advance_amount">Advance Amount (₹) *</Label>
                        <Input
                          id="advance_amount"
                          type="number"
                          step="0.01"
                          value={formData.advance_amount}
                          onChange={(e) =>
                            setFormData({ ...formData, advance_amount: e.target.value })
                          }
                          placeholder="0.00"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="advance_date">Advance Date *</Label>
                        <Input
                          id="advance_date"
                          type="date"
                          value={formData.advance_date}
                          onChange={(e) =>
                            setFormData({ ...formData, advance_date: e.target.value })
                          }
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="notes">Notes</Label>
                        <Textarea
                          id="notes"
                          value={formData.notes}
                          onChange={(e) =>
                            setFormData({ ...formData, notes: e.target.value })
                          }
                          placeholder="Add any notes (optional)"
                          rows={3}
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
                          {editingAdvance ? "Update" : "Add"} Advance
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Calendar Week Selector */}
              {availableWeeks.length > 0 && (
                <div className="flex items-center gap-2 w-full sm:w-auto border border-border rounded-lg p-2 bg-muted/30">
                  <Calendar className="w-5 h-5 text-primary flex-shrink-0" />
                  <Select value={selectedWeek} onValueChange={setSelectedWeek}>
                    <SelectTrigger className="w-full sm:w-[280px] h-9 border-0 bg-transparent">
                      <SelectValue placeholder="Select week" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableWeeks.map((week) => (
                        <SelectItem key={week.value} value={week.value}>
                          {week.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card-elevated p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-500/10 rounded-lg">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Advances</p>
                  <p className="text-2xl font-bold text-foreground">
                    ₹{getTotalAdvances().toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            <div className="card-elevated p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-orange-500/10 rounded-lg">
                  <DollarSign className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Paid</p>
                  <p className="text-2xl font-bold text-foreground">
                    ₹{getTotalPaid().toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            <div className="card-elevated p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-500/10 rounded-lg">
                  <DollarSign className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Balance</p>
                  <p className="text-2xl font-bold text-red-600">
                    ₹{getTotalBalance().toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            <div className="card-elevated p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-500/10 rounded-lg">
                  <Calendar className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Records</p>
                  <p className="text-2xl font-bold text-foreground">{advances.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Advances List with Tabs */}
          <div className="card-elevated p-4 md:p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : advances.length === 0 ? (
              <div className="text-center py-12">
                <DollarSign className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No advances recorded yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Click "Add Advance" to create the first record
                </p>
              </div>
            ) : (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="active" className="gap-2">
                    <DollarSign className="w-4 h-4" />
                    Active Advances ({activeAdvances.length})
                  </TabsTrigger>
                  <TabsTrigger value="paid" className="gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Paid Advances ({paidAdvances.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="active" className="mt-0">
                  {renderAdvancesList(activeAdvances, true)}
                </TabsContent>

                <TabsContent value="paid" className="mt-0">
                  {renderAdvancesList(paidAdvances, false)}
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default LabourAdvancePage;
