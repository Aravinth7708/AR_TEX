import { useState } from "react";
import { Plus, Calculator } from "lucide-react";
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
    <div className="card-elevated p-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg gradient-accent flex items-center justify-center">
          <Calculator className="w-5 h-5 text-accent-foreground" />
        </div>
        <div>
          <h2 className="font-display text-xl font-bold text-foreground">
            Add New Labour
          </h2>
          <p className="text-sm text-muted-foreground">
            Calculate and save labour salary
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-foreground font-medium">
            Labour Name
          </Label>
          <Input
            id="name"
            type="text"
            placeholder="Enter labour name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-field"
          />
        </div>

        <div className="space-y-4">
          {workEntries.map((entry) => (
            <div key={entry.id} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">IO No</Label>
                <Input
                  type="text"
                  placeholder="Serial No"
                  value={entry.ioNo}
                  onChange={(e) => updateWorkEntry(entry.id, "ioNo", e.target.value)}
                  className="input-field"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Work Type</Label>
                <Input
                  type="text"
                  placeholder="e.g. Stitching"
                  value={entry.workType}
                  onChange={(e) => updateWorkEntry(entry.id, "workType", e.target.value)}
                  className="input-field"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Quantity</Label>
                <Input
                  type="number"
                  placeholder="0"
                  min="0"
                  value={entry.quantity}
                  onChange={(e) => updateWorkEntry(entry.id, "quantity", e.target.value)}
                  className="input-field"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Rate (₹)</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  value={entry.rate}
                  onChange={(e) => updateWorkEntry(entry.id, "rate", e.target.value)}
                  className="input-field"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Subtotal</Label>
                <div className="h-10 px-3 flex items-center bg-muted/50 rounded-md border border-border">
                  <span className="text-sm font-semibold text-accent">
                    ₹{((parseFloat(entry.quantity) || 0) * (parseFloat(entry.rate) || 0)).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addWorkEntry}
            className="w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Another Work
          </Button>
        </div>

        <div className="bg-muted/50 rounded-xl p-4 border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Salary</p>
              <p className="text-xs text-muted-foreground/80">
                ({workEntries.length} work{workEntries.length > 1 ? 's' : ''})
              </p>
            </div>
            <div className="text-right">
              <p className="font-display text-3xl font-bold text-accent">
                ₹{totalSalary.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full btn-primary flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          {isSubmitting ? "Adding..." : "Add Labour"}
        </Button>
      </form>
    </div>
  );
};

export default LabourForm;
