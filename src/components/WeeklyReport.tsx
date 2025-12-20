import { useEffect, useState } from "react";
import { Calendar, Download, TrendingUp, Users, Wallet, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  total_salary: number;
  advance: number;
  created_at: string;
}

interface WeeklySummary {
  weekStart: Date;
  weekEnd: Date;
  labours: {
    name: string;
    totalSalary: number;
    advance: number;
    finalAmount: number;
    worksCount: number;
  }[];
  totalSalary: number;
  totalAdvance: number;
  totalPayout: number;
}

const WeeklyReport = () => {
  const [weeklySummaries, setWeeklySummaries] = useState<WeeklySummary[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<string>("0");
  const [isLoading, setIsLoading] = useState(true);
  const downloadRef = useState<HTMLDivElement | null>(null)[0];

  const getWeekRange = (date: Date): { start: Date; end: Date } => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
    const weekStart = new Date(d.setDate(diff));
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    
    return { start: weekStart, end: weekEnd };
  };

  const fetchWeeklyData = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("labours")
        .select("id, name, total_salary, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Group data by week
      const weeklyMap = new Map<string, Labour[]>();
      
      (data || []).forEach((labour) => {
        const labourDate = new Date(labour.created_at);
        const { start } = getWeekRange(labourDate);
        const weekKey = start.toISOString().split('T')[0];
        
        if (!weeklyMap.has(weekKey)) {
          weeklyMap.set(weekKey, []);
        }
        
        const parts = labour.name.split(' | ');
        const advance = parseFloat(parts[3] || '0');
        weeklyMap.get(weekKey)!.push({ ...labour, advance });
      });

      // Create weekly summaries
      const summaries: WeeklySummary[] = [];
      
      weeklyMap.forEach((labours, weekKey) => {
        const weekStart = new Date(weekKey);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);

        // Group by labour name
        const labourMap = new Map<string, {
          totalSalary: number;
          advance: number;
          worksCount: number;
        }>();

        labours.forEach((labour) => {
          const baseName = labour.name.split(' | ')[0];
          
          if (!labourMap.has(baseName)) {
            labourMap.set(baseName, {
              totalSalary: 0,
              advance: 0,
              worksCount: 0,
            });
          }
          
          const labourData = labourMap.get(baseName)!;
          labourData.totalSalary += labour.total_salary || 0;
          labourData.advance += labour.advance || 0;
          labourData.worksCount += 1;
        });

        const laboursList = Array.from(labourMap.entries()).map(([name, data]) => ({
          name,
          totalSalary: data.totalSalary,
          advance: data.advance,
          finalAmount: data.totalSalary - data.advance,
          worksCount: data.worksCount,
        }));

        const totalSalary = laboursList.reduce((sum, l) => sum + l.totalSalary, 0);
        const totalAdvance = laboursList.reduce((sum, l) => sum + l.advance, 0);
        const totalPayout = totalSalary - totalAdvance;

        summaries.push({
          weekStart,
          weekEnd,
          labours: laboursList,
          totalSalary,
          totalAdvance,
          totalPayout,
        });
      });

      summaries.sort((a, b) => b.weekStart.getTime() - a.weekStart.getTime());
      setWeeklySummaries(summaries);
    } catch (error) {
      console.error("Error fetching weekly data:", error);
      toast.error("Failed to load weekly reports");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWeeklyData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentSummary = weeklySummaries[parseInt(selectedWeek)] || null;

  const formatWeekRange = (start: Date, end: Date) => {
    return `${start.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} - ${end.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`;
  };

  const downloadAsImage = async () => {
    const element = document.getElementById("weekly-report-content");
    if (!element) {
      toast.error("Content not found");
      return;
    }

    try {
      const canvas = await html2canvas(element, {
        backgroundColor: "#ffffff",
        scale: 2,
        logging: false,
      });

      const link = document.createElement("a");
      const fileName = `weekly-report-${currentSummary?.weekStart.toISOString().split('T')[0]}.jpg`;
      link.download = fileName;
      link.href = canvas.toDataURL("image/jpeg", 0.95);
      link.click();

      toast.success("Downloaded as image");
    } catch (error) {
      console.error("Error generating image:", error);
      toast.error("Failed to generate image");
    }
  };

  const downloadAsPDF = async () => {
    const element = document.getElementById("weekly-report-content");
    if (!element) {
      toast.error("Content not found");
      return;
    }

    try {
      const canvas = await html2canvas(element, {
        backgroundColor: "#ffffff",
        scale: 2,
        logging: false,
      });

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

      const fileName = `weekly-report-${currentSummary?.weekStart.toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);

      toast.success("Downloaded as PDF");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF");
    }
  };

  return (
    <div className="card-elevated p-4 md:p-6 animate-fade-in" style={{ animationDelay: "0.2s" }}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center">
            <Calendar className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-display text-lg md:text-xl font-bold text-foreground">
              Weekly Salary Report
            </h2>
            <p className="text-xs md:text-sm text-muted-foreground">
              Weekly labour payment summary
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={selectedWeek} onValueChange={setSelectedWeek}>
            <SelectTrigger className="w-full sm:w-[200px] md:w-[250px]">
              <SelectValue placeholder="Select week" />
            </SelectTrigger>
            <SelectContent>
              {weeklySummaries.map((summary, index) => (
                <SelectItem key={index} value={index.toString()}>
                  {formatWeekRange(summary.weekStart, summary.weekEnd)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      ) : weeklySummaries.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
            <FileText className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">No weekly data available</p>
          <p className="text-sm text-muted-foreground/70">
            Add labour records to see weekly reports
          </p>
        </div>
      ) : currentSummary ? (
        <>
          <div id="weekly-report-content" className="space-y-4 md:space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              <Card className="border-accent/20">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardDescription className="text-xs">Total Labours</CardDescription>
                  <CardTitle className="text-xl md:text-2xl flex items-center gap-2">
                    <Users className="w-4 h-4 md:w-5 md:h-5 text-accent" />
                    {currentSummary.labours.length}
                  </CardTitle>
                </CardHeader>
              </Card>

              <Card className="border-green-500/20">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardDescription className="text-xs">Total Salary</CardDescription>
                  <CardTitle className="text-xl md:text-2xl flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-green-500" />
                    ₹{currentSummary.totalSalary.toFixed(2)}
                  </CardTitle>
                </CardHeader>
              </Card>

              <Card className="border-red-500/20">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardDescription className="text-xs">Total Advance</CardDescription>
                  <CardTitle className="text-xl md:text-2xl flex items-center gap-2">
                    <Wallet className="w-4 h-4 md:w-5 md:h-5 text-red-500" />
                    ₹{currentSummary.totalAdvance.toFixed(2)}
                  </CardTitle>
                </CardHeader>
              </Card>

              <Card className="border-accent/30 bg-accent/5">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardDescription className="text-xs font-semibold">Final Payout</CardDescription>
                  <CardTitle className="text-xl md:text-2xl flex items-center gap-2 text-accent">
                    <Wallet className="w-4 h-4 md:w-5 md:h-5" />
                    ₹{currentSummary.totalPayout.toFixed(2)}
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>

            {/* Labour Details Table */}
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 md:p-4 text-xs md:text-sm font-semibold text-foreground">
                        Labour Name
                      </th>
                      <th className="text-center p-3 md:p-4 text-xs md:text-sm font-semibold text-foreground hidden sm:table-cell">
                        Works
                      </th>
                      <th className="text-right p-3 md:p-4 text-xs md:text-sm font-semibold text-foreground">
                        Salary
                      </th>
                      <th className="text-right p-3 md:p-4 text-xs md:text-sm font-semibold text-foreground hidden md:table-cell">
                        Advance
                      </th>
                      <th className="text-right p-3 md:p-4 text-xs md:text-sm font-semibold text-foreground">
                        Final
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentSummary.labours.map((labour, index) => (
                      <tr
                        key={index}
                        className="border-t border-border hover:bg-muted/30 transition-colors"
                      >
                        <td className="p-3 md:p-4">
                          <div>
                            <p className="font-medium text-sm md:text-base text-foreground">
                              {labour.name}
                            </p>
                            <p className="text-xs text-muted-foreground sm:hidden">
                              {labour.worksCount} work{labour.worksCount !== 1 ? 's' : ''}
                            </p>
                            {labour.advance > 0 && (
                              <p className="text-xs text-red-500 md:hidden mt-1">
                                Adv: ₹{labour.advance.toFixed(2)}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="p-3 md:p-4 text-center text-sm md:text-base text-muted-foreground hidden sm:table-cell">
                          {labour.worksCount}
                        </td>
                        <td className="p-3 md:p-4 text-right font-semibold text-sm md:text-base text-green-600">
                          ₹{labour.totalSalary.toFixed(2)}
                        </td>
                        <td className="p-3 md:p-4 text-right font-semibold text-sm md:text-base text-red-500 hidden md:table-cell">
                          {labour.advance > 0 ? `₹${labour.advance.toFixed(2)}` : '-'}
                        </td>
                        <td className="p-3 md:p-4 text-right font-bold text-sm md:text-base text-accent">
                          ₹{labour.finalAmount.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-accent/10 border-t-2 border-accent">
                    <tr>
                      <td className="p-3 md:p-4 font-bold text-sm md:text-base text-foreground">
                        Total
                      </td>
                      <td className="p-3 md:p-4 text-center font-semibold text-sm md:text-base hidden sm:table-cell">
                        {currentSummary.labours.reduce((sum, l) => sum + l.worksCount, 0)}
                      </td>
                      <td className="p-3 md:p-4 text-right font-bold text-sm md:text-base text-green-600">
                        ₹{currentSummary.totalSalary.toFixed(2)}
                      </td>
                      <td className="p-3 md:p-4 text-right font-bold text-sm md:text-base text-red-500 hidden md:table-cell">
                        ₹{currentSummary.totalAdvance.toFixed(2)}
                      </td>
                      <td className="p-3 md:p-4 text-right font-bold text-base md:text-lg text-accent">
                        ₹{currentSummary.totalPayout.toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Summary Box */}
            <div className="bg-gradient-to-r from-accent/10 to-accent/5 border border-accent/20 rounded-xl p-4 md:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
                <div className="text-center sm:text-left">
                  <p className="text-xs md:text-sm text-muted-foreground mb-1">Week Period</p>
                  <p className="font-semibold text-sm md:text-base text-foreground">
                    {formatWeekRange(currentSummary.weekStart, currentSummary.weekEnd)}
                  </p>
                </div>
                <div className="text-center sm:text-left">
                  <p className="text-xs md:text-sm text-muted-foreground mb-1">Total Works</p>
                  <p className="font-semibold text-sm md:text-base text-foreground">
                    {currentSummary.labours.reduce((sum, l) => sum + l.worksCount, 0)} work(s)
                  </p>
                </div>
                <div className="text-center sm:text-left">
                  <p className="text-xs md:text-sm text-muted-foreground mb-1">Average per Labour</p>
                  <p className="font-semibold text-sm md:text-base text-accent">
                    ₹{(currentSummary.totalPayout / currentSummary.labours.length).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Download Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 mt-6 pt-4 border-t border-border">
            <Button
              onClick={downloadAsImage}
              variant="outline"
              className="w-full sm:w-auto"
            >
              <Download className="w-4 h-4 mr-2" />
              Download as Image
            </Button>
            <Button
              onClick={downloadAsPDF}
              variant="outline"
              className="w-full sm:w-auto"
            >
              <Download className="w-4 h-4 mr-2" />
              Download as PDF
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
};

export default WeeklyReport;
