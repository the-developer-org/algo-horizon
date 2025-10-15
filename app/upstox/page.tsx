"use client";
import * as React from "react";
import { SidebarInset } from "@/components/ui/sidebar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useEffect } from "react";
import { fetchUpstoxHistoricalData, fetchUpstoxIntradayData } from "@/components/utils/upstoxApi";
import { isMarketHours } from "@/utils/upstoxUtils";
import { useMemo, useState } from "react";
import toast from 'react-hot-toast';

export default function UpstoxPage() {
    const accounts = useMemo(
        () => [
            "All accounts",
            "Nawaz",
            "Sadiq",
            "Yasmeen",
            "Samreen",
            "Mudassir",
            "Tasneem"
        ],
        []
    );
    const [selectedAccount, setSelectedAccount] = useState<string>(accounts[0]);
    const featureTabs = useMemo(
        () => [
            "Overview",
            "Place order",
            "Open orders",
            "Completed orders",
            "Positions",
            "Holdings",
            "Funds & ledger",
            "P&L & reconciliation",
        ],
        []
    );
    const [activeFeature, setActiveFeature] = React.useState<string>(featureTabs[0]);

    // Company search state - per account
    const [keyMapping, setKeyMapping] = React.useState<{ [companyName: string]: string }>({});
    const [searchTerms, setSearchTerms] = React.useState<{ [account: string]: string }>({});
    const [suggestions, setSuggestions] = React.useState<{ [account: string]: string[] }>({});
    const [selectedCompanies, setSelectedCompanies] = React.useState<{ [account: string]: string }>({});
    const [selectedInstrumentKeys, setSelectedInstrumentKeys] = React.useState<{ [account: string]: string }>({});
    const [lastClosingPrices, setLastClosingPrices] = React.useState<{ [account: string]: number | null }>({});
    const [isLoadingPrices, setIsLoadingPrices] = React.useState<{ [account: string]: boolean }>({});

    // Order form state - per account
    const [orderForms, setOrderForms] = React.useState<{ [account: string]: {
        instrumentKey: string;
        quantity: string;
        transactionType: string;
        orderType: string;
        product: string;
        price: string;
        triggerPrice: string;
        validity: string;
    } }>({});

    // Get current account data
    const searchTerm = searchTerms[selectedAccount] || '';
    const currentSuggestions = suggestions[selectedAccount] || [];
    const selectedCompany = selectedCompanies[selectedAccount] || '';
    const selectedInstrumentKey = selectedInstrumentKeys[selectedAccount] || '';
    const lastClosingPrice = lastClosingPrices[selectedAccount] || null;
    const isLoadingPrice = isLoadingPrices[selectedAccount] || false;
    const orderForm = orderForms[selectedAccount] || {
        instrumentKey: '',
        quantity: '',
        transactionType: 'Buy',
        orderType: 'Market',
        product: 'Intraday',
        price: '',
        triggerPrice: '',
        validity: 'Day'
    };

    // Fetch KeyMapping from Redis on mount
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
                console.error('Failed to load company data');
            });
    }, []);

    // Update suggestions as user types
    React.useEffect(() => {
        if (!searchTerm) {
            setSuggestions(prev => ({ ...prev, [selectedAccount]: [] }));
            return;
        }
        const matches = Object.keys(keyMapping)
            .filter(name => name.toLowerCase().includes(searchTerm.toLowerCase()))
            .slice(0, 8);
        setSuggestions(prev => ({ ...prev, [selectedAccount]: matches }));
    }, [searchTerm, keyMapping, selectedAccount]);

    // Handle selection from suggestions
    const handleSelectCompany = (companyName: string) => {
        const instrumentKey = keyMapping[companyName];
        setSelectedCompanies(prev => ({ ...prev, [selectedAccount]: companyName }));
        setSelectedInstrumentKeys(prev => ({ ...prev, [selectedAccount]: instrumentKey }));
        setSearchTerms(prev => ({ ...prev, [selectedAccount]: companyName }));
        setSuggestions(prev => ({ ...prev, [selectedAccount]: [] }));
        setOrderForms(prev => ({
            ...prev,
            [selectedAccount]: {
                ...orderForm,
                instrumentKey: instrumentKey
            }
        }));
        // Fetch the last closing price
        fetchLastClosingPrice(instrumentKey);
    };

    // Fetch last closing price for the selected instrument
    const fetchLastClosingPrice = async (instrumentKey: string) => {
        if (!instrumentKey) return;

        setIsLoadingPrices(prev => ({ ...prev, [selectedAccount]: true }));
        try {
            const apiKey = localStorage.getItem('upstoxApiKey');
            if (!apiKey) {
                console.warn('No Upstox API key found');
                setLastClosingPrices(prev => ({ ...prev, [selectedAccount]: null }));
                return;
            }

            // Fetch from our API route
            const fromDate = new Date();
            fromDate.setDate(fromDate.getDate() - 4); // 7 days ago

    type Candle = { open: number; close: number; [key: string]: any };
    type IntradayResult = { candles?: Candle[] } | Candle[];

    const result: IntradayResult = await fetchUpstoxIntradayData(
        instrumentKey,
        apiKey,
        'minutes',
        '1',
    );

    let candles: Candle[] = [];
    if (Array.isArray(result)) {
        candles = result;
    } else if (typeof result === 'object' && result !== null && 'candles' in result && Array.isArray((result as any).candles)) {
        candles = (result as { candles: Candle[] }).candles;
    }

    if (candles.length > 0) {
        // Assuming candles are sorted with newest first

        const currentPrice = candles[0].close;

        setLastClosingPrices(prev => ({ ...prev, [selectedAccount]: currentPrice }));
    }
    } catch (error) {
      console.error('Failed to fetch last closing price:', error);
      setLastClosingPrices(prev => ({ ...prev, [selectedAccount]: null }));
        } finally {
            setIsLoadingPrices(prev => ({ ...prev, [selectedAccount]: false }));
        }
    };

    const handleInputChange = (field: string, value: string) => {
        setOrderForms(prev => ({
            ...prev,
            [selectedAccount]: {
                ...orderForm,
                [field]: value
            }
        }));
    };

    const handleSubmitOrder = async () => {
        if (!selectedInstrumentKey) {
            toast.error('Please select a company first');
            return;
        }

        if (!orderForm.quantity || parseInt(orderForm.quantity) <= 0) {
            toast.error('Please enter a valid quantity');
            return;
        }

        const apiKey = localStorage.getItem('upstoxApiKey');
        if (!apiKey) {
            toast.error('No Upstox API key found. Please set your API key first.');
            return;
        }

        try {
            const response = await fetch('/api/upstox/order', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    apiKey,
                    quantity: orderForm.quantity,
                    product: orderForm.product,
                    validity: orderForm.validity,
                    price: orderForm.price,
                    tag: `order-${selectedAccount}-${Date.now()}`,
                    instrumentKey: selectedInstrumentKey,
                    orderType: orderForm.orderType,
                    transactionType: orderForm.transactionType,
                    disclosedQuantity: orderForm.quantity, // Keep same as quantity
                    triggerPrice: orderForm.triggerPrice || undefined,
                    isAmo: false, // Default to false for now
                    slice: false // Default to false for now
                }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                toast.success('Order placed successfully!');
                // Reset form after successful submission
                setOrderForms(prev => ({
                    ...prev,
                    [selectedAccount]: {
                        instrumentKey: '',
                        quantity: '',
                        transactionType: 'Buy',
                        orderType: 'Market',
                        product: 'Intraday',
                        price: '',
                        triggerPrice: '',
                        validity: 'Day'
                    }
                }));
                // Clear selected company
                setSelectedCompanies(prev => ({ ...prev, [selectedAccount]: '' }));
                setSelectedInstrumentKeys(prev => ({ ...prev, [selectedAccount]: '' }));
                setLastClosingPrices(prev => ({ ...prev, [selectedAccount]: null }));
            } else {
                toast.error(data.error || 'Failed to place order');
            }
        } catch (error) {
            console.error('Order submission error:', error);
            toast.error('Failed to submit order. Please try again.');
        }
    };

    return (
        <SidebarInset className="flex min-h-screen flex-col overflow-y-auto py-6 px-4 bg-gradient-to-b from-sky-50 via-blue-50 to-blue-100 dark:from-[#0b1220] dark:via-[#0a0f1a] dark:to-black">
            <div className="max-w-8xl w-full mx-auto upstox-theme rounded-2xl bg-white/70 dark:bg-slate-900/40 ring-1 ring-black/10 dark:ring-white/10 shadow-sm backdrop-blur p-4 sm:p-6">

                {/* Upstox brand banner */}
                <div className="mt-3 rounded-lg upstox-banner text-white">
                    <div className="px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Link href="/" className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 bg-white/15 hover:bg-white/20 text-white text-sm transition-colors">
                                <ArrowLeft className="h-4 w-4" />
                                <span>Back</span>
                            </Link>
                            <div className="h-6 w-6 rounded bg-white/30" aria-hidden />
                            <span className="font-medium tracking-wide">Upstox integration</span>
                        </div>
                        <span className="text-xs bg-white/15 px-2 py-1 rounded-md">Beta</span>
                    </div>
                </div>
                {/* Header: both tab bars (accounts + features) */}
                <div className="mt-6">
                    <Tabs value={activeFeature} onValueChange={setActiveFeature}>
                        <div className="border-b pb-3 space-y-3 sticky top-0 z-20 bg-white/70 dark:bg-slate-900/40 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-slate-900/30">
                            {/* Accounts tabs (header) */}
                            <div className="overflow-x-auto">
                                <Tabs value={selectedAccount} onValueChange={setSelectedAccount}>
                                    <TabsList className="min-w-max bg-transparent p-0 gap-2">
                                        {accounts.map((name) => (
                                            <TabsTrigger
                                                key={name}
                                                value={name}
                                                className="text-sm rounded-md px-3 py-1.5 border border-transparent hover:border-blue-300/60 transition-colors data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 dark:data-[state=active]:bg-blue-950/40 dark:data-[state=active]:text-blue-300"
                                            >
                                                {name}
                                            </TabsTrigger>
                                        ))}
                                    </TabsList>
                                </Tabs>
                            </div>
                      
                            {/* Feature tabs (header) */}
                            <div className="overflow-x-auto">
                                <TabsList className="min-w-max bg-transparent p-0 gap-1">
                                    {featureTabs.map((t) => (
                                        <TabsTrigger
                                            key={t}
                                            value={t}
                                            className="text-sm px-3 py-2 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-700 dark:data-[state=active]:text-blue-300"
                                        >
                                            {t}
                                        </TabsTrigger>
                                    ))}
                                </TabsList>
                            </div>
                        </div>

                        {/* Body: feature content */}
                        <div className="pt-4">
                            {/* Overview */}
                            <TabsContent value="Overview" className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <div className="h-5 w-1 rounded bg-blue-600 dark:bg-blue-500" />
                                    <h3 className="text-lg font-semibold text-blue-700 dark:text-blue-300">Account overview</h3>
                                </div>

                            </TabsContent>

                            {/* Place Order */}
                            <TabsContent value="Place order" className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <div className="h-5 w-1 rounded bg-blue-600 dark:bg-blue-500" />
                                    <h3 className="text-lg font-semibold text-blue-700 dark:text-blue-300">Place order</h3>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="Search for a company..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerms(prev => ({ ...prev, [selectedAccount]: e.target.value }))}
                                            className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
                                        />
                                        {currentSuggestions.length > 0 && (
                                            <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto mt-1">
                                                {currentSuggestions.map((company) => (
                                                    <button
                                                        key={company}
                                                        type="button"
                                                        className="w-full text-left px-3 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                                                        onClick={() => handleSelectCompany(company)}
                                                    >
                                                        {company}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    {selectedCompany && (
                                        <div className="p-2 bg-green-50 border border-green-200 rounded-md">
                                            <p className="text-sm text-green-800">
                                                {isLoadingPrice && <span className="ml-2 text-green-600">Loading price...</span>}
                                                {!isLoadingPrice && lastClosingPrice !== null && (
                                                    <span className="ml-2 text-green-600">
                                                        Last Closing Price: <strong>₹{lastClosingPrice.toFixed(2)}</strong>
                                                    </span>
                                                )}
                                                {!isLoadingPrice && lastClosingPrice === null && (
                                                    <span className="ml-2 text-red-600">Price not available</span>
                                                )}
                                            </p>
                                        </div>
                                    )}
                                    <input
                                        className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
                                        type="number"
                                        placeholder="Quantity"
                                        value={orderForm.quantity}
                                        onChange={(e) => handleInputChange('quantity', e.target.value)}
                                    />
                                    <select
                                        className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
                                        value={orderForm.orderType}
                                        onChange={(e) => handleInputChange('orderType', e.target.value)}
                                    >
                                        <option>Market</option>
                                        <option>Limit</option>
                                        <option>SL</option>
                                        <option>SL-M</option>
                                    </select>
                                    <select
                                        className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
                                        value={orderForm.product}
                                        onChange={(e) => handleInputChange('product', e.target.value)}
                                    >
                                        <option>Intraday</option>
                                        <option>Delivery</option>
                                    </select>
                                    <input
                                        className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
                                        type="number"
                                        placeholder="Trigger price (if SL)"
                                        value={orderForm.triggerPrice}
                                        onChange={(e) => handleInputChange('triggerPrice', e.target.value)}
                                    />
                                    <select
                                        className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
                                        value={orderForm.validity}
                                        onChange={(e) => handleInputChange('validity', e.target.value)}
                                    >
                                        <option>Day</option>
                                        <option>IOC</option>
                                    </select>
                                </div>
                                <button className="mt-2 btn-upstox" onClick={handleSubmitOrder}>
                                    Submit order for {selectedAccount}
                                </button>
                            </TabsContent>

                            {/* Open Orders */}
                            <TabsContent value="Open orders" className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <div className="h-5 w-1 rounded bg-blue-600 dark:bg-blue-500" />
                                    <h3 className="text-lg font-semibold text-blue-700 dark:text-blue-300">Open orders</h3>
                                </div>
                                <div className="upstox-surface rounded p-3 text-sm text-muted-foreground">No open orders to display.</div>
                            </TabsContent>

                            {/* Completed Orders */}
                            <TabsContent value="Completed orders" className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <div className="h-5 w-1 rounded bg-blue-600 dark:bg-blue-500" />
                                    <h3 className="text-lg font-semibold text-blue-700 dark:text-blue-300">Completed orders</h3>
                                </div>
                                <div className="upstox-surface rounded p-3 text-sm text-muted-foreground">No completed orders to display.</div>
                            </TabsContent>

                            {/* Positions */}
                            <TabsContent value="Positions" className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <div className="h-5 w-1 rounded bg-blue-600 dark:bg-blue-500" />
                                    <h3 className="text-lg font-semibold text-blue-700 dark:text-blue-300">Positions</h3>
                                </div>
                                <div className="upstox-surface rounded p-3 text-sm text-muted-foreground">No positions to display.</div>
                            </TabsContent>

                            {/* Holdings */}
                            <TabsContent value="Holdings" className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <div className="h-5 w-1 rounded bg-blue-600 dark:bg-blue-500" />
                                    <h3 className="text-lg font-semibold text-blue-700 dark:text-blue-300">Holdings</h3>
                                </div>
                                <div className="upstox-surface rounded p-3 text-sm text-muted-foreground">No holdings to display.</div>
                            </TabsContent>

                            {/* Funds & Ledger */}
                            <TabsContent value="Funds & ledger" className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <div className="h-5 w-1 rounded bg-blue-600 dark:bg-blue-500" />
                                    <h3 className="text-lg font-semibold text-blue-700 dark:text-blue-300">Funds & ledger</h3>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <label className="text-muted-foreground" htmlFor="ledger-period">Period:</label>
                                    <select id="ledger-period" className="border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500/60">
                                        <option>Week</option>
                                        <option>Month</option>
                                        <option>Custom</option>
                                    </select>
                                </div>
                                <div className="upstox-surface rounded p-3 text-sm text-muted-foreground">No ledger entries to display.</div>
                            </TabsContent>

                            {/* PnL & Recon */}
                            <TabsContent value="P&L & reconciliation" className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <div className="h-5 w-1 rounded bg-blue-600 dark:bg-blue-500" />
                                    <h3 className="text-lg font-semibold text-blue-700 dark:text-blue-300">P&amp;L &amp; reconciliation</h3>
                                </div>

                            </TabsContent>
                        </div>
                    </Tabs>
                </div>
            </div>
        </SidebarInset>
    );
}
