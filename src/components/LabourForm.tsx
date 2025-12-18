import { useState } from "react";
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

const LabourForm = ({ onLabourAdded }: LabourFormProps) => {
  const [name, setName] = useState("");
  const [workEntries, setWorkEntries] = useState<WorkEntry[]>([
    { id: crypto.randomUUID(), ioNo: "", workType: "", quantity: "", rate: "" },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalSalary = workEntries.reduce((total, entry) => {
    return total + (parseFloat(entry.quantity) || 0) * (parseFloat(entry.rate) || 0);
  }, 0);

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
      const labourData = workEntries.map((entry) => ({
        name: `${name.trim()} | ${entry.ioNo.trim()} | ${entry.workType.trim()}`,
        pieces: parseInt(entry.quantity),
        quantity: 1,
        rate_per_piece: parseFloat(entry.rate),
      }));

      const { error } = await supabase.from("labours").insert(labourData);

      if (error) throw error;

      toast.success(
        `${name} added with ${workEntries.length} work(s) - Total: ₹${totalSalary.toFixed(2)}`
      );
      setName("");
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
            <div className="max-h-[50vh] overflow-y-auto">
              <table className="w-full">
                <thead className="bg-muted/50 sticky top-0 z-10">
                  <tr>
                    <th className="text-left text-xs font-semibold p-2 w-[15%]">IO</th>
                    <th className="text-left text-xs font-semibold p-2 w-[30%]">Work</th>
                    <th className="text-left text-xs font-semibold p-2 w-[18%]">Qty</th>
                    <th className="text-left text-xs font-semibold p-2 w-[22%]">Rate</th>
                    <th className="text-right text-xs font-semibold p-2 w-[15%]"></th>
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
                          className="h-9 text-xs border-0 focus:ring-1"
                        />
                      </td>
                      <td className="p-1.5">
                        <Input
                          type="text"
                          placeholder="Work type"
                          value={entry.workType}
                          onChange={(e) => updateWorkEntry(entry.id, "workType", e.target.value)}
                          className="h-9 text-xs border-0 focus:ring-1"
                        />
                      </td>
                      <td className="p-1.5">
                        <Input
                          type="number"
                          placeholder="0"
                          min="0"
                          value={entry.quantity}
                          onChange={(e) => updateWorkEntry(entry.id, "quantity", e.target.value)}
                          className="h-9 text-xs border-0 focus:ring-1"
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
                          className="h-9 text-xs border-0 focus:ring-1"
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

        <div className="bg-gradient-to-r from-accent/10 to-primary/10 rounded-xl p-4 border-2 border-accent/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm font-medium text-foreground">Total Salary</p>
              <p className="text-xs text-muted-foreground">
                {workEntries.length} work{workEntries.length > 1 ? 's' : ''}
              </p>
            </div>
            <div className="text-right">
              <p className="font-display text-2xl md:text-3xl font-bold text-accent">
                ₹{totalSalary.toFixed(2)}
              </p>
            </div>
          </div>
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
