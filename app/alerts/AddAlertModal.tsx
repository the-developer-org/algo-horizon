"use client";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "react-hot-toast";

interface Company {
  companyName: string;
  instrumentKey: string;
}


interface AddAlertModalProps extends Readonly<{
  open: boolean;
  onClose: () => void;
  onAdd: (alert: any) => void;
}> {}

export function AddAlertModal({ open, onClose, onAdd }: AddAlertModalProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [targetPrice, setTargetPrice] = useState("");
  const [duration, setDuration] = useState("");
  const [loading, setLoading] = useState(false);
      const [keyMapping, setKeyMapping] = useState<{ [companyName: string]: string }>({});
      const [searchTerm, setSearchTerm] = useState('');
      const [suggestions, setSuggestions] = useState<string[]>([]);
      const [selectedCompany, setSelectedCompany] = useState<string>('');
      const [selectedInstrumentKey, setSelectedInstrumentKey] = useState<string>('');

       useEffect(() => {
          if (!searchTerm) {
            setSuggestions([]);
            return;
          }
          const matches = Object.keys(keyMapping)
            .filter(name => name.toLowerCase().includes(searchTerm.toLowerCase()))
            .slice(0, 8);
          setSuggestions(matches);
        }, [searchTerm, keyMapping]);
      
        // Handle selection from suggestions
        const handleSelectCompany = (companyName: string) => {
          setSelectedCompany(companyName);
          setSelectedInstrumentKey(keyMapping[companyName]);
          setSearchTerm(companyName);
          setSuggestions([]);
        };

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/stryke-list`)
      .then(res => res.json())
      .then(data => setCompanies(Array.isArray(data) ? data : []))
      .catch(() => setCompanies([]))
      .finally(() => setLoading(false));
  }, [open]);
  
   useEffect(() => {

    fetch("https://saved-dassie-60359.upstash.io/get/KeyMapping", {
      method: "GET",
      headers: {
        Authorization: `Bearer AevHAAIjcDE5ZjcwOWVlMmQzNWI0MmE5YTA0NzgxN2VhN2E0MTNjZHAxMA`,
      },
    })
      .then(res => res.json())
      .then(data => {
        const mapping = JSON.parse(data.result);
        setKeyMapping(mapping);

      })
      .catch(() => {
        toast.error('Failed to load company data');

      });


  }, []);

  const handleSubmit = () => {
    if (!selectedCompany || !targetPrice || !duration) return;
    const company = companies.find(c => c.instrumentKey === selectedCompany);
    if (!company) return;
    onAdd({
      companyName: company.companyName,
      instrumentKey: company.instrumentKey,
      targetPrice: parseFloat(targetPrice),
      duration: parseInt(duration, 10)
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Alert</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Select value={selectedCompany} onValueChange={setSelectedCompany} disabled={loading}>
            <SelectTrigger className="w-full">Select Company</SelectTrigger>
            <SelectContent>
              {companies.map(c => (
                <SelectItem key={c.instrumentKey} value={c.instrumentKey}>
                  {c.companyName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="number"
            placeholder="Target Price"
            value={targetPrice}
            onChange={e => setTargetPrice(e.target.value)}
            className="w-full"
          />
          <Input
            type="number"
            placeholder="Duration (minutes)"
            value={duration}
            onChange={e => setDuration(e.target.value)}
            className="w-full"
          />
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={loading || !selectedCompany || !targetPrice || !duration} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold">
            Add Alert
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
