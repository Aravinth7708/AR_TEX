import { useEffect, useState, useRef } from "react";
import { Users, Trash2, RefreshCw, ChevronDown, ChevronUp, Edit, Download, Calendar, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface Labour {
  id: string;
  name: string;
  pieces: number;
  quantity: number;
  rate_per_piece: number;
  total_salary: number;
  phone_number?: string;
  advance?: number;
  esi_bf_amount?: number;
  last_week_balance?: number;
  extra_amount?: number;
  created_at: string;
}

interface WorkDetail {
  id: string;
  ioNo: string;
  workType: string;
  pieces: number;
  quantity: number;
  rate_per_piece: number;
  total_salary: number;
  phone_number?: string;
  advance?: number;
  esi_bf_amount?: number;
  last_week_balance?: number;
  extra_amount?: number;
}

interface LabourListProps {
  refreshTrigger: number;
}

const LabourList = ({ refreshTrigger }: LabourListProps) => {
  const [labours, setLabours] = useState<Labour[]>([]);
  const [allLabourData, setAllLabourData] = useState<Labour[]>([]);
  const [expandedLabour, setExpandedLabour] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [labourToDelete, setLabourToDelete] = useState<string | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedLabourForPayment, setSelectedLabourForPayment] = useState<Labour | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [editingWork, setEditingWork] = useState<WorkDetail | null>(null);
  const [editValues, setEditValues] = useState({ ioNo: "", workType: "", pieces: "", rate: "", advance: "", esiBf: "", lastWeekBalance: "", extraAmount: "" });
  const downloadRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const [selectedWeek, setSelectedWeek] = useState<string>("current");
  const [availableWeeks, setAvailableWeeks] = useState<{ label: string; value: string; start: Date; end: Date }[]>([]);

  // Helper function to get week start and end dates (Monday to Sunday)
  const getWeekRange = (date: Date) => {
    const d = new Date(date); // Create copy to avoid mutation
    const day = d.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
    
    const monday = new Date(d.getFullYear(), d.getMonth(), diff);
    monday.setHours(0, 0, 0, 0);
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    
    return { start: monday, end: sunday };
  };

  // Get current week
  const getCurrentWeek = () => getWeekRange(new Date());

  // Format date for display
  const formatDateRange = (start: Date, end: Date) => {
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return `${start.toLocaleDateString('en-IN', options)} - ${end.toLocaleDateString('en-IN', options)}, ${end.getFullYear()}`;
  };

  const fetchLabours = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("labours")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Store all data with advance extracted from name
      const dataWithAdvance = (data || []).map(labour => {
        const parts = labour.name.split(' | ');
        const advance = parseFloat(parts[3] || '0');
        const esiBf = parseFloat(parts[4] || '0');
        const lastWeekBal = parseFloat(parts[5] || '0');
        const extra = parseFloat(parts[6] || '0');
        
        return { 
          ...labour, 
          advance,
          esi_bf_amount: labour.esi_bf_amount || esiBf || 0,
          last_week_balance: labour.last_week_balance || lastWeekBal || 0,
          extra_amount: labour.extra_amount || extra || 0
        };
      });
      
      setAllLabourData(dataWithAdvance);
      
      // Generate available weeks from data
      generateAvailableWeeks(dataWithAdvance);
      
      // Filter data based on selected week
      filterLaboursByWeek(dataWithAdvance, selectedWeek);
    } catch (error) {
      console.error("Error fetching labours:", error);
      toast.error("Failed to load labours");
    } finally {
      setIsLoading(false);
    }
  };

  const generateAvailableWeeks = (data: Labour[]) => {
    if (data.length === 0) {
      setAvailableWeeks([]);
      return;
    }

    const weeks: { label: string; value: string; start: Date; end: Date }[] = [];
    const currentWeek = getCurrentWeek();
    
    // Add current week
    weeks.push({
      label: `Current Week (${formatDateRange(currentWeek.start, currentWeek.end)})`,
      value: "current",
      start: currentWeek.start,
      end: currentWeek.end
    });

    // Get unique weeks from data
    const weekMap = new Map<string, { start: Date; end: Date }>();
    
    data.forEach(labour => {
      const createdDate = new Date(labour.created_at);
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

  const filterLaboursByWeek = (data: Labour[], weekValue: string) => {
    let filteredData: Labour[];
    
    if (weekValue === "current") {
      const currentWeek = getCurrentWeek();
      filteredData = data.filter(labour => {
        const createdDate = new Date(labour.created_at);
        const createdTime = createdDate.getTime();
        return createdTime >= currentWeek.start.getTime() && createdTime <= currentWeek.end.getTime();
      });
    } else {
      const [startStr, endStr] = weekValue.split('_');
      const weekStart = new Date(startStr);
      const weekEnd = new Date(endStr);
      
      filteredData = data.filter(labour => {
        const createdDate = new Date(labour.created_at);
        const createdTime = createdDate.getTime();
        return createdTime >= weekStart.getTime() && createdTime <= weekEnd.getTime();
      });
    }
    
    // Group by base labour name (before the pipe)
    const groupedData: { [key: string]: Labour } = {};
    filteredData.forEach((labour) => {
      const parts = labour.name.split(' | ');
      const baseName = parts[0];
      const phoneFromName = parts[7] && parts[7] !== 'N/A' ? parts[7] : (labour.phone_number || '');
      
      if (groupedData[baseName]) {
        groupedData[baseName].total_salary += labour.total_salary || 0;
        groupedData[baseName].advance = (groupedData[baseName].advance || 0) + (labour.advance || 0);
        groupedData[baseName].esi_bf_amount = (groupedData[baseName].esi_bf_amount || 0) + (labour.esi_bf_amount || 0);
        groupedData[baseName].last_week_balance = (groupedData[baseName].last_week_balance || 0) + (labour.last_week_balance || 0);
        groupedData[baseName].extra_amount = (groupedData[baseName].extra_amount || 0) + (labour.extra_amount || 0);
        // Keep the phone number from the first entry
        if (!groupedData[baseName].phone_number && phoneFromName) {
          groupedData[baseName].phone_number = phoneFromName;
        }
      } else {
        groupedData[baseName] = { 
          ...labour, 
          name: baseName, 
          phone_number: phoneFromName,
          advance: labour.advance || 0,
          esi_bf_amount: labour.esi_bf_amount || 0,
          last_week_balance: labour.last_week_balance || 0,
          extra_amount: labour.extra_amount || 0
        };
      }
    });
    
    setLabours(Object.values(groupedData));
  };

  const getLabourDetails = (baseName: string): WorkDetail[] => {
    // Filter based on selected week to ensure no merging across weeks
    let filteredData: Labour[];
    
    if (selectedWeek === "current") {
      const currentWeek = getCurrentWeek();
      filteredData = allLabourData.filter(labour => {
        const createdDate = new Date(labour.created_at);
        const createdTime = createdDate.getTime();
        return createdTime >= currentWeek.start.getTime() && createdTime <= currentWeek.end.getTime();
      });
    } else {
      const [startStr, endStr] = selectedWeek.split('_');
      const weekStart = new Date(startStr);
      const weekEnd = new Date(endStr);
      
      filteredData = allLabourData.filter(labour => {
        const createdDate = new Date(labour.created_at);
        const createdTime = createdDate.getTime();
        return createdTime >= weekStart.getTime() && createdTime <= weekEnd.getTime();
      });
    }
    
    return filteredData
      .filter((labour) => labour.name.startsWith(baseName + ' |'))
      .map((labour) => {
        const parts = labour.name.split(' | ');
        const phoneFromName = parts[7] && parts[7] !== 'N/A' ? parts[7] : (labour.phone_number || '');
        return {
          id: labour.id,
          ioNo: parts[1] || '',
          workType: parts[2] || '',
          pieces: labour.pieces,
          quantity: labour.quantity,
          rate_per_piece: labour.rate_per_piece,
          total_salary: labour.total_salary,
          phone_number: phoneFromName,
          advance: labour.advance || 0,
          esi_bf_amount: labour.esi_bf_amount || 0,
          last_week_balance: labour.last_week_balance || 0,
          extra_amount: labour.extra_amount || 0,
        };
      });
  };

  const toggleExpand = (labourName: string) => {
    setExpandedLabour(expandedLabour === labourName ? null : labourName);
  };

  useEffect(() => {
    fetchLabours();
  }, [refreshTrigger]);

  // Refetch when week selection changes
  useEffect(() => {
    if (allLabourData.length > 0) {
      filterLaboursByWeek(allLabourData, selectedWeek);
    }
  }, [selectedWeek]);

  const openDeleteDialog = (baseName: string) => {
    setLabourToDelete(baseName);
    setDeleteDialogOpen(true);
  };

  const openPaymentDialog = (labour: Labour) => {
    setSelectedLabourForPayment(labour);
    const finalAmount = (labour.total_salary || 0) - (labour.advance || 0) - (labour.esi_bf_amount || 0) + (labour.last_week_balance || 0) + (labour.extra_amount || 0);
    setPaymentAmount(finalAmount.toFixed(2));
    setPaymentDialogOpen(true);
  };

  const handlePayNow = (paymentApp: 'upi' | 'gpay' | 'phonepe') => {
    if (!selectedLabourForPayment || !selectedLabourForPayment.phone_number) {
      toast.error("Phone number not available for this labour");
      return;
    }

    const phoneNumber = selectedLabourForPayment.phone_number;
    
    // Copy phone number to clipboard
    navigator.clipboard.writeText(phoneNumber).then(() => {
      toast.success(`Phone number ${phoneNumber} copied! Opening payment app...`);
    }).catch(() => {
      toast.success(`Opening payment app...`);
    });
    
    // Open payment app
    let appUrl = '';
    if (paymentApp === 'gpay') {
      appUrl = 'tez://upi';
    } else if (paymentApp === 'phonepe') {
      appUrl = 'phonepe://';
    } else {
      appUrl = 'upi://pay';
    }
    
    // Small delay to ensure copy happens first
    setTimeout(() => {
      window.open(appUrl, '_blank');
    }, 100);
    
    setPaymentDialogOpen(false);
  };

  const confirmDelete = async () => {
    if (!labourToDelete) return;

    try {
      // Delete all works for this labour
      const workIds = allLabourData
        .filter((labour) => labour.name.startsWith(labourToDelete + ' |'))
        .map((labour) => labour.id);
      
      const { error } = await supabase
        .from("labours")
        .delete()
        .in("id", workIds);
        
      if (error) throw error;
      toast.success(`${labourToDelete} and all works removed successfully`);
      fetchLabours();
    } catch (error) {
      console.error("Error deleting labour:", error);
      toast.error("Failed to delete labour");
    } finally {
      setDeleteDialogOpen(false);
      setLabourToDelete(null);
    }
  };

  const startEditWork = (work: WorkDetail) => {
    setEditingWork(work);
    setEditValues({
      ioNo: work.ioNo,
      workType: work.workType,
      pieces: work.pieces.toString(),
      rate: work.rate_per_piece.toString(),
      advance: work.advance?.toString() || "0",
      esiBf: work.esi_bf_amount?.toString() || "0",
      lastWeekBalance: work.last_week_balance?.toString() || "0",
      extraAmount: work.extra_amount?.toString() || "0",
    });
  };

  const cancelEdit = () => {
    setEditingWork(null);
    setEditValues({ ioNo: "", workType: "", pieces: "", rate: "", advance: "", esiBf: "", lastWeekBalance: "", extraAmount: "" });
  };

  const saveEdit = async () => {
    if (!editingWork) return;

    try {
      const baseName = allLabourData.find(l => l.id === editingWork.id)?.name.split(' | ')[0];
      const advanceAmount = parseFloat(editValues.advance) || 0;
      const esiBfValue = parseFloat(editValues.esiBf) || 0;
      const lastWeekBalanceValue = parseFloat(editValues.lastWeekBalance) || 0;
      const extraAmountValue = parseFloat(editValues.extraAmount) || 0;
      
      // Update with all values in the name field (workaround for schema cache)
      const result = await supabase
        .from("labours")
        .update({
          name: `${baseName} | ${editValues.ioNo.trim()} | ${editValues.workType.trim()} | ${advanceAmount.toFixed(2)} | ${esiBfValue.toFixed(2)} | ${lastWeekBalanceValue.toFixed(2)} | ${extraAmountValue.toFixed(2)}`,
          pieces: parseInt(editValues.pieces),
          rate_per_piece: parseFloat(editValues.rate),
        })
        .eq("id", editingWork.id);

      if (result.error) throw result.error;
      toast.success("Work updated successfully");
      fetchLabours();
      cancelEdit();
    } catch (error) {
      console.error("Error updating work:", error);
      toast.error("Failed to update work");
    }
  };

  const downloadLabourAsImage = async (labourName: string) => {
    const element = downloadRefs.current[labourName];
    if (!element) {
      toast.error("Content not found");
      return;
    }

    try {
      // Temporarily make visible for rendering
      element.style.visibility = "visible";
      element.style.left = "0";
      
      const canvas = await html2canvas(element, {
        backgroundColor: "#ffffff",
        scale: 2,
        logging: false,
      });

      // Hide again
      element.style.visibility = "hidden";
      element.style.left = "-9999px";

      if (!canvas || canvas.width === 0 || canvas.height === 0) {
        throw new Error("Invalid canvas dimensions");
      }

      const link = document.createElement("a");
      const fileName = `${labourName.replace(/[^a-zA-Z0-9]/g, "-")}-${Date.now()}.jpg`;
      link.download = fileName;
      link.href = canvas.toDataURL("image/jpeg", 0.95);
      link.click();

      toast.success("Downloaded as image");
    } catch (error) {
      console.error("Error generating image:", error);
      toast.error(`Failed to generate image: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  const downloadLabourAsPDF = async (labourName: string) => {
    const element = downloadRefs.current[labourName];
    if (!element) {
      toast.error("Content not found");
      return;
    }

    try {
      // Temporarily make visible for rendering
      element.style.visibility = "visible";
      element.style.left = "0";
      
      const canvas = await html2canvas(element, {
        backgroundColor: "#ffffff",
        scale: 2,
        logging: false,
      });

      // Hide again
      element.style.visibility = "hidden";
      element.style.left = "-9999px";

      if (!canvas || canvas.width === 0 || canvas.height === 0) {
        throw new Error("Invalid canvas dimensions");
      }

      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      
      const pdf = new jsPDF();
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      
      const ratio = Math.min(pdfWidth / canvasWidth, pdfHeight / canvasHeight);
      
      const imgWidth = canvasWidth * ratio;
      const imgHeight = canvasHeight * ratio;
      
      const marginX = (pdfWidth - imgWidth) / 2;
      const marginY = (pdfHeight - imgHeight) / 2;
      
      pdf.addImage(imgData, "JPEG", marginX, marginY, imgWidth, imgHeight);

      const fileName = `${labourName.replace(/[^a-zA-Z0-9]/g, "-")}-${Date.now()}.pdf`;
      pdf.save(fileName);

      toast.success("Downloaded as PDF");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error(`Failed to generate PDF: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  const totalPayout = labours.reduce((sum, l) => sum + ((l.total_salary || 0) - (l.advance || 0) - (l.esi_bf_amount || 0) + (l.last_week_balance || 0) + (l.extra_amount || 0)), 0);

  return (
    <div className="card-elevated p-4 sm:p-6 animate-fade-in" style={{ animationDelay: "0.1s" }}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-display text-lg sm:text-xl font-bold text-foreground">
              Labour List
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {labours.length} labour{labours.length !== 1 ? "s" : ""} recorded
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Week Selector */}
          <div className="flex items-center gap-2 flex-1 sm:flex-initial min-w-0">
            <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <Select value={selectedWeek} onValueChange={setSelectedWeek}>
              <SelectTrigger className="w-full sm:w-[200px] h-9">
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
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={fetchLabours}
              disabled={isLoading}
              className="rounded-lg h-9 w-9"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 bg-muted animate-pulse rounded-xl"
            />
          ))}
        </div>
      ) : labours.length === 0 ? (
        <div className="text-center py-8 sm:py-12">
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
            <Users className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground" />
          </div>
          <p className="text-sm sm:text-base text-muted-foreground">
            {selectedWeek === "current" ? "No labours added this week" : "No labours for selected week"}
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground/70">
            {selectedWeek === "current" ? "Add your first labour using the form" : "Try selecting a different week"}
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-3 max-h-[400px] sm:max-h-[500px] overflow-y-auto pr-2">
            {labours.map((labour, index) => {
              const isExpanded = expandedLabour === labour.name;
              const workDetails = getLabourDetails(labour.name);
              
              return (
                <div key={labour.id}>
                  {/* Hidden content for download */}
                  <div 
                    ref={(el) => downloadRefs.current[labour.name] = el}
                    style={{
                      position: "fixed",
                      left: "-9999px",
                      top: "0",
                      width: "800px",
                      visibility: "hidden",
                    }}
                  >
                    <div style={{ padding: "40px", backgroundColor: "#ffffff", width: "800px", fontFamily: "Arial, sans-serif" }}>
                      <div style={{ textAlign: "center", marginBottom: "30px", borderBottom: "3px solid #f59e0b", paddingBottom: "20px" }}>
                        <h1 style={{ fontSize: "42px", fontWeight: "800", color: "#1a1a1a", marginBottom: "8px", letterSpacing: "-0.5px" }}>
                          AR TEXTILES
                        </h1>
                        <h2 style={{ fontSize: "28px", fontWeight: "600", color: "#f59e0b", marginBottom: "12px" }}>
                          Labour Salary Report
                        </h2>
                        <p style={{ fontSize: "18px", color: "#666666", marginBottom: "8px" }}>
                          {labour.name}
                        </p>
                        {labour.phone_number && (
                          <p style={{ fontSize: "16px", color: "#16a34a", marginBottom: "8px", fontWeight: "600" }}>
                            📱 Payment Number: {labour.phone_number}
                          </p>
                        )}
                        <p style={{ fontSize: "14px", color: "#999999" }}>
                          Date: {new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}
                        </p>
                      </div>

                      <div style={{ marginBottom: "30px" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", border: "2px solid #e5e5e5" }}>
                          <thead>
                            <tr style={{ backgroundColor: "#16a34a" }}>
                              <th style={{ padding: "14px", textAlign: "left", fontSize: "15px", fontWeight: "600", color: "#ffffff", border: "1px solid #16a34a" }}>IO No</th>
                              <th style={{ padding: "14px", textAlign: "left", fontSize: "15px", fontWeight: "600", color: "#ffffff", border: "1px solid #16a34a" }}>Work Type</th>
                              <th style={{ padding: "14px", textAlign: "center", fontSize: "15px", fontWeight: "600", color: "#ffffff", border: "1px solid #16a34a" }}>Pieces</th>
                              <th style={{ padding: "14px", textAlign: "right", fontSize: "15px", fontWeight: "600", color: "#ffffff", border: "1px solid #16a34a" }}>Rate (₹)</th>
                              <th style={{ padding: "14px", textAlign: "right", fontSize: "15px", fontWeight: "600", color: "#ffffff", border: "1px solid #16a34a" }}>Subtotal (₹)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {workDetails.map((work, idx) => (
                              <tr key={work.id} style={{ backgroundColor: idx % 2 === 0 ? "#ffffff" : "#f9fafb" }}>
                                <td style={{ padding: "14px", fontSize: "15px", color: "#1a1a1a", border: "1px solid #d1d5db" }}>{work.ioNo}</td>
                                <td style={{ padding: "14px", fontSize: "15px", color: "#1a1a1a", border: "1px solid #d1d5db" }}>{work.workType}</td>
                                <td style={{ padding: "14px", fontSize: "15px", color: "#1a1a1a", textAlign: "center", border: "1px solid #d1d5db" }}>{work.pieces}</td>
                                <td style={{ padding: "14px", fontSize: "15px", color: "#1a1a1a", textAlign: "right", border: "1px solid #d1d5db" }}>₹{work.rate_per_piece.toFixed(2)}</td>
                                <td style={{ padding: "14px", fontSize: "15px", fontWeight: "600", color: "#16a34a", textAlign: "right", border: "1px solid #d1d5db" }}>₹{work.total_salary?.toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div style={{ marginTop: "40px", padding: "25px", backgroundColor: "#f0fdf4", border: "3px solid #f59e0b", borderRadius: "12px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
                          <div>
                            <p style={{ fontSize: "18px", color: "#666", marginBottom: "4px", fontWeight: "600" }}>Total Salary</p>
                            <p style={{ fontSize: "14px", color: "#999" }}>{workDetails.length} work(s) completed</p>
                          </div>
                          <p style={{ fontSize: "42px", fontWeight: "bold", color: "#22c55e" }}>₹{labour.total_salary?.toFixed(2) || "0.00"}</p>
                        </div>
                        
                        {/* Deductions and Additions */}
                        {((labour.advance || 0) > 0 || (labour.esi_bf_amount || 0) > 0 || (labour.last_week_balance || 0) !== 0 || (labour.extra_amount || 0) !== 0) && (
                          <>
                            <div style={{ borderTop: "2px dashed #d1d5db", paddingTop: "15px", marginBottom: "15px" }}>
                              {(labour.advance || 0) > 0 && (
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                                  <p style={{ fontSize: "16px", color: "#666", fontWeight: "600" }}>Advance Payment</p>
                                  <p style={{ fontSize: "24px", fontWeight: "bold", color: "#dc2626" }}>- ₹{labour.advance?.toFixed(2) || "0.00"}</p>
                                </div>
                              )}
                              {(labour.esi_bf_amount || 0) > 0 && (
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                                  <p style={{ fontSize: "16px", color: "#666", fontWeight: "600" }}>ESI/BF Deduction</p>
                                  <p style={{ fontSize: "24px", fontWeight: "bold", color: "#dc2626" }}>- ₹{labour.esi_bf_amount?.toFixed(2) || "0.00"}</p>
                                </div>
                              )}
                              {(labour.last_week_balance || 0) !== 0 && (
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                                  <p style={{ fontSize: "16px", color: "#666", fontWeight: "600" }}>Last Week Balance</p>
                                  <p style={{ fontSize: "24px", fontWeight: "bold", color: (labour.last_week_balance || 0) >= 0 ? "#22c55e" : "#dc2626" }}>
                                    {(labour.last_week_balance || 0) >= 0 ? "+" : ""} ₹{labour.last_week_balance?.toFixed(2) || "0.00"}
                                  </p>
                                </div>
                              )}
                              {(labour.extra_amount || 0) !== 0 && (
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                                  <p style={{ fontSize: "16px", color: "#666", fontWeight: "600" }}>Extra Amount</p>
                                  <p style={{ fontSize: "24px", fontWeight: "bold", color: (labour.extra_amount || 0) >= 0 ? "#22c55e" : "#dc2626" }}>
                                    {(labour.extra_amount || 0) >= 0 ? "+" : ""} ₹{labour.extra_amount?.toFixed(2) || "0.00"}
                                  </p>
                                </div>
                              )}
                            </div>
                            <div style={{ borderTop: "3px solid #f59e0b", paddingTop: "15px" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <p style={{ fontSize: "18px", color: "#1a1a1a", fontWeight: "700" }}>Final Amount</p>
                                <p style={{ fontSize: "42px", fontWeight: "bold", color: "#f59e0b" }}>
                                  ₹{((labour.total_salary || 0) - (labour.advance || 0) - (labour.esi_bf_amount || 0) + (labour.last_week_balance || 0) + (labour.extra_amount || 0)).toFixed(2)}
                                </p>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div
                    className="bg-muted/30 rounded-xl border border-border hover:border-accent/50 transition-all duration-200 animate-slide-in"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div 
                    className="p-4 cursor-pointer"
                    onClick={() => toggleExpand(labour.name)}
                  >
                      <div className="flex items-start justify-between gap-2 md:gap-4">
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <div className="flex items-start gap-2 mb-1">
                          <h3 className="font-semibold text-sm md:text-base text-foreground break-words line-clamp-2">
                            {labour.name}
                          </h3>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                          )}
                        </div>
                        {!isExpanded && (
                          <>
                            <p className="text-sm text-muted-foreground mt-1">
                              {workDetails.length} work{workDetails.length !== 1 ? 's' : ''}
                            </p>
                            {labour.phone_number && (
                              <div className="flex items-center gap-2 mt-1">
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <span className="font-medium">📱</span> {labour.phone_number}
                                </p>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openPaymentDialog(labour);
                                  }}
                                  className="h-6 px-2 text-xs bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                                >
                                  <CreditCard className="w-3 h-3 mr-1" />
                                  Pay Now
                                </Button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-1 md:gap-3 flex-shrink-0">
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground hidden md:block">
                            {(labour.advance || 0) + (labour.esi_bf_amount || 0) + (labour.last_week_balance || 0) + (labour.extra_amount || 0) > 0 ? "Final" : "Salary"}
                          </p>
                          <p className="font-display text-base md:text-xl font-bold text-accent whitespace-nowrap">
                            ₹{((labour.total_salary || 0) - (labour.advance || 0) - (labour.esi_bf_amount || 0) + (labour.last_week_balance || 0) + (labour.extra_amount || 0)).toFixed(2)}
                          </p>
                          {((labour.advance || 0) > 0 || (labour.esi_bf_amount || 0) > 0 || (labour.last_week_balance || 0) !== 0 || (labour.extra_amount || 0) !== 0) && (
                            <p className="text-xs text-muted-foreground line-through">
                              ₹{labour.total_salary?.toFixed(2)}
                            </p>
                          )}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => e.stopPropagation()}
                              className="text-muted-foreground hover:text-primary rounded-lg h-8 w-8 md:h-10 md:w-10"
                            >
                              <Download className="w-3.5 h-3.5 md:w-4 md:h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              downloadLabourAsImage(labour.name);
                            }}>
                              Download as Image
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              downloadLabourAsPDF(labour.name);
                            }}>
                              Download as PDF
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            openDeleteDialog(labour.name);
                          }}
                          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg h-8 w-8 md:h-10 md:w-10"
                        >
                          <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-2">
                      <div className="border-t border-border pt-3">
                        {workDetails.map((work) => (
                          <div
                            key={work.id}
                            className="bg-background/50 rounded-lg p-3 mb-2 last:mb-0"
                          >
                            {editingWork?.id === work.id ? (
                              <div className="space-y-3">
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                  <div>
                                    <Label className="text-xs">IO No</Label>
                                    <Input
                                      value={editValues.ioNo}
                                      onChange={(e) => setEditValues({ ...editValues, ioNo: e.target.value })}
                                      className="h-8 text-sm"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs">Work Type</Label>
                                    <Input
                                      value={editValues.workType}
                                      onChange={(e) => setEditValues({ ...editValues, workType: e.target.value })}
                                      className="h-8 text-sm"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs">Pieces</Label>
                                    <Input
                                      type="number"
                                      value={editValues.pieces}
                                      onChange={(e) => setEditValues({ ...editValues, pieces: e.target.value })}
                                      className="h-8 text-sm"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs">Rate</Label>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={editValues.rate}
                                      onChange={(e) => setEditValues({ ...editValues, rate: e.target.value })}
                                      className="h-8 text-sm"
                                    />
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                  <div>
                                    <Label className="text-xs">Advance (₹)</Label>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={editValues.advance}
                                      onChange={(e) => setEditValues({ ...editValues, advance: e.target.value })}
                                      className="h-8 text-sm"
                                      placeholder="0.00"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs">ESI/BF (₹)</Label>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={editValues.esiBf}
                                      onChange={(e) => setEditValues({ ...editValues, esiBf: e.target.value })}
                                      className="h-8 text-sm"
                                      placeholder="0.00"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs">Last Week Bal (₹)</Label>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={editValues.lastWeekBalance}
                                      onChange={(e) => setEditValues({ ...editValues, lastWeekBalance: e.target.value })}
                                      className="h-8 text-sm"
                                      placeholder="0.00"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs">Extra Amount (₹)</Label>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={editValues.extraAmount}
                                      onChange={(e) => setEditValues({ ...editValues, extraAmount: e.target.value })}
                                      className="h-8 text-sm"
                                      placeholder="0.00"
                                    />
                                  </div>
                                </div>
                                <div className="flex gap-2 justify-end">
                                  <Button size="sm" variant="outline" onClick={cancelEdit}>
                                    Cancel
                                  </Button>
                                  <Button size="sm" onClick={saveEdit}>
                                    Save
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 text-sm flex-1 w-full">
                                  <div>
                                    <p className="text-muted-foreground text-xs">IO No</p>
                                    <p className="font-medium text-foreground text-xs sm:text-sm break-all">{work.ioNo}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground text-xs">Work Type</p>
                                    <p className="font-medium text-foreground text-xs sm:text-sm break-words">{work.workType}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground text-xs">Pieces</p>
                                    <p className="font-medium text-foreground text-xs sm:text-sm">{work.pieces}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground text-xs">Rate</p>
                                    <p className="font-medium text-foreground text-xs sm:text-sm">₹{work.rate_per_piece}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground text-xs">Subtotal</p>
                                    <p className="font-semibold text-accent text-xs sm:text-sm">₹{work.total_salary?.toFixed(2)}</p>
                                  </div>
                                </div>
                                <div className="flex gap-1 flex-shrink-0">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => startEditWork(work)}
                                    className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground hover:text-primary"
                                  >
                                    <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={async () => {
                                      if (window.confirm(`Delete this work (${work.workType})?`)) {
                                        try {
                                          const { error } = await supabase.from("labours").delete().eq("id", work.id);
                                          if (error) throw error;
                                          toast.success("Work deleted successfully");
                                          fetchLabours();
                                        } catch (error) {
                                          console.error("Error deleting work:", error);
                                          toast.error("Failed to delete work");
                                        }
                                      }
                                    }}
                                    className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground hover:text-destructive"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      {((labour.advance || 0) > 0 || (labour.esi_bf_amount || 0) > 0 || (labour.last_week_balance || 0) !== 0 || (labour.extra_amount || 0) !== 0) && (
                        <div className="mt-3 pt-3 border-t border-border">
                          <div className="bg-muted/50 rounded-lg p-2 sm:p-3">
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 text-sm">
                              <div className="text-center sm:text-left">
                                <p className="text-muted-foreground text-xs mb-1">Total Salary</p>
                                <p className="font-bold text-sm sm:text-base md:text-lg">₹{labour.total_salary?.toFixed(2) || "0.00"}</p>
                              </div>
                              {(labour.advance || 0) > 0 && (
                                <div className="text-center sm:text-left">
                                  <p className="text-muted-foreground text-xs mb-1">Advance Paid</p>
                                  <p className="font-bold text-sm sm:text-base md:text-lg text-destructive">- ₹{labour.advance?.toFixed(2) || "0.00"}</p>
                                </div>
                              )}
                              {(labour.esi_bf_amount || 0) > 0 && (
                                <div className="text-center sm:text-left">
                                  <p className="text-muted-foreground text-xs mb-1">ESI/BF</p>
                                  <p className="font-bold text-sm sm:text-base md:text-lg text-destructive">- ₹{labour.esi_bf_amount?.toFixed(2) || "0.00"}</p>
                                </div>
                              )}
                              {(labour.last_week_balance || 0) !== 0 && (
                                <div className="text-center sm:text-left">
                                  <p className="text-muted-foreground text-xs mb-1">Last Week Bal</p>
                                  <p className={`font-bold text-sm sm:text-base md:text-lg ${(labour.last_week_balance || 0) >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                                    {(labour.last_week_balance || 0) >= 0 ? '+' : ''} ₹{labour.last_week_balance?.toFixed(2) || "0.00"}
                                  </p>
                                </div>
                              )}
                              {(labour.extra_amount || 0) !== 0 && (
                                <div className="text-center sm:text-left">
                                  <p className="text-muted-foreground text-xs mb-1">Extra Amount</p>
                                  <p className={`font-bold text-sm sm:text-base md:text-lg ${(labour.extra_amount || 0) >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                                    {(labour.extra_amount || 0) >= 0 ? '+' : ''} ₹{labour.extra_amount?.toFixed(2) || "0.00"}
                                  </p>
                                </div>
                              )}
                              <div className="text-center sm:text-left col-span-2 sm:col-span-1">
                                <p className="text-muted-foreground text-xs mb-1">Final Amount</p>
                                <p className="font-bold text-sm sm:text-base md:text-lg text-accent">₹{((labour.total_salary || 0) - (labour.advance || 0) - (labour.esi_bf_amount || 0) + (labour.last_week_balance || 0) + (labour.extra_amount || 0)).toFixed(2)}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 sm:mt-6 pt-4 border-t border-border">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">Total Payout</p>
                <p className="text-xs text-muted-foreground/70">
                  For all {labours.length} labours (after deductions)
                </p>
              </div>
              <div className="text-left sm:text-right">
                <p className="font-display text-2xl sm:text-3xl font-bold text-accent">
                  ₹{totalPayout.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Labour</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{labourToDelete}</strong> and all{" "}
              {labourToDelete ? getLabourDetails(labourToDelete).length : 0} work(s)?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-green-600" />
              Pay Labour Salary
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4 pt-2">
                <div>
                  <p className="font-medium text-foreground mb-1">{selectedLabourForPayment?.name}</p>
                  
                  <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4 my-3">
                    <p className="text-sm font-medium text-green-900 mb-2">Payment Phone Number:</p>
                    <div className="flex items-center justify-between gap-2 bg-white rounded-md p-3 border border-green-200">
                      <p className="text-2xl font-bold text-green-700 select-all">
                        {selectedLabourForPayment?.phone_number}
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(selectedLabourForPayment?.phone_number || '');
                          toast.success('Phone number copied!');
                        }}
                        className="shrink-0 text-xs"
                      >
                        Copy
                      </Button>
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-sm font-medium text-amber-900 mb-1">Salary Amount:</p>
                    <p className="text-2xl font-bold text-amber-700">
                      ₹{paymentAmount}
                    </p>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
                    <p className="text-xs text-blue-800 leading-relaxed">
                      <strong>📋 Steps:</strong><br/>
                      1. Click on your payment app below<br/>
                      2. Search/paste the phone number<br/>
                      3. Enter the amount manually<br/>
                      4. Complete the payment
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Choose Payment App:</p>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      onClick={() => handlePayNow('gpay')}
                      className="h-auto py-3 flex flex-col items-center gap-1 bg-white hover:bg-gray-50 text-gray-900 border-2 border-gray-200"
                    >
                      <span className="text-2xl">💳</span>
                      <span className="text-xs font-semibold">GPay</span>
                    </Button>
                    <Button
                      onClick={() => handlePayNow('phonepe')}
                      className="h-auto py-3 flex flex-col items-center gap-1 bg-purple-50 hover:bg-purple-100 text-purple-900 border-2 border-purple-200"
                    >
                      <span className="text-2xl">📱</span>
                      <span className="text-xs font-semibold">PhonePe</span>
                    </Button>
                    <Button
                      onClick={() => handlePayNow('upi')}
                      className="h-auto py-3 flex flex-col items-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-900 border-2 border-blue-200"
                    >
                      <span className="text-2xl">💰</span>
                      <span className="text-xs font-semibold">Other UPI</span>
                    </Button>
                  </div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default LabourList;
