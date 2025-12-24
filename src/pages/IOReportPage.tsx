import { useEffect, useState, useRef } from "react";
import { FileText, Download, RefreshCw, Search, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface IOData {
  ioNumber: string;
  totalQuantity: number;
  labours: {
    name: string;
    quantity: number;
    workType: string;
  }[];
}

const IOReportPage = () => {
  const [ioData, setIoData] = useState<IOData[]>([]);
  const [filteredData, setFilteredData] = useState<IOData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const reportRef = useRef<HTMLDivElement>(null);

  const fetchIOReport = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("labours")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Parse and group data by IO number
      const ioMap = new Map<string, IOData>();

      (data || []).forEach((labour) => {
        // Parse labour name: "Name | IO | WorkType | Advance | ESI | LastWeek | Extra"
        const parts = labour.name.split(" | ");
        if (parts.length < 3) return;

        const labourName = parts[0].trim();
        const ioNumber = parts[1].trim();
        const workType = parts[2].trim();
        const quantity = labour.pieces || 0;

        if (!ioNumber) return;

        if (!ioMap.has(ioNumber)) {
          ioMap.set(ioNumber, {
            ioNumber,
            totalQuantity: 0,
            labours: [],
          });
        }

        const ioEntry = ioMap.get(ioNumber)!;
        ioEntry.totalQuantity += quantity;
        ioEntry.labours.push({
          name: labourName,
          quantity,
          workType,
        });
      });

      // Convert map to array and sort by IO number
      const sortedIOData = Array.from(ioMap.values()).sort((a, b) => {
        const numA = parseInt(a.ioNumber) || 0;
        const numB = parseInt(b.ioNumber) || 0;
        return numA - numB;
      });

      setIoData(sortedIOData);
      setFilteredData(sortedIOData);
    } catch (error) {
      console.error("Error fetching IO report:", error);
      toast.error("Failed to load IO report");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchIOReport();
  }, []);

  // Search filter
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredData(ioData);
    } else {
      const filtered = ioData.filter((io) =>
        io.ioNumber.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredData(filtered);
    }
  }, [searchQuery, ioData]);

  const handleDownloadImage = async () => {
    if (!reportRef.current) return;

    try {
      toast.info("Generating image...");
      
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        logging: false,
      });

      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `IO_Report_${new Date().toISOString().split("T")[0]}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          toast.success("Image downloaded successfully");
        }
      });
    } catch (error) {
      console.error("Error downloading image:", error);
      toast.error("Failed to download image");
    }
  };

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;

    try {
      toast.info("Generating PDF...");

      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        logging: false,
      });

      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      const pdf = new jsPDF({
        orientation: imgHeight > imgWidth ? "portrait" : "landscape",
        unit: "mm",
      });

      const imgData = canvas.toDataURL("image/png");
      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
      pdf.save(`IO_Report_${new Date().toISOString().split("T")[0]}.pdf`);

      toast.success("PDF downloaded successfully");
    } catch (error) {
      console.error("Error downloading PDF:", error);
      toast.error("Failed to download PDF");
    }
  };

  const totalQuantityAll = filteredData.reduce((sum, io) => sum + io.totalQuantity, 0);
  const totalLaboursAll = filteredData.reduce((sum, io) => sum + io.labours.length, 0);

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-8">
      <Navigation />

      <main className="container mx-auto px-4 py-6 md:py-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header Section */}
          <div className="card-elevated p-4 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg gradient-accent flex items-center justify-center">
                  <FileText className="w-5 h-5 text-accent-foreground" />
                </div>
                <div>
                  <h1 className="font-display text-xl md:text-2xl font-bold text-foreground">
                    IO Report
                  </h1>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    Production summary grouped by IO Number
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchIOReport}
                  disabled={isLoading}
                  className="h-9"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadImage}
                  disabled={isLoading || filteredData.length === 0}
                  className="h-9"
                >
                  <ImageIcon className="w-4 h-4 mr-2" />
                  Image
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleDownloadPDF}
                  disabled={isLoading || filteredData.length === 0}
                  className="h-9"
                >
                  <Download className="w-4 h-4 mr-2" />
                  PDF
                </Button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="mt-4 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by IO Number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10"
              />
            </div>

            {/* Summary Stats */}
            {!isLoading && filteredData.length > 0 && (
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="bg-primary/10 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Total IOs</p>
                  <p className="text-lg md:text-xl font-bold text-primary">{filteredData.length}</p>
                </div>
                <div className="bg-primary/10 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Total Quantity</p>
                  <p className="text-lg md:text-xl font-bold text-primary">{totalQuantityAll}</p>
                </div>
                <div className="bg-primary/10 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Total Labours</p>
                  <p className="text-lg md:text-xl font-bold text-primary">{totalLaboursAll}</p>
                </div>
              </div>
            )}
          </div>

          {/* Report Content */}
          <div ref={reportRef} className="card-elevated p-4 md:p-6 bg-white">
            {/* Report Header for Download */}
            <div className="mb-6 text-center border-b-2 border-primary pb-4">
              <h2 className="text-2xl md:text-3xl font-bold text-primary">AR TEXTILES</h2>
              <p className="text-sm text-muted-foreground mt-1">IO Production Report</p>
              <p className="text-xs text-muted-foreground mt-1">
                Generated on {new Date().toLocaleDateString("en-IN", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredData.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">
                  {searchQuery ? "No IO found matching your search" : "No IO data available"}
                </p>
              </div>
            ) : (
              <>
                {/* Mobile View */}
                <div className="block md:hidden space-y-4">
                  {filteredData.map((io) => (
                    <Card key={io.ioNumber} className="border-2 border-primary/20">
                      <CardHeader className="pb-3 bg-primary/5">
                        <CardTitle className="text-base flex items-center justify-between">
                          <span className="text-primary">IO: {io.ioNumber}</span>
                          <span className="text-primary font-bold text-lg">
                            {io.totalQuantity} pcs
                          </span>
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {io.labours.length} labour(s) worked on this IO
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2 pt-3">
                        {io.labours.map((labour, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">
                                {labour.name}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {labour.workType}
                              </p>
                            </div>
                            <div className="text-base font-bold text-primary ml-2">
                              {labour.quantity}
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Desktop View */}
                <div className="hidden md:block overflow-x-auto rounded-lg border-2 border-primary/20">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-primary/10 hover:bg-primary/10">
                        <TableHead className="font-bold text-primary">IO Number</TableHead>
                        <TableHead className="font-bold text-primary">Labour Name</TableHead>
                        <TableHead className="font-bold text-primary">Work Type</TableHead>
                        <TableHead className="font-bold text-primary text-right">Quantity</TableHead>
                        <TableHead className="font-bold text-primary text-right">IO Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredData.map((io) => (
                        <>
                          {io.labours.map((labour, idx) => (
                            <TableRow key={`${io.ioNumber}-${idx}`} className="hover:bg-muted/50">
                              {idx === 0 ? (
                                <TableCell
                                  rowSpan={io.labours.length}
                                  className="font-bold text-lg text-primary border-r-2 border-primary/20 bg-primary/5"
                                >
                                  {io.ioNumber}
                                </TableCell>
                              ) : null}
                              <TableCell className="font-medium">{labour.name}</TableCell>
                              <TableCell className="text-muted-foreground">
                                {labour.workType}
                              </TableCell>
                              <TableCell className="text-right font-semibold text-base">
                                {labour.quantity}
                              </TableCell>
                              {idx === 0 ? (
                                <TableCell
                                  rowSpan={io.labours.length}
                                  className="text-right font-bold text-xl text-primary border-l-2 border-primary/20 bg-primary/5"
                                >
                                  {io.totalQuantity}
                                </TableCell>
                              ) : null}
                            </TableRow>
                          ))}
                          <TableRow>
                            <TableCell colSpan={5} className="h-2 bg-primary/5"></TableCell>
                          </TableRow>
                        </>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Footer Summary */}
                <div className="mt-6 pt-4 border-t-2 border-primary">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Total IOs</p>
                      <p className="text-xl font-bold text-primary">{filteredData.length}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Total Quantity</p>
                      <p className="text-xl font-bold text-primary">{totalQuantityAll}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Total Labours</p>
                      <p className="text-xl font-bold text-primary">{totalLaboursAll}</p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      <footer className="py-6 border-t border-border mt-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} AR TEXTILES — Garment Manufacturing
          </p>
        </div>
      </footer>
    </div>
  );
};

export default IOReportPage;
