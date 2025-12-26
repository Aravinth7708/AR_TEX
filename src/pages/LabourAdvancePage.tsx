import { useEffect, useState } from "react";
import { Plus, Trash2, Edit, Calendar, DollarSign, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

type LabourAdvance = Database['public']['Tables']['labour_advances']['Row'];

const LabourAdvancePage = () => {
  const [advances, setAdvances] = useState<LabourAdvance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAdvance, setEditingAdvance] = useState<LabourAdvance | null>(null);
  const [activeTab, setActiveTab] = useState<string>("active");
  const [formData, setFormData] = useState({
    labour_name: "",
    advance_amount: "",
    advance_date: new Date().toISOString().split("T")[0],
    notes: "",
  });

  // Filter advances into active (unpaid) and paid
  const activeAdvances = advances.filter(
    (advance) => (advance.advance_amount - (advance.paid_amount || 0)) > 0
  );
  const paidAdvances = advances.filter(
    (advance) => (advance.advance_amount - (advance.paid_amount || 0)) <= 0
  );

  useEffect(() => {
    fetchAdvances();
  }, []);

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
      setAdvances(data || []);
    } catch (error) {
      console.error("Error fetching advances:", error);
      toast.error(`Failed to load advances: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

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
    if (advancesList.length === 0) {
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
                  <th className="text-left py-3 px-4 font-semibold whitespace-nowrap">Notes</th>
                  {showActions && <th className="text-center py-3 px-4 font-semibold whitespace-nowrap">Actions</th>}
                </tr>
              </thead>
              <tbody>
              {advancesList.map((advance) => {
                const paidAmount = advance.paid_amount || 0;
                const balance = advance.advance_amount - paidAmount;
                const isFullyPaid = balance <= 0;
                
                return (
                  <tr key={advance.id} className={`border-b border-border hover:bg-muted/50 ${isFullyPaid ? 'opacity-70' : ''}`}>
                    <td className="py-3 px-4 font-medium">{advance.labour_name}</td>
                    <td className="py-3 px-4 text-right text-blue-600 font-semibold">
                      ₹{Number(advance.advance_amount).toFixed(2)}
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
                    <td className="py-3 px-4 text-center text-sm text-muted-foreground">
                      {new Date(advance.advance_date).toLocaleDateString("en-IN")}
                    </td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">
                      {advance.notes || "-"}
                    </td>
                    {showActions && (
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(advance)}
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
                                  {advance.labour_name}. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(advance.id)}
                                  className="bg-destructive hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
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
          {advancesList.map((advance) => {
            const paidAmount = advance.paid_amount || 0;
            const balance = advance.advance_amount - paidAmount;
            const isFullyPaid = balance <= 0;
            
            return (
              <div key={advance.id} className={`border border-border rounded-lg p-3 space-y-3 ${isFullyPaid ? 'bg-muted/30' : ''}`}>
                {/* Header with Name and Actions */}
                <div className="flex justify-between items-start gap-2">
                  <h3 className="font-semibold text-base flex-1">{advance.labour_name}</h3>
                  {showActions && (
                    <div className="flex gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(advance)}
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
                            <AlertDialogTitle>Delete Advance?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete the advance record for{" "}
                              {advance.labour_name}. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(advance.id)}
                              className="bg-destructive hover:bg-destructive/90"
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
                      ₹{Number(advance.advance_amount).toFixed(2)}
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
                    {new Date(advance.advance_date).toLocaleDateString("en-IN")}
                  </div>
                  {advance.notes && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{advance.notes}</p>
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
