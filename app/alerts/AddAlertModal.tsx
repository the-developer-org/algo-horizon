"use client";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "react-hot-toast";
import { InstrumentQuote } from "./InstrumentQuote";
import { DerivativePicker, InstrumentKindTabs, modalTheme } from "./InstrumentPicker";
import { sessionClose, todaySessionClose, type InstrumentTab } from "./instrumentCatalog";

interface AddAlertModalProps extends Readonly<{
  open: boolean;
  onClose: () => void;
  onAdd: (alert: any) => void | Promise<void>;
}> {}

export function AddAlertModal({ open, onClose, onAdd }: AddAlertModalProps) {
  const [targetPrice, setTargetPrice] = useState("");
  const [entryPrice, setEntryPrice] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [keyMapping, setKeyMapping] = useState<{ [companyName: string]: string }>({});
      const [searchTerm, setSearchTerm] = useState('');
      const [suggestions, setSuggestions] = useState<string[]>([]);
      const [selectedCompany, setSelectedCompany] = useState<string>('');
      const [selectedInstrumentKey, setSelectedInstrumentKey] = useState<string>('');
      const [tab, setTab] = useState<InstrumentTab>('stocks');
      const [picked, setPicked] = useState<{ name: string; key: string; expiry?: string } | null>(null);

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
          const key = keyMapping[companyName];
          if (!key) return;
          setSelectedCompany(companyName);
          setSelectedInstrumentKey(key);
          setSearchTerm(companyName);
          setSuggestions([]);
          setPicked({ name: companyName, key });
        };

  useEffect(() => {
    if (!open) {
      setTab('stocks');
      setPicked(null);
      setSelectedCompany('');
      setSearchTerm('');
    }
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

  const parsePrice = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  const parsedTarget = parsePrice(targetPrice);
  const parsedEntry = parsePrice(entryPrice);
  const parsedStopLoss = parsePrice(stopLoss);
  const hasAnyPrice = parsedTarget !== undefined || parsedEntry !== undefined || parsedStopLoss !== undefined;
  const canSubmit = !!picked && hasAnyPrice;
  const theme = modalTheme(tab);
  const mappedCompanies = Object.entries(keyMapping)
    .map(([name, key]) => ({ name, key }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const switchTab = (next: InstrumentTab) => {
    setTab(next);
    setPicked(null);
    setSelectedCompany('');
    setSearchTerm('');
  };

  const handleSubmit = async () => {
    if (!canSubmit || !picked) return;
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 30);
    const tickSource = tab === 'options' ? 'STOCK_OPTIONS' : tab === 'indexes' ? 'INDEX' : 'ALGO_ALERTS';
    const expiryDate = tab === 'options'
      ? (picked.expiry ? sessionClose(picked.expiry) : undefined)
      : tab === 'indexes'
        ? todaySessionClose()
        : expiry.toISOString().slice(0, 19);
    if (!expiryDate) {
      toast.error('Option expiry is missing');
      return;
    }
    try {
      await onAdd({
        companyName: picked.name,
        instrumentKey: picked.key,
        alertType: "PRICE_REACHED",
        ...(parsedTarget !== undefined ? { targetPrice: parsedTarget } : {}),
        ...(parsedEntry !== undefined ? { entryPrice: parsedEntry } : {}),
        ...(parsedStopLoss !== undefined ? { stopLoss: parsedStopLoss } : {}),
        priceBasedExit: true,
        tickSource,
        expiryDate,
      });
      setTargetPrice("");
      setEntryPrice("");
      setStopLoss("");
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add alert");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className={`max-w-md ${theme.shell}`}>
        <DialogHeader>
          <DialogTitle className={theme.title}>Add New Alert</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <InstrumentKindTabs tab={tab} onChange={switchTab} />
          {tab === 'stocks' ? (
            <div>
              <Input
                value={picked ? picked.name : searchTerm}
                onChange={(event) => {
                  setPicked(null);
                  setSelectedCompany('');
                  setSearchTerm(event.target.value);
                }}
                placeholder="Search company…"
                autoComplete="off"
                className={`w-full ${theme.input}`}
              />
              {searchTerm.trim() && !picked && (
                <div className="mt-2 max-h-48 space-y-1 overflow-y-auto">
                  {suggestions.map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => handleSelectCompany(name)}
                      className="block w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-left text-sm text-gray-800 hover:bg-green-50"
                    >
                      {name}
                    </button>
                  ))}
                  {suggestions.length === 0 && (
                    <p className="py-3 text-center text-xs text-gray-500">No matching companies.</p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <DerivativePicker
              key={tab}
              tab={tab}
              companies={mappedCompanies}
              onPick={setPicked}
            />
          )}
          {picked && tab !== 'stocks' && (
            <p className={`text-xs font-semibold ${theme.muted}`}>{picked.name}</p>
          )}
          {picked && <InstrumentQuote instrumentKey={picked.key} tab={tab} />}
          <Input
            type="number"
            placeholder="Target Price"
            value={targetPrice}
            onChange={e => setTargetPrice(e.target.value)}
            className={`w-full ${theme.input}`}
          />
          <Input
            type="number"
            placeholder="Entry Price"
            value={entryPrice}
            onChange={e => setEntryPrice(e.target.value)}
            className={`w-full ${theme.input}`}
          />
          <Input
            type="number"
            placeholder="Stop Loss"
            value={stopLoss}
            onChange={e => setStopLoss(e.target.value)}
            className={`w-full ${theme.input}`}
          />
          <p className={`text-xs ${theme.muted}`}>
            At least one price is required.
            {tab === 'options' ? ' Expiry is the option expiry at 3:30pm.' : tab === 'indexes' ? ' Expiry is today at 3:30pm.' : ' Expiry is set to 30 days.'}
          </p>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={!canSubmit} className={`w-full font-bold ${theme.button}`}>
            Add Alert
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
