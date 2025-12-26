import { useState, useEffect } from "react";
import { Plus, Calculator, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface LabourFormProps {
  onLabourAdded: () => void;
}

interface WorkEntry {
  id: string;
  ioNo: string;
  workType: string;
  quantity: string;
  rate: string;
}

const FORM_STORAGE_KEY = "labour_form_draft";

const LabourForm = ({ onLabourAdded }: LabourFormProps) => {
  // Load saved form data from localStorage on mount
  const loadSavedFormData = () => {
    try {
      const saved = localStorage.getItem(FORM_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error("Error loading saved form data:", error);
    }
    return null;
  };

  const savedData = loadSavedFormData();

  const [name, setName] = useState(savedData?.name || "");
  const [phoneNumber, setPhoneNumber] = useState(savedData?.phoneNumber || "");
  const [advance, setAdvance] = useState(savedData?.advance || "");
  const [esiBfAmount, setEsiBfAmount] = useState(savedData?.esiBfAmount || "");
  const [lastWeekBalance, setLastWeekBalance] = useState(savedData?.lastWeekBalance || "");
  const [extraAmount, setExtraAmount] = useState(savedData?.extraAmount || "");
  const [workEntries, setWorkEntries] = useState<WorkEntry[]>(
    savedData?.workEntries || [{ id: crypto.randomUUID(), ioNo: "", workType: "", quantity: "", rate: "" }]
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-save form data to localStorage whenever it changes
  useEffect(() => {
    const formData = {
      name,
      phoneNumber,
      advance,
      esiBfAmount,
      lastWeekBalance,
      extraAmount,
      workEntries,
    };
    localStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(formData));
  }, [name, phoneNumber, advance, esiBfAmount, lastWeekBalance, extraAmount, workEntries]);

  const totalSalary = workEntries.reduce((total, entry) => {
    return total + (parseFloat(entry.quantity) || 0) * (parseFloat(entry.rate) || 0);
  }, 0);

  const advanceAmount = parseFloat(advance) || 0;
  const esiBfAmountValue = parseFloat(esiBfAmount) || 0;
  const lastWeekBalanceValue = parseFloat(lastWeekBalance) || 0;
  const extraAmountValue = parseFloat(extraAmount) || 0;
  
  // Final Salary = Total Salary - Advance - ESI/BF + Last Week Balance + Extra Amount
  const finalSalary = totalSalary - advanceAmount - esiBfAmountValue + lastWeekBalanceValue + extraAmountValue;

  const addWorkEntry = () => {
    setWorkEntries([
      ...workEntries,
      { id: crypto.randomUUID(), ioNo: "", workType: "", quantity: "", rate: "" },
    ]);
  };

  const updateWorkEntry = (id: string, field: keyof WorkEntry, value: string) => {
    setWorkEntries(
      workEntries.map((entry) =>
        entry.id === id ? { ...entry, [field]: value } : entry
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Please enter labour name");
      return;
    }

    const hasEmptyFields = workEntries.some(
      (entry) => !entry.ioNo.trim() || !entry.workType.trim() || !entry.quantity || !entry.rate
    );

    if (hasEmptyFields) {
      toast.error("Please fill all work entry fields");
      return;
    }

    setIsSubmitting(true);

    try {
      // Build labour data - encode phone in name field until migration is applied
      const labourData = workEntries.map((entry, index) => ({
        name: `${name.trim()} | ${entry.ioNo.trim()} | ${entry.workType.trim()} | ${index === 0 ? advanceAmount.toFixed(2) : '0.00'} | ${index === 0 ? esiBfAmountValue.toFixed(2) : '0.00'} | ${index === 0 ? lastWeekBalanceValue.toFixed(2) : '0.00'} | ${index === 0 ? extraAmountValue.toFixed(2) : '0.00'} | ${phoneNumber.trim() || 'N/A'}`,
        pieces: parseInt(entry.quantity),
        quantity: 1,
        rate_per_piece: parseFloat(entry.rate),
      }));

      const { error } = await supabase.from("labours").insert(labourData);

      if (error) throw error;

      toast.success(
        `${name} added with ${workEntries.length} work(s) - Final: ₹${finalSalary.toFixed(2)}`
      );
      
      // Clear localStorage after successful submission
      localStorage.removeItem(FORM_STORAGE_KEY);
      
      setName("");
      setPhoneNumber("");
      setAdvance("");
      setEsiBfAmount("");
      setLastWeekBalance("");
      setExtraAmount("");
      setWorkEntries([{ id: crypto.randomUUID(), ioNo: "", workType: "", quantity: "", rate: "" }]);
      onLabourAdded();
    } catch (error) {
      console.error("Error adding labour:", error);
      toast.error("Failed to add labour. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="card-elevated p-4 md:p-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-4 md:mb-6">
        <div className="w-10 h-10 rounded-lg gradient-accent flex items-center justify-center">
          <Calculator className="w-5 h-5 text-accent-foreground" />
        </div>
        <div>
          <h2 className="font-display text-lg md:text-xl font-bold text-foreground">
            Add New Labour
          </h2>
          <p className="text-xs md:text-sm text-muted-foreground">
            Calculate and save labour salary
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 md:space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm md:text-base font-medium">
              Labour Name
            </Label>
            <Input
              id="name"
              type="text"
              placeholder="Enter labour name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field h-11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phoneNumber" className="text-sm md:text-base font-medium">
              Phone Number (For Payment)
            </Label>
            <Input
              id="phoneNumber"
              type="tel"
              placeholder="Enter 10-digit number"
              value={phoneNumber}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                setPhoneNumber(value);
              }}
              maxLength={10}
              className="input-field h-11"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
          <div className="space-y-2">
            <Label htmlFor="advance" className="text-sm md:text-base font-medium">
              Advance (₹)
            </Label>
            <Input
              id="advance"
              type="number"
              placeholder="0.00"
              min="0"
              step="0.01"
              value={advance}
              onChange={(e) => setAdvance(e.target.value)}
              className="input-field h-11"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-sm font-semibold">Work Details ({workEntries.length})</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addWorkEntry}
              className="h-8 text-xs"
            >
              <Plus className="w-3 h-3 mr-1" />
              Add Work
            </Button>
          </div>

          <div className="border border-border rounded-lg overflow-hidden">
            <div className="max-h-[50vh] overflow-y-auto overflow-x-auto">
              <table className="w-full min-w-[500px]">
                <thead className="bg-muted/50 sticky top-0 z-10">
                  <tr>
                    <th className="text-left text-xs font-semibold p-2 min-w-[80px]">IO</th>
                    <th className="text-left text-xs font-semibold p-2 min-w-[140px]">Work</th>
                    <th className="text-left text-xs font-semibold p-2 min-w-[80px]">Qty</th>
                    <th className="text-left text-xs font-semibold p-2 min-w-[90px]">Rate</th>
                    <th className="text-right text-xs font-semibold p-2 w-[50px]"></th>
                  </tr>
                </thead>
                <tbody>
                  {workEntries.map((entry, index) => (
                    <tr key={entry.id} className="border-t border-border">
                      <td className="p-1.5">
                        <Input
                          type="text"
                          placeholder="IO"
                          value={entry.ioNo}
                          onChange={(e) => updateWorkEntry(entry.id, "ioNo", e.target.value)}
                          className="h-9 text-sm border-0 focus:ring-1 w-full min-w-[70px]"
                        />
                      </td>
                      <td className="p-1.5">
                        <Input
                          type="text"
                          placeholder="Work type"
                          value={entry.workType}
                          onChange={(e) => updateWorkEntry(entry.id, "workType", e.target.value)}
                          className="h-9 text-sm border-0 focus:ring-1 w-full min-w-[130px]"
                        />
                      </td>
                      <td className="p-1.5">
                        <Input
                          type="number"
                          placeholder="0"
                          min="0"
                          value={entry.quantity}
                          onChange={(e) => updateWorkEntry(entry.id, "quantity", e.target.value)}
                          className="h-9 text-sm border-0 focus:ring-1 w-full min-w-[70px]"
                        />
                      </td>
                      <td className="p-1.5">
                        <Input
                          type="number"
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                          value={entry.rate}
                          onChange={(e) => updateWorkEntry(entry.id, "rate", e.target.value)}
                          className="h-9 text-sm border-0 focus:ring-1 w-full min-w-[80px]"
                        />
                      </td>
                      <td className="p-1.5 text-right">
                        {workEntries.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setWorkEntries(workEntries.filter(e => e.id !== entry.id))}
                            className="h-7 w-7 p-0 text-destructive"
                          >
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-2">
            {workEntries.slice(0, 3).map((entry, index) => (
              <div key={index} className="bg-muted/30 rounded-md p-2 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">#{index + 1}</span>
                <span className="text-xs font-semibold text-accent">
                  ₹{((parseFloat(entry.quantity) || 0) * (parseFloat(entry.rate) || 0)).toFixed(2)}
                </span>
              </div>
            ))}
            {workEntries.length > 3 && (
              <div className="bg-muted/30 rounded-md p-2 flex items-center justify-center col-span-2">
                <span className="text-xs text-muted-foreground">
                  +{workEntries.length - 3} more works
                </span>
              </div>
            )}
          </div>
        </div>

        {/* New fields section - moved below work details */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
          <div className="space-y-2">
            <Label htmlFor="esiBf" className="text-sm md:text-base font-medium">
              ESI/BF Amount (₹)
            </Label>
            <Input
              id="esiBf"
              type="number"
              placeholder="0.00"
              min="0"
              step="0.01"
              value={esiBfAmount}
              onChange={(e) => setEsiBfAmount(e.target.value)}
              className="input-field h-11"
            />
            <p className="text-xs text-muted-foreground">Will be deducted</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastWeekBalance" className="text-sm md:text-base font-medium">
              Last Week Balance (₹)
            </Label>
            <Input
              id="lastWeekBalance"
              type="number"
              placeholder="0.00"
              step="0.01"
              value={lastWeekBalance}
              onChange={(e) => setLastWeekBalance(e.target.value)}
              className="input-field h-11"
            />
            <p className="text-xs text-muted-foreground">Will be added</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="extraAmount" className="text-sm md:text-base font-medium">
              Extra Amount (₹)
            </Label>
            <Input
              id="extraAmount"
              type="number"
              placeholder="0.00"
              step="0.01"
              value={extraAmount}
              onChange={(e) => setExtraAmount(e.target.value)}
              className="input-field h-11"
            />
            <p className="text-xs text-muted-foreground">Will be added</p>
          </div>
        </div>

        <div className="bg-gradient-to-r from-accent/10 to-primary/10 rounded-xl p-4 border-2 border-accent/30 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm font-medium text-foreground">Total Salary</p>
              <p className="text-xs text-muted-foreground">
                {workEntries.length} work{workEntries.length > 1 ? 's' : ''}
              </p>
            </div>
            <div className="text-right">
              <p className="font-display text-xl md:text-2xl font-bold text-foreground">
                ₹{totalSalary.toFixed(2)}
              </p>
            </div>
          </div>
          
          {/* Show all deductions and additions */}
          <div className="space-y-2">
            {advanceAmount > 0 && (
              <div className="flex items-center justify-between text-sm">
                <p className="text-muted-foreground">Advance Payment</p>
                <p className="font-semibold text-destructive">- ₹{advanceAmount.toFixed(2)}</p>
              </div>
            )}
            {esiBfAmountValue > 0 && (
              <div className="flex items-center justify-between text-sm">
                <p className="text-muted-foreground">ESI/BF Amount</p>
                <p className="font-semibold text-destructive">- ₹{esiBfAmountValue.toFixed(2)}</p>
              </div>
            )}
            {lastWeekBalanceValue !== 0 && (
              <div className="flex items-center justify-between text-sm">
                <p className="text-muted-foreground">Last Week Balance</p>
                <p className={`font-semibold ${lastWeekBalanceValue >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                  {lastWeekBalanceValue >= 0 ? '+' : ''} ₹{lastWeekBalanceValue.toFixed(2)}
                </p>
              </div>
            )}
            {extraAmountValue !== 0 && (
              <div className="flex items-center justify-between text-sm">
                <p className="text-muted-foreground">Extra Amount</p>
                <p className={`font-semibold ${extraAmountValue >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                  {extraAmountValue >= 0 ? '+' : ''} ₹{extraAmountValue.toFixed(2)}
                </p>
              </div>
            )}
          </div>
          
          {(advanceAmount > 0 || esiBfAmountValue > 0 || lastWeekBalanceValue !== 0 || extraAmountValue !== 0) && (
            <div className="border-t border-accent/30 pt-2">
              <div className="flex items-center justify-between">
                <p className="text-xs md:text-sm font-semibold text-foreground">Final Amount</p>
                <p className="font-display text-2xl md:text-3xl font-bold text-accent">
                  ₹{finalSalary.toFixed(2)}
                </p>
              </div>
            </div>
          )}
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-12 btn-primary flex items-center justify-center gap-2 text-base font-semibold"
        >
          <Plus className="w-5 h-5" />
          {isSubmitting ? "Adding..." : "Add Labour"}
        </Button>
      </form>
    </div>
  );
};

export default LabourForm;
