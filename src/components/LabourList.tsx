import { useEffect, useState, useRef } from "react";
import { Users, Trash2, RefreshCw, ChevronDown, ChevronUp, Edit, Download } from "lucide-react";
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
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
  const [labourToDelete, setLabourToDelete] = useState<string | null>(null);
  const [editingWork, setEditingWork] = useState<WorkDetail | null>(null);
  const [editValues, setEditValues] = useState({ ioNo: "", workType: "", pieces: "", rate: "" });
  const downloadRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const fetchLabours = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("labours")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Store all data for details view
      setAllLabourData(data || []);
      
      // Group by base labour name (before the pipe)
      const groupedData: { [key: string]: Labour } = {};
      (data || []).forEach((labour) => {
        const baseName = labour.name.split(' | ')[0];
        if (groupedData[baseName]) {
          groupedData[baseName].total_salary += labour.total_salary || 0;
        } else {
          groupedData[baseName] = { ...labour, name: baseName };
        }
      });
      
      setLabours(Object.values(groupedData));
    } catch (error) {
      console.error("Error fetching labours:", error);
      toast.error("Failed to load labours");
    } finally {
      setIsLoading(false);
    }
  };

  const getLabourDetails = (baseName: string): WorkDetail[] => {
    return allLabourData
      .filter((labour) => labour.name.startsWith(baseName + ' |'))
      .map((labour) => {
        const parts = labour.name.split(' | ');
        return {
          id: labour.id,
          ioNo: parts[1] || '',
          workType: parts[2] || '',
          pieces: labour.pieces,
          quantity: labour.quantity,
          rate_per_piece: labour.rate_per_piece,
          total_salary: labour.total_salary,
        };
      });
  };

  const toggleExpand = (labourName: string) => {
    setExpandedLabour(expandedLabour === labourName ? null : labourName);
  };

  useEffect(() => {
    fetchLabours();
  }, [refreshTrigger]);

  const openDeleteDialog = (baseName: string) => {
    setLabourToDelete(baseName);
    setDeleteDialogOpen(true);
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
    });
  };

  const cancelEdit = () => {
    setEditingWork(null);
    setEditValues({ ioNo: "", workType: "", pieces: "", rate: "" });
  };

  const saveEdit = async () => {
    if (!editingWork) return;

    try {
      const baseName = allLabourData.find(l => l.id === editingWork.id)?.name.split(' | ')[0];
      const { error } = await supabase
        .from("labours")
        .update({
          name: `${baseName} | ${editValues.ioNo.trim()} | ${editValues.workType.trim()}`,
          pieces: parseInt(editValues.pieces),
          rate_per_piece: parseFloat(editValues.rate),
        })
        .eq("id", editingWork.id);

      if (error) throw error;
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
    } catch (error: any) {
      console.error("Error generating image:", error);
      toast.error(`Failed to generate image: ${error.message || "Unknown error"}`);
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
    } catch (error: any) {
      console.error("Error generating PDF:", error);
      toast.error(`Failed to generate PDF: ${error.message || "Unknown error"}`);
    }
  };

  const confirmDeleteAll = async () => {
    try {
      const { error } = await supabase.from("labours").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      
      if (error) throw error;
      toast.success("All labour records deleted successfully");
      fetchLabours();
    } catch (error) {
      console.error("Error deleting all labours:", error);
      toast.error("Failed to delete all records");
    } finally {
      setDeleteAllDialogOpen(false);
    }
  };

  const totalSalary = labours.reduce((sum, l) => sum + (l.total_salary || 0), 0);

  return (
    <div className="card-elevated p-6 animate-fade-in" style={{ animationDelay: "0.1s" }}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center">
            <Users className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-foreground">
              Labour List
            </h2>
            <p className="text-sm text-muted-foreground">
              {labours.length} labour{labours.length !== 1 ? "s" : ""} recorded
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {labours.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteAllDialogOpen(true)}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete All
            </Button>
          )}
          <Button
            variant="outline"
            size="icon"
            onClick={fetchLabours}
            disabled={isLoading}
            className="rounded-lg"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
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
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
            <Users className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">No labours added yet</p>
          <p className="text-sm text-muted-foreground/70">
            Add your first labour using the form
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
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
                      <div style={{ textAlign: "center", marginBottom: "30px", borderBottom: "3px solid #16a34a", paddingBottom: "20px" }}>
                        <h1 style={{ fontSize: "32px", fontWeight: "bold", color: "#1a1a1a", marginBottom: "8px" }}>
                          Labour Salary Report
                        </h1>
                        <p style={{ fontSize: "18px", color: "#666666", marginBottom: "8px" }}>
                          {labour.name}
                        </p>
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

                      <div style={{ marginTop: "40px", padding: "25px", backgroundColor: "#f0fdf4", border: "3px solid #16a34a", borderRadius: "12px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <p style={{ fontSize: "18px", color: "#666", marginBottom: "4px", fontWeight: "600" }}>Total Salary</p>
                            <p style={{ fontSize: "14px", color: "#999" }}>{workDetails.length} work(s) completed</p>
                          </div>
                          <p style={{ fontSize: "42px", fontWeight: "bold", color: "#16a34a" }}>₹{labour.total_salary?.toFixed(2) || "0.00"}</p>
                        </div>
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
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-foreground truncate">
                            {labour.name}
                          </h3>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          )}
                        </div>
                        {!isExpanded && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {workDetails.length} work{workDetails.length !== 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Salary</p>
                          <p className="font-display text-xl font-bold text-accent">
                            ₹{labour.total_salary?.toFixed(2) || "0.00"}
                          </p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => e.stopPropagation()}
                              className="text-muted-foreground hover:text-primary rounded-lg"
                            >
                              <Download className="w-4 h-4" />
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
                          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
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
                              <div className="flex items-center justify-between gap-3">
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-sm flex-1">
                                  <div>
                                    <p className="text-muted-foreground text-xs">IO No</p>
                                    <p className="font-medium text-foreground">{work.ioNo}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground text-xs">Work Type</p>
                                    <p className="font-medium text-foreground">{work.workType}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground text-xs">Pieces</p>
                                    <p className="font-medium text-foreground">{work.pieces}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground text-xs">Rate</p>
                                    <p className="font-medium text-foreground">₹{work.rate_per_piece}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground text-xs">Subtotal</p>
                                    <p className="font-semibold text-accent">₹{work.total_salary?.toFixed(2)}</p>
                                  </div>
                                </div>
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => startEditWork(work)}
                                    className="h-8 w-8 text-muted-foreground hover:text-primary"
                                  >
                                    <Edit className="w-4 h-4" />
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
                                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 pt-4 border-t border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Payout</p>
                <p className="text-xs text-muted-foreground/70">
                  For all {labours.length} labours
                </p>
              </div>
              <div className="text-right">
                <p className="font-display text-3xl font-bold text-accent">
                  ₹{totalSalary.toFixed(2)}
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

      <AlertDialog open={deleteAllDialogOpen} onOpenChange={setDeleteAllDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete All Labour Records</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>ALL {labours.length} labour(s)</strong> and{" "}
              <strong>{allLabourData.length} work record(s)</strong>?
              This will permanently remove all data and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default LabourList;
