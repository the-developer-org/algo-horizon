"use client";
import * as React from "react";
import { useEffect, useMemo, useState, useCallback } from "react";
import { SidebarInset } from "@/components/ui/sidebar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { fetchUpstoxIntradayData, fetchUpstoxHistoricalData } from "@/components/utils/upstoxApi";
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
            "Tasneem",
            "Abrar"
        ],
        []
    );

    // Account to phone number mapping
    const accountPhoneMapping = useMemo(
        () => ({
            "Nawaz": "9876543210",
            "Sadiq": "9876543211",
            "Yasmeen": "9876543212",
            "Samreen": "9876543213",
            "Mudassir": "9876543214",
            "Tasneem": "9876543215",
            "Abrar": "8885615779"
        }),
        []
    );
    const [selectedAccount, setSelectedAccount] = useState<string>(accounts[0]);
    const featureTabs = useMemo(
        () => [
            "Overview",
            "Place order",
            "Open Trades",
            "Completed Trades",
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

    // Live price indicator
    const [isLivePrice, setIsLivePrice] = useState<boolean>(false);
    const [disclosedQuantityEnabled, setDisclosedQuantityEnabled] = React.useState<{ [account: string]: boolean }>({});

    // Trade history interfaces
    interface TradeData {
        exchange: string;
        segment: string;
        optionType: string;
        quantity: number;
        amount: number;
        tradeId: string;
        tradeDate: string;
        transactionType: string;
        scripName: string;
        strikePrice: string;
        expiry: string;
        price: number;
        isin: string;
        symbol: string;
        instrumentToken: string;
    }

    interface TradeHistoryResponse {
        status: 'success' | 'error' | 'SUCCESS' | 'ERROR';
        data: TradeData[];
        message?: string;
        metaData?: any;
    }

    // Trade history state
    const [tradeHistory, setTradeHistory] = useState<{ [account: string]: TradeData[] }>({});
    const [isLoadingTradeHistory, setIsLoadingTradeHistory] = useState<{ [account: string]: boolean }>({});
    const [selectedFinancialYear, setSelectedFinancialYear] = useState<string>('2024-25');
    
    // Financial year options
    const financialYearOptions = [
        { value: '2025-26', label: 'FY 2025-26 (Apr 2025 - Mar 2026)', startDate: '2025-04-01', endDate: '2026-03-31' },
        { value: '2024-25', label: 'FY 2024-25 (Apr 2024 - Mar 2025)', startDate: '2024-04-01', endDate: '2025-03-31' },
        { value: '2023-24', label: 'FY 2023-24 (Apr 2023 - Mar 2024)', startDate: '2023-04-01', endDate: '2024-03-31' },
        ];
    
    // Get current financial year date range
    const currentFinancialYear = financialYearOptions.find(fy => fy.value === selectedFinancialYear);
    const tradeHistoryDateRange = {
        startDate: currentFinancialYear?.startDate || '2024-04-01',
        endDate: currentFinancialYear?.endDate || '2025-03-31'
    };

    // All accounts mode state
    const [useSameQuantityForAll, setUseSameQuantityForAll] = useState<boolean>(true);
    const [sameQuantityForAll, setSameQuantityForAll] = useState<string>('');

    // All accounts common form state
    const [allAccountsForm, setAllAccountsForm] = useState({
        transactionType: 'Buy',
        orderType: 'Market',
        product: 'Delivery',
        validity: 'Day',
        triggerPrice: ''
    });

    // Account capital/funds state - per account
    const [accountFunds, setAccountFunds] = useState<{ [account: string]: number }>({
        "Nawaz": 100000, // Default ₹1 lakh
        "Sadiq": 100000,
        "Yasmeen": 100000,
        "Samreen": 100000,
        "Mudassir": 100000,
        "Tasneem": 100000
    });

    // Order form state - per account
    const [orderForms, setOrderForms] = useState<{
        [account: string]: {
            instrumentKey: string;
            quantity: string;
            disclosedQuantity: string;
            transactionType: string;
            orderType: string;
            product: string;
            price: string;
            triggerPrice: string;
            validity: string;
        }
    }>({});

    // Get current account data
    const searchTerm = searchTerms[selectedAccount] || '';
    const currentSuggestions = suggestions[selectedAccount] || [];
    const selectedCompany = selectedCompanies[selectedAccount] || '';
    const selectedInstrumentKey = selectedInstrumentKeys[selectedAccount] || '';
    const lastClosingPrice = lastClosingPrices[selectedAccount] || null;
    const isLoadingPrice = isLoadingPrices[selectedAccount] || false;
    const isDisclosedQuantityEnabled = disclosedQuantityEnabled[selectedAccount] || false;
    const orderForm = selectedAccount === 'All accounts'
        ? {
            instrumentKey: '',
            quantity: '',
            disclosedQuantity: '',
            ...allAccountsForm,
            price: ''
        }
        : orderForms[selectedAccount] || {
            instrumentKey: '',
            quantity: '',
            transactionType: 'Buy',
            orderType: 'Market',
            product: 'Delivery',
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
    useEffect(() => {
        if (!searchTerm || selectedCompany) {
            setSuggestions(prev => ({ ...prev, [selectedAccount]: [] }));
            return;
        }
        const matches = Object.keys(keyMapping)
            .filter(name => name.toLowerCase().includes(searchTerm.toLowerCase()))
            .slice(0, 8);
        setSuggestions(prev => ({ ...prev, [selectedAccount]: matches }));
    }, [searchTerm, keyMapping, selectedAccount, selectedCompany]);

    // Live price polling during market hours
    useEffect(() => {
        const checkMarketHoursAndPoll = () => {
            const now = new Date();
            const currentHour = now.getHours();
            const currentMinute = now.getMinutes();
            const currentDay = now.getDay();

            const isWeekday = currentDay >= 1 && currentDay <= 5;
            const isMarketOpenTime = (currentHour > 9 || (currentHour === 9 && currentMinute >= 15)) &&
                                   (currentHour < 15 || (currentHour === 15 && currentMinute <= 30));
            const isCurrentlyMarketHours = isWeekday && isMarketOpenTime;

            setIsLivePrice(isCurrentlyMarketHours);

            if (isCurrentlyMarketHours && selectedInstrumentKey) {
                console.log('Market is open, fetching live price...');
                // Poll every 30 seconds during market hours
                const intervalId = setInterval(() => {
                    fetchLastClosingPrice(selectedInstrumentKey, true);
                }, 30000); // 30 seconds

                return () => clearInterval(intervalId);
            }
        };

        // Check immediately and set up periodic checks
        checkMarketHoursAndPoll();
        const statusCheckInterval = setInterval(checkMarketHoursAndPoll, 60000); // Check market status every minute

        return () => clearInterval(statusCheckInterval);
    }, [selectedInstrumentKey]);

    // Fetch trade history when Completed Trades tab is activated
    useEffect(() => {
        if (activeFeature === 'Completed Trades') {
            fetchTradeHistory(selectedAccount);
        }
    }, [activeFeature, selectedAccount, selectedFinancialYear]);

    // Handle selection from suggestions
    const handleSelectCompany = (companyName: string) => {
        const instrumentKey = keyMapping[companyName];
        setSelectedCompanies(prev => ({ ...prev, [selectedAccount]: companyName }));
        setSelectedInstrumentKeys(prev => ({ ...prev, [selectedAccount]: instrumentKey }));
        setSearchTerms(prev => ({ ...prev, [selectedAccount]: companyName }));
        setSuggestions(prev => ({ ...prev, [selectedAccount]: [] })); // Clear suggestions immediately
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

    const isOrderMarketOrLimit = () =>{
        return orderForm.orderType === 'Market' || orderForm.orderType === 'Limit'
    }

    // Fetch last closing price for the selected instrument
    const fetchLastClosingPrice = async (instrumentKey: string, isPollingUpdate = false) => {
        if (!instrumentKey) return;

        if (!isPollingUpdate) {
            setIsLoadingPrices(prev => ({ ...prev, [selectedAccount]: true }));
        }
        try {
            const apiKey = localStorage.getItem('upstoxApiKey');
            if (!apiKey) {
                console.warn('No Upstox API key found');
                setLastClosingPrices(prev => ({ ...prev, [selectedAccount]: null }));
                return;
            }

            // Check market hours: Monday-Friday, 9:15 AM to 3:30 PM
            const now = new Date();
            const currentHour = now.getHours();
            const currentMinute = now.getMinutes();
            const currentDay = now.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday

            // Market is open Monday-Friday, 9:15 AM - 3:30 PM
            const isWeekday = currentDay >= 1 && currentDay <= 5;
            const isMarketOpenTime = (currentHour > 9 || (currentHour === 9 && currentMinute >= 15)) &&
                                   (currentHour < 15 || (currentHour === 15 && currentMinute <= 30));
            const isMarketHours = isWeekday && isMarketOpenTime;

            type Candle = { open: number; close: number;[key: string]: any };
            type IntradayResult = { candles?: Candle[] } | Candle[];

            let result: IntradayResult;
            let candles: Candle[] = [];

            if (!isMarketHours) {
                // Outside market hours, use historical data
                const toDate = new Date();
                let fromDate = new Date();

                // Calculate days to go back based on current day
                const currentDay = now.getDay(); // 0=Sunday, 1=Monday, 6=Saturday
                let daysBack = 2; // Default: previous day

                if (currentDay === 1) { // Monday
                    daysBack = 4; // Friday (skip Sunday and Saturday)
                } else if (currentDay === 0) { // Sunday
                    daysBack = 3; // Friday (skip Saturday)
                }
                // Saturday uses default daysBack = 1 (Friday)

                fromDate.setDate(fromDate.getDate() - daysBack);

                const historicalResult = await fetchUpstoxHistoricalData(
                    instrumentKey,
                    'days',
                    '1',
                    toDate.toISOString().split('T')[0], // YYYY-MM-DD format
                    fromDate.toISOString().split('T')[0],
                    apiKey
                );

                candles = historicalResult.candles || [];
            } else {
                // During market hours, use intraday data
                result = await fetchUpstoxIntradayData(
                    instrumentKey,
                    apiKey,
                    'minutes',
                    '1',
                );

                if (Array.isArray(result)) {
                    candles = result;
                } else if (typeof result === 'object' && result !== null && 'candles' in result && Array.isArray((result as any).candles)) {
                    candles = (result as { candles: Candle[] }).candles;
                }
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
            if (!isPollingUpdate) {
                setIsLoadingPrices(prev => ({ ...prev, [selectedAccount]: false }));
            }
        }
    };

    const handleInputChange = (field: string, value: string) => {
        if (selectedAccount === 'All accounts') {
            // Update all accounts form for common fields
            if (['transactionType', 'orderType', 'product', 'validity', 'triggerPrice'].includes(field)) {
                setAllAccountsForm(prev => ({
                    ...prev,
                    [field]: value,
                    // Clear trigger price when switching to Market order
                    ...(field === 'orderType' && value === 'Market' && { triggerPrice: '' })
                }));
            }

            // For all accounts mode, update all individual account forms
            const updatedForms = { ...orderForms };
            accounts.slice(1).forEach(account => { // Skip 'All accounts' itself
                if (!updatedForms[account]) {
                    updatedForms[account] = {
                        instrumentKey: '',
                        quantity: '',
                        disclosedQuantity: '',
                        transactionType: 'Buy',
                        orderType: 'Market',
                        product: 'Delivery',
                        price: '',
                        triggerPrice: '',
                        validity: 'Day'
                    };
                }
                updatedForms[account] = {
                    ...updatedForms[account],
                    [field]: value,
                    // Clear trigger price when switching to Market order
                    ...(field === 'orderType' && value === 'Market' && { triggerPrice: '' })
                };
            });
            setOrderForms(updatedForms);
        } else {
            setOrderForms(prev => ({
                ...prev,
                [selectedAccount]: {
                    ...orderForm,
                    [field]: value,
                    // Clear trigger price when switching to Market order
                    ...(field === 'orderType' && value === 'Market' && { triggerPrice: '' })
                }
            }));
        }
    };

    const handleSameQuantityChange = (value: string) => {
        setSameQuantityForAll(value);
        // Update all individual account quantities
        const updatedForms = { ...orderForms };
        accounts.slice(1).forEach(account => {
            if (updatedForms[account]) {
                updatedForms[account] = {
                    ...updatedForms[account],
                    quantity: value
                };
            }
        });
        setOrderForms(updatedForms);
    };

    const handleIndividualQuantityChange = (account: string, value: string) => {
        setOrderForms(prev => ({
            ...prev,
            [account]: {
                ...prev[account],
                quantity: value
            }
        }));
    };

    // Helper functions for capital calculation
    const getCapitalInfo = (account: string, quantity: string) => {
        const funds = accountFunds[account] || 0;
        const qty = parseInt(quantity) || 0;
        const price = lastClosingPrice || 0;
        const totalCost = qty * price;
        const capitalRemaining = funds - totalCost;
        const purchasableStocks = Math.floor(funds / price);

        return {
            capitalRemaining,
            purchasableStocks
        };
    };

    // Helper functions for API mapping
    const mapProductToApi = (product: string) => {
        switch (product) {
            case 'Delivery': return 'D';
            case 'Intraday': return 'I';
            default: return 'I';
        }
    };

    const mapOrderTypeToApi = (orderType: string) => {
        switch (orderType) {
            case 'Market': return 'MARKET';
            case 'Limit': return 'LIMIT';
            case 'Stop Loss - M': return 'SLM';
            default: return 'MARKET';
        }
    };

    // Validation function for order data
    const validateOrderData = (orderForm: any, accountName?: string) => {
        const errors: string[] = [];
        const prefix = accountName ? `${accountName}: ` : '';

        // Required field validations
        if (!orderForm?.instrumentKey) {
            errors.push(`${prefix}Please select a company`);
        }

        if (!orderForm?.quantity || parseInt(orderForm.quantity) <= 0) {
            errors.push(`${prefix}Please enter a valid quantity (must be greater than 0)`);
        }

        if (!orderForm?.product) {
            errors.push(`${prefix}Please select a product type`);
        }

        if (!orderForm?.validity) {
            errors.push(`${prefix}Please select validity period`);
        }

        if (!orderForm?.orderType) {
            errors.push(`${prefix}Please select order type`);
        }

        if (!orderForm?.transactionType) {
            errors.push(`${prefix}Please select transaction type (Buy/Sell)`);
        }

        // Order type specific validations
        if (orderForm.orderType === 'Limit') {
            if (!orderForm.price || parseFloat(orderForm.price) <= 0) {
                errors.push(`${prefix}Price is required for Limit orders`);
            }
        }

        if (orderForm.orderType === 'Stop Loss - M') {
            if (!orderForm.triggerPrice || parseFloat(orderForm.triggerPrice) <= 0) {
                errors.push(`${prefix}Trigger price is required for Stop Loss orders`);
            }
        }

        // Disclosed quantity validations
        if (orderForm.disclosedQuantity) {
            const disclosedQty = parseInt(orderForm.disclosedQuantity);
            const quantity = parseInt(orderForm.quantity);

            if (disclosedQty <= 0) {
                errors.push(`${prefix}Disclosed quantity must be greater than 0`);
            }

            if (disclosedQty > quantity) {
                errors.push(`${prefix}Disclosed quantity cannot be greater than total quantity`);
            }

            // Disclosed quantity should be less than total quantity for meaningful disclosure
            if (disclosedQty >= quantity) {
                errors.push(`${prefix}Disclosed quantity should be less than total quantity`);
            }
        }

        // Price validations for limit orders
        if (orderForm.price && parseFloat(orderForm.price) < 0) {
            errors.push(`${prefix}Price cannot be negative`);
        }

        // Trigger price validations
        if (orderForm.triggerPrice && parseFloat(orderForm.triggerPrice) < 0) {
            errors.push(`${prefix}Trigger price cannot be negative`);
        }

        // Quantity limits (reasonable bounds)
        const quantity = parseInt(orderForm.quantity);
        if (quantity > 1000000) { // Arbitrary large limit
            errors.push(`${prefix}Quantity seems unreasonably high. Please verify.`);
        }

        return { isValid: errors.length === 0, errors };
    };

    const handleDisclosedQuantityToggle = (enabled: boolean) => {
        if (selectedAccount === 'All accounts') {
            // For all accounts mode, update all accounts
            const updatedEnabled = { ...disclosedQuantityEnabled };
            accounts.slice(1).forEach(account => {
                updatedEnabled[account] = enabled;
                if (!enabled) {
                    setOrderForms(prev => ({
                        ...prev,
                        [account]: {
                            ...prev[account],
                            disclosedQuantity: ''
                        }
                    }));
                }
            });
            setDisclosedQuantityEnabled(updatedEnabled);
        } else {
            setDisclosedQuantityEnabled(prev => ({
                ...prev,
                [selectedAccount]: enabled
            }));
            // Clear disclosed quantity when disabled
            if (!enabled) {
                setOrderForms(prev => ({
                    ...prev,
                    [selectedAccount]: {
                        ...orderForm,
                        disclosedQuantity: ''
                    }
                }));
            }
        }
    };

    // Fetch trade history for an account
    const fetchTradeHistory = useCallback(async (account: string) => {
        if (account === 'All accounts') {
            // Fetch for all individual accounts
            const accountsToProcess = accounts.slice(1);
            accountsToProcess.forEach(acc => fetchTradeHistory(acc));
            return;
        }

        const phoneNumber = (accountPhoneMapping as Record<string, string>)[account];
        if (!phoneNumber) {
            console.error(`No phone number found for account: ${account}`);
            return;
        }

        setIsLoadingTradeHistory(prev => ({ ...prev, [account]: true }));

        try {
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';
            const context = '/api/upstox/';
            
            const response = await fetch(
                `${backendUrl}${context}orders/get-trade-history?phoneNumber=${phoneNumber}&startDate=${tradeHistoryDateRange.startDate}&endDate=${tradeHistoryDateRange.endDate}`,
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            );

            const data: TradeHistoryResponse = await response.json();
            
            console.log('Trade history API response for', account, ':', data);
            console.log('Response status:', response.status, response.ok);
            console.log('Data status:', data.status);
            console.log('Data array:', data.data);
            console.log('Data array length:', data.data?.length);

            if (response.ok && (data.status === 'success' || data.status === 'SUCCESS')) {
                console.log('Setting trade history for', account, 'with data:', data.data);
                toast.success(`Trade history loaded for ${account}: ${data.data?.length || 0} trades found`);
                setTradeHistory(prev => {
                    const newState = {
                        ...prev,
                        [account]: data.data || []
                    };
                    console.log('New trade history state:', newState);
                    return newState;
                });
            } else {
                console.error('Failed to fetch trade history:', data);
                toast.error(`Failed to fetch trade history for ${account}: ${data.message || 'Unknown error'}`);
                setTradeHistory(prev => ({
                    ...prev,
                    [account]: []
                }));
            }
        } catch (error) {
            console.error('Trade history fetch error:', error);
            setTradeHistory(prev => ({
                ...prev,
                [account]: []
            }));
        } finally {
            setIsLoadingTradeHistory(prev => ({ ...prev, [account]: false }));
        }
    }, [accounts, accountPhoneMapping, selectedFinancialYear]);

    const handleSubmitOrder = async () => {
        const apiKey = localStorage.getItem('upstoxApiKey');
        if (!apiKey) {
            toast.error('No Upstox API key found. Please set your API key first.');
            return;
        }

        if (selectedAccount === 'All accounts') {
            // Validate all accounts have required data
            const accountsToProcess = accounts.slice(1); // Skip 'All accounts'
            const validationErrors: string[] = [];

            accountsToProcess.forEach(account => {
                const accountForm = orderForms[account];
                const accountValidation = validateOrderData(accountForm, account);
                validationErrors.push(...accountValidation.errors);
            });

            if (validationErrors.length > 0) {
                toast.error(`Validation errors:\n${validationErrors.join('\n')}`);
                return;
            }

            // Prepare batch order requests
            const orderRequests = accountsToProcess.map(account => {
                const accountForm = orderForms[account];
                const phoneNumber = (accountPhoneMapping as Record<string, string>)[account];

                return {
                    phoneNumber: phoneNumber,
                    isSandbox: false, // Assuming production, adjust as needed
                    orderData: {
                        quantity: parseInt(accountForm.quantity),
                        product: mapProductToApi(accountForm.product),
                        validity: accountForm.validity.toUpperCase(),
                        price: parseFloat(accountForm.price) || 0,
                        tag: `order-${account}-${Date.now()}`,
                        instrumentToken: accountForm.instrumentKey,
                        orderType: mapOrderTypeToApi(accountForm.orderType),
                        transactionType: accountForm.transactionType.toUpperCase(),
                        disclosedQuantity: (disclosedQuantityEnabled[account] && accountForm.disclosedQuantity) ? parseInt(accountForm.disclosedQuantity) : 0,
                        triggerPrice: accountForm.triggerPrice ? parseFloat(accountForm.triggerPrice) : 0,
                        isAmo: false,
                        slice: false
                    }
                };
            });

            try {
                const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';
                const context = '/api/upstox/';
                const response = await fetch(`${backendUrl}${context}orders/batch-order`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(orderRequests),
                });

                const data = await response.json();

                if (response.ok && Array.isArray(data)) {
                    const successCount = data.filter((result: any) => result.success !== false).length;
                    const totalCount = data.length;
                    toast.success(`Orders completed: ${successCount}/${totalCount} successful`);

                    // Clear form data for successful orders
                    accountsToProcess.forEach(account => {
                        setOrderForms(prev => ({
                            ...prev,
                            [account]: {
                                instrumentKey: '',
                                quantity: '',
                                disclosedQuantity: '',
                                transactionType: 'Buy',
                                orderType: 'Market',
                                product: 'Delivery',
                                price: '',
                                triggerPrice: '',
                                validity: 'Day'
                            }
                        }));
                        setSelectedCompanies(prev => ({ ...prev, [account]: '' }));
                        setSelectedInstrumentKeys(prev => ({ ...prev, [account]: '' }));
                        setLastClosingPrices(prev => ({ ...prev, [account]: null }));
                    });
                } else {
                    toast.error('Failed to place batch orders');
                }
            } catch (error) {
                console.error('Batch order submission error:', error);
                toast.error('Failed to submit batch orders. Please try again.');
            }

        } else {
            // Single account order validation
            const validation = validateOrderData(orderForm);
            if (!validation.isValid) {
                toast.error(`Validation errors:\n${validation.errors.join('\n')}`);
                return;
            }

            try {
                // Get phone number for the selected account
                const phoneNumber = (accountPhoneMapping as Record<string, string>)[selectedAccount];
                console.log('Submitting order for account:', selectedAccount, 'with phone number:', phoneNumber);
                const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';
                const context = '/api/upstox/';
            
                const response = await fetch(`${backendUrl}${context}orders/place-order`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        phoneNumber: phoneNumber,
                        isSandbox: true,
                        orderData: {
                            quantity: parseInt(orderForm.quantity),
                            product: mapProductToApi(orderForm.product),
                            validity: orderForm.validity.toUpperCase(),
                            price: parseFloat(orderForm.price) || 0,
                            tag: `order-${selectedAccount}-${Date.now()}`,
                            instrumentToken: selectedInstrumentKey,
                            orderType: mapOrderTypeToApi(orderForm.orderType),
                            transactionType: orderForm.transactionType.toUpperCase(),
                            disclosedQuantity: (isDisclosedQuantityEnabled && orderForm.disclosedQuantity) ? parseInt(orderForm.disclosedQuantity) : 0,
                            triggerPrice: orderForm.triggerPrice ? parseFloat(orderForm.triggerPrice) : 0,
                            isAmo: false,
                            slice: false
                        }
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
                            disclosedQuantity: '',
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
        }
    };

    return (
        <SidebarInset className="flex min-h-screen flex-col overflow-y-auto py-6 px-4 bg-gradient-to-b from-sky-50 via-[var(--upx-primary-50)] to-[rgba(84,32,135,0.1)] dark:from-[#0b1220] dark:via-[#0a0f1a] dark:to-black">


            <div className="max-w-8xl w-full mx-auto upstox-theme rounded-2xl bg-white/70 dark:bg-slate-900/40 ring-1 ring-black/10 dark:ring-white/10 shadow-sm backdrop-blur p-4 sm:p-6">

                {/* Upstox brand banner */}
                <div className="flex"> <Link href="/" className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 bg-[rgba(84, 32, 135, 1)] hover:bg-[rgba(84,32,135,0.20)] text-[rgba(84, 32, 135, 1)] text-sm transition-colors">
                    <ArrowLeft className="h-10 w-10 text-[rgba(84,32,135,1)]" />

                </Link>
                    <img
                        src="https://assets.upstox.com/website/images/upstox-new-logo.svg"
                        alt="Upstox"
                        className="h-14 w-50 rounded"
                    />
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
                                                className="text-sm rounded-md px-3 py-1.5 border border-transparent hover:border-[var(--upx-primary)]/60 transition-colors data-[state=active]:bg-[var(--upx-primary-50)] data-[state=active]:text-[var(--upx-primary)] dark:data-[state=active]:bg-[var(--upx-primary-50)] dark:data-[state=active]:text-[var(--upx-primary-300)]"
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
                                            className="text-sm px-3 py-2 rounded-none border-b-2 border-transparent data-[state=active]:border-[var(--upx-primary)] data-[state=active]:text-[var(--upx-primary)] dark:data-[state=active]:text-[var(--upx-primary-300)]"
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
                                    <div className="h-5 w-1 rounded bg-[var(--upx-primary)]" />
                                    <h3 className="text-lg font-semibold text-[var(--upx-primary)] dark:text-[var(--upx-primary-300)]">Account overview</h3>
                                </div>

                            </TabsContent>

                            {/* Place Order */}
                            <TabsContent value="Place order" className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <div className="h-5 w-1 rounded bg-[var(--upx-primary)]" />
                                    <h3 className="text-lg font-semibold text-[var(--upx-primary)] dark:text-[var(--upx-primary-300)]">Place order</h3>
                                    <div className="flex items-center gap-2 ml-5">
                                        <label htmlFor="disclosed-quantity-input" className="text-sm font-medium text-[var(--upx-primary-300)]">Add Disclosed Qty</label>
                                        <button
                                            type="button"
                                            onClick={() => handleDisclosedQuantityToggle(!isDisclosedQuantityEnabled)}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--upx-primary)] focus:ring-offset-2 ${isDisclosedQuantityEnabled ? 'bg-[var(--upx-primary)]' : 'bg-gray-200'
                                                }`}
                                        >
                                            <span
                                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isDisclosedQuantityEnabled ? 'translate-x-6' : 'translate-x-1'
                                                    }`}
                                            />
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-6">
                                    {/* Company Selection Section */}
                                    <div className="flex gap-4 items-start">
                                        {/* Search Input - Reduced Width */}
                                        <div className="relative flex-1 max-w-md">
                                            <input
                                                type="text"
                                                placeholder="Search for a company..."
                                                value={searchTerm}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    setSearchTerms(prev => ({ ...prev, [selectedAccount]: value }));
                                                    // Clear selected company when user starts typing again
                                                    if (selectedCompany && value !== selectedCompany) {
                                                        setSelectedCompanies(prev => ({ ...prev, [selectedAccount]: '' }));
                                                        setSelectedInstrumentKeys(prev => ({ ...prev, [selectedAccount]: '' }));
                                                    }
                                                }}
                                                onBlur={() => {
                                                    // Clear suggestions when input loses focus
                                                    setTimeout(() => setSuggestions(prev => ({ ...prev, [selectedAccount]: [] })), 150);
                                                }}
                                                className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--upx-primary)]/60 ${selectedCompany
                                                        ? 'bg-[var(--upx-primary-50)] border-[var(--upx-border)] text-[var(--upx-primary-700)] font-medium'
                                                        : ''
                                                    }`}
                                            />
                                            {currentSuggestions.length > 0 && (
                                                <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto mt-1">
                                                    {currentSuggestions.map((company) => (
                                                        <button
                                                            key={company}
                                                            type="button"
                                                            className="w-full text-left px-3 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                handleSelectCompany(company);
                                                            }}
                                                        >
                                                            {company}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Live Price Display */}
                                        {selectedCompany && (
                                            <div className="flex-1 max-w-md p-2.5 bg-[var(--upx-primary-50)] border border-[var(--upx-border)] rounded-md">
                                                <div className="text-sm">
                                                    <div className="text-[var(--upx-primary-700)]">
                                                        {isLoadingPrice && <span>Loading price...</span>}
                                                        {!isLoadingPrice && lastClosingPrice !== null && (
                                                            <div className="flex items-center gap-2">
                                                                <span>
                                                                    {isLivePrice ? 'Live Price:' : 'Last Recorded Price:'}
                                                                    <strong className="text-md text-[var(--upx-primary)] ml-1">₹{lastClosingPrice.toFixed(2)}</strong>
                                                                </span>
                                                                {isLivePrice && (
                                                                    <div className="flex items-center gap-1">
                                                                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                                                                        <span className="text-xs text-red-600 font-medium">LIVE</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                        {!isLoadingPrice && lastClosingPrice === null && (
                                                            <span className="text-red-600">Price not available</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Order Details Section */}
                                    {selectedAccount === 'All accounts' ? (
                                        /* All Accounts Mode */
                                        <div className="space-y-6">
                                            {/* Quantity Mode Toggle */}
                                            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                                                <span className="text-sm font-medium text-gray-700">Quantity Mode:</span>
                                                <div className="flex gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setUseSameQuantityForAll(true)}
                                                        className={`px-3 py-1 text-sm rounded-md border transition-all duration-200 ${
                                                            useSameQuantityForAll
                                                                ? 'bg-[var(--upx-primary)] text-white border-[var(--upx-primary)]'
                                                                : 'bg-white border-gray-300 hover:border-[var(--upx-primary)]/60 text-gray-700'
                                                        }`}
                                                    >
                                                        Same for all accounts
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setUseSameQuantityForAll(false)}
                                                        className={`px-3 py-1 text-sm rounded-md border transition-all duration-200 ${
                                                            !useSameQuantityForAll
                                                                ? 'bg-[var(--upx-primary)] text-white border-[var(--upx-primary)]'
                                                                : 'bg-white border-gray-300 hover:border-[var(--upx-primary)]/60 text-gray-700'
                                                        }`}
                                                    >
                                                        Individual quantities
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Quantity Inputs */}
                                            {useSameQuantityForAll ? (
                                                /* Same Quantity for All */
                                                <div>
                                                    <label htmlFor="same-quantity-input" className="block text-sm font-medium text-gray-700 mb-1">
                                                        Quantity for all accounts <span className="text-red-500">*</span>
                                                    </label>
                                                    <div className="flex gap-0">
                                                        {/* Quantity Input - Left Half */}
                                                        <input
                                                            id="same-quantity-input"
                                                            className="flex-1 border rounded-l px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--upx-primary)]/60 border-r-0"
                                                            type="number"
                                                            placeholder="Enter quantity"
                                                            value={sameQuantityForAll}
                                                            onChange={(e) => handleSameQuantityChange(e.target.value)}
                                                        />
                                                        {/* Capital Info - Right Half */}
                                                        <div className="flex-1 bg-gray-50 border rounded-r px-3 py-2 text-xs text-gray-600 border-l-0">
                                                            {(() => {
                                                                const capitalInfo = getCapitalInfo(selectedAccount, sameQuantityForAll);
                                                                return (
                                                                    <div className="flex flex-col justify-center h-full">
                                                                        <div>₹{capitalInfo.capitalRemaining.toFixed(2)} Capital Rem.</div>
                                                                        <div>Max {capitalInfo.purchasableStocks} can be purchased</div>
                                                                    </div>
                                                                );
                                                            })()}
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                /* Individual Quantities */
                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                                    {accounts.slice(1).map((account) => (
                                                        <div key={account}>
                                                            <label htmlFor={`quantity-${account}`} className="block text-sm font-medium text-gray-700 mb-1">
                                                                {account} <span className="text-red-500">*</span>
                                                            </label>
                                                            <input
                                                                id={`quantity-${account}`}
                                                                className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--upx-primary)]/60"
                                                                type="number"
                                                                placeholder={`Qty for ${account}`}
                                                                value={orderForms[account]?.quantity || ''}
                                                                onChange={(e) => handleIndividualQuantityChange(account, e.target.value)}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Common Order Fields */}
                                            <div className="grid grid-cols-2 gap-4">
                                                {/* Left Column */}
                                                <div className="space-y-4">
                                                    {/* Conditional Fields - Side by Side */}
                                                    {(!isOrderMarketOrLimit() || isDisclosedQuantityEnabled) && (
                                                        <div className="flex gap-3">
                                                            {!isOrderMarketOrLimit() && (
                                                                <div className="flex-1">
                                                                    <label htmlFor="trigger-price-input" className="block text-sm font-medium text-gray-700 mb-1">
                                                                        Trigger Price <span className="text-red-500">*</span>
                                                                    </label>
                                                                    <input
                                                                        id="trigger-price-input"
                                                                        className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--upx-primary)]/60"
                                                                        type="number"
                                                                        placeholder="Trigger price (for SL orders)"
                                                                        value={orderForm.triggerPrice}
                                                                        onChange={(e) => handleInputChange('triggerPrice', e.target.value)}
                                                                    />
                                                                </div>
                                                            )}
                                                            {isDisclosedQuantityEnabled && (
                                                                <div className="flex-1">
                                                                    <label htmlFor="disclosed-quantity-input" className="block text-sm font-medium text-gray-700 mb-1">
                                                                        Disclosed Quantity
                                                                    </label>
                                                                    <input
                                                                        id="disclosed-quantity-input"
                                                                        className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--upx-primary)]/60 ${!isDisclosedQuantityEnabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''
                                                                            }`}
                                                                        type="number"
                                                                        placeholder="Disclosed Qty"
                                                                        value={orderForm.disclosedQuantity || ''}
                                                                        onChange={(e) => handleInputChange('disclosedQuantity', e.target.value)}
                                                                        disabled={!isDisclosedQuantityEnabled}
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-700 mb-2">
                                                            Order Type <span className="text-red-500">*</span>
                                                        </div>
                                                        <div className="flex flex-wrap gap-2">
                                                            {['Market', 'Limit', 'Stop Loss - M'].map((type) => (
                                                                <button
                                                                    key={type}
                                                                    type="button"
                                                                    className={`px-4 py-2 text-sm rounded-md border transition-all duration-200 ${orderForm.orderType === type
                                                                            ? 'bg-[var(--upx-primary)] text-white border-[var(--upx-primary)] shadow-sm'
                                                                            : 'bg-white border-gray-300 hover:border-[var(--upx-primary)]/60 hover:bg-[var(--upx-primary)]/5 text-gray-700'
                                                                        }`}
                                                                    onClick={() => handleInputChange('orderType', type)}
                                                                >
                                                                    {type}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-700 mb-2">
                                                            Product <span className="text-red-500">*</span>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            {['Delivery', 'Intraday'].map((product) => (
                                                                <button
                                                                    key={product}
                                                                    type="button"
                                                                    className={`px-4 py-2 text-sm rounded-md border transition-all duration-200 ${orderForm.product === product
                                                                            ? 'bg-[var(--upx-primary)] text-white border-[var(--upx-primary)] shadow-sm'
                                                                            : 'bg-white border-gray-300 hover:border-[var(--upx-primary)]/60 hover:bg-[var(--upx-primary)]/5 text-gray-700'
                                                                        }`}
                                                                    onClick={() => handleInputChange('product', product)}
                                                                >
                                                                    {product}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-700 mb-2">
                                                            Validity <span className="text-red-500">*</span>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            {['Day', 'IOC'].map((validity) => (
                                                                <button
                                                                    key={validity}
                                                                    type="button"
                                                                    className={`px-4 py-2 text-sm rounded-md border transition-all duration-200 ${orderForm.validity === validity
                                                                            ? 'bg-[var(--upx-primary)] text-white border-[var(--upx-primary)] shadow-sm'
                                                                            : 'bg-white border-gray-300 hover:border-[var(--upx-primary)]/60 hover:bg-[var(--upx-primary)]/5 text-gray-700'
                                                                        }`}
                                                                    onClick={() => handleInputChange('validity', validity)}
                                                                >
                                                                    {validity}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Right Column - Empty for now */}
                                                <div className="space-y-4">
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        /* Individual Account Mode */
                                        <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
                                            {/* Left Column */}
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label htmlFor="quantity-input" className="block text-sm font-medium text-gray-700 mb-1">
                                                            Quantity <span className="text-red-500">*</span>
                                                        </label>
                                                        <div className="flex gap-0">
                                                            {/* Quantity Input - Left Half */}
                                                            <input
                                                                id="quantity-input"
                                                                className="flex-1 border rounded-l px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--upx-primary)]/60 border-r-0"
                                                                type="number"
                                                                placeholder="Enter quantity"
                                                                value={orderForm.quantity}
                                                                onChange={(e) => handleInputChange('quantity', e.target.value)}
                                                            />
                                                            {/* Capital Info - Right Half */}
                                                            <div className="flex-1 bg-gray-50 border rounded-r px-3 py-2 text-xs text-gray-600 border-l-0">
                                                                {(() => {
                                                                    const capitalInfo = getCapitalInfo(selectedAccount, orderForm.quantity);
                                                                    return (
                                                                        <div className="flex flex-col justify-center h-full">
                                                                            <div>₹{capitalInfo.capitalRemaining.toFixed(2)} Capital Rem.</div>
                                                                            <div>Max {capitalInfo.purchasableStocks} can be purchased</div>
                                                                        </div>
                                                                    );
                                                                })()}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Conditional Fields - Side by Side */}
                                                {(!isOrderMarketOrLimit() || isDisclosedQuantityEnabled) && (
                                                    <div className="flex gap-3">
                                                        {!isOrderMarketOrLimit() && (
                                                            <div className="flex-1">
                                                                <label htmlFor="trigger-price-input" className="block text-sm font-medium text-gray-700 mb-1">
                                                                    Trigger Price <span className="text-red-500">*</span>
                                                                </label>
                                                                <input
                                                                    id="trigger-price-input"
                                                                    className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--upx-primary)]/60"
                                                                    type="number"
                                                                    placeholder="Trigger price (for SL orders)"
                                                                    value={orderForm.triggerPrice}
                                                                    onChange={(e) => handleInputChange('triggerPrice', e.target.value)}
                                                                />
                                                            </div>
                                                        )}
                                                        {isDisclosedQuantityEnabled && (
                                                            <div className="flex-1">
                                                                <label htmlFor="disclosed-quantity-input" className="block text-sm font-medium text-gray-700 mb-1">
                                                                    Disclosed Quantity
                                                                </label>
                                                                <input
                                                                    id="disclosed-quantity-input"
                                                                    className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--upx-primary)]/60 ${!isDisclosedQuantityEnabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''
                                                                        }`}
                                                                    type="number"
                                                                    placeholder="Disclosed Qty"
                                                                    value={orderForm.disclosedQuantity || ''}
                                                                    onChange={(e) => handleInputChange('disclosedQuantity', e.target.value)}
                                                                    disabled={!isDisclosedQuantityEnabled}
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                                <div>
                                                    <div className="text-sm font-medium text-gray-700 mb-2">
                                                        Order Type <span className="text-red-500">*</span>
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        {['Market', 'Limit', 'Stop Loss - M'].map((type) => (
                                                            <button
                                                                key={type}
                                                                type="button"
                                                                className={`px-4 py-2 text-sm rounded-md border transition-all duration-200 ${orderForm.orderType === type
                                                                        ? 'bg-[var(--upx-primary)] text-white border-[var(--upx-primary)] shadow-sm'
                                                                        : 'bg-white border-gray-300 hover:border-[var(--upx-primary)]/60 hover:bg-[var(--upx-primary)]/5 text-gray-700'
                                                                    }`}
                                                                onClick={() => handleInputChange('orderType', type)}
                                                            >
                                                                {type}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="text-sm font-medium text-gray-700 mb-2">
                                                        Product <span className="text-red-500">*</span>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        {['Delivery', 'Intraday'].map((product) => (
                                                            <button
                                                                key={product}
                                                                type="button"
                                                                className={`px-4 py-2 text-sm rounded-md border transition-all duration-200 ${orderForm.product === product
                                                                        ? 'bg-[var(--upx-primary)] text-white border-[var(--upx-primary)] shadow-sm'
                                                                        : 'bg-white border-gray-300 hover:border-[var(--upx-primary)]/60 hover:bg-[var(--upx-primary)]/5 text-gray-700'
                                                                    }`}
                                                                onClick={() => handleInputChange('product', product)}
                                                            >
                                                                {product}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="text-sm font-medium text-gray-700 mb-2">
                                                        Validity <span className="text-red-500">*</span>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        {['Day', 'IOC'].map((validity) => (
                                                            <button
                                                                key={validity}
                                                                type="button"
                                                                className={`px-4 py-2 text-sm rounded-md border transition-all duration-200 ${orderForm.validity === validity
                                                                        ? 'bg-[var(--upx-primary)] text-white border-[var(--upx-primary)] shadow-sm'
                                                                        : 'bg-white border-gray-300 hover:border-[var(--upx-primary)]/60 hover:bg-[var(--upx-primary)]/5 text-gray-700'
                                                                    }`}
                                                                onClick={() => handleInputChange('validity', validity)}
                                                            >
                                                                {validity}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                           
                                        </div>
                                    )}

                                    {/* Submit Button */}
                                    <div className="pt-4 border-t border-gray-200">
                                        <button className="w-full btn-upstox py-3 text-base font-medium" onClick={handleSubmitOrder}>
                                            {selectedAccount === 'All accounts'
                                                ? `Place Orders for All Accounts (${accounts.slice(1).length} accounts)`
                                                : `Place Order for ${selectedAccount}`
                                            }
                                        </button>
                                    </div>
                                </div>
                            </TabsContent>

                            {/* Open Orders */}
                            <TabsContent value="Open orders" className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <div className="h-5 w-1 rounded bg-[var(--upx-primary)]" />
                                    <h3 className="text-lg font-semibold text-[var(--upx-primary)] dark:text-[var(--upx-primary-300)]">Open orders</h3>
                                </div>
                                <div className="upstox-surface rounded p-3 text-sm text-muted-foreground">No open orders to display.</div>
                            </TabsContent>

                            {/* Completed Trades */}
                            <TabsContent value="Completed Trades" className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="h-5 w-1 rounded bg-[var(--upx-primary)]" />
                                        <h3 className="text-lg font-semibold text-[var(--upx-primary)] dark:text-[var(--upx-primary-300)]">Completed Trades</h3>
                                    </div>
                                    
                                    {/* Financial Year Selector */}
                                    <div className="flex items-center gap-3 text-sm">
                                        <label htmlFor="financial-year" className="text-gray-600 font-medium">Financial Year:</label>
                                        <Select 
                                            value={selectedFinancialYear} 
                                            onValueChange={(value: string) => setSelectedFinancialYear(value)}
                                        >
                                            <SelectTrigger className="w-64 h-8 text-xs">
                                                <SelectValue placeholder="Select Financial Year" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {financialYearOptions.map((fy) => (
                                                    <SelectItem key={fy.value} value={fy.value} className="text-xs">
                                                        {fy.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <button
                                            onClick={() => fetchTradeHistory(selectedAccount)}
                                            className="px-3 py-1 bg-[var(--upx-primary)] text-white rounded text-xs hover:bg-[var(--upx-primary)]/90"
                                        >
                                            Refresh
                                        </button>
                                     
                                    </div>
                                </div>

                                {/* Trade History Content */}
                                <div className="upstox-surface rounded">
                                    {isLoadingTradeHistory[selectedAccount] ? (
                                        <div className="p-4 text-center text-sm text-muted-foreground">
                                            Loading trade history...
                                        </div>
                                    ) : selectedAccount === 'All accounts' ? (
                                        /* All Accounts View */
                                        <div className="space-y-4 p-4">
                                            {accounts.slice(1).map(account => {
                                                const accountTrades = tradeHistory[account] || [];
                                                console.log('All accounts view - rendering for', account, ':', accountTrades);
                                                return (
                                                    <div key={account} className="border-b pb-4 last:border-b-0">
                                                        <h4 className="font-medium text-[var(--upx-primary)] mb-2">{account}</h4>
                                                        {accountTrades.length > 0 ? (
                                                            <div className="overflow-x-auto">
                                                                <table className="w-full text-xs">
                                                                    <thead>
                                                                        <tr className="border-b text-left">
                                                                            <th className="p-2">Date</th>
                                                                            <th className="p-2">Script</th>
                                                                            <th className="p-2">Type</th>
                                                                            <th className="p-2">Qty</th>
                                                                            <th className="p-2">Price</th>
                                                                            <th className="p-2">Amount</th>
                                                                            <th className="p-2">Trade ID</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {accountTrades.map((trade, idx) => (
                                                                            <tr key={idx} className="border-b hover:bg-gray-50">
                                                                                <td className="p-2">{trade.tradeDate}</td>
                                                                                <td className="p-2 font-medium">{trade.scripName || trade.symbol}</td>
                                                                                <td className="p-2">
                                                                                    <span className={`px-2 py-1 rounded text-xs ${
                                                                                        trade.transactionType === 'BUY' 
                                                                                            ? 'bg-green-100 text-green-800'
                                                                                            : 'bg-red-100 text-red-800'
                                                                                    }`}>
                                                                                        {trade.transactionType}
                                                                                    </span>
                                                                                </td>
                                                                                <td className="p-2">{trade.quantity}</td>
                                                                                <td className="p-2">₹{trade.price?.toFixed(2)}</td>
                                                                                <td className="p-2 font-medium">₹{trade.amount?.toFixed(2)}</td>
                                                                                <td className="p-2 text-gray-500">{trade.tradeId}</td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        ) : (
                                                            <div className="text-sm text-muted-foreground">No trades found for {account}</div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        /* Individual Account View */
                                        <div className="p-4">
                                            {(() => {
                                                const accountTrades = tradeHistory[selectedAccount] || [];
                                                console.log('Rendering trade history for', selectedAccount, ':', accountTrades);
                                                console.log('Trade history state:', tradeHistory);
                                                return accountTrades.length > 0 ? (
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full text-sm">
                                                            <thead>
                                                                <tr className="border-b text-left">
                                                                    <th className="p-3">Date</th>
                                                                    <th className="p-3">Company Name</th>
                                                                    <th className="p-3">Exchange</th>
                                                                    <th className="p-3">Transaction</th>
                                                                    <th className="p-3">Quantity</th>
                                                                    <th className="p-3">Price</th>
                                                                    <th className="p-3">Amount</th>
                                                                    <th className="p-3">Trade ID</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {accountTrades.map((trade, idx) => (
                                                                    <tr key={idx} className="border-b hover:bg-gray-50">
                                                                        <td className="p-3">{new Date(trade.tradeDate).toLocaleDateString()}</td>
                                                                        <td className="p-3">
                                                                            <div className="font-medium">{trade.scripName || trade.symbol}</div>
                                                                            <div className="text-xs text-gray-500">{trade.isin}</div>
                                                                        </td>
                                                                        <td className="p-3">{trade.exchange}</td>
                                                                        <td className="p-3">
                                                                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                                                                                trade.transactionType === 'BUY' 
                                                                                    ? 'bg-green-100 text-green-800'
                                                                                    : 'bg-red-100 text-red-800'
                                                                            }`}>
                                                                                {trade.transactionType}
                                                                            </span>
                                                                        </td>
                                                                        <td className="p-3">{trade.quantity}</td>
                                                                        <td className="p-3">₹{trade.price?.toFixed(2)}</td>
                                                                        <td className="p-3 font-medium">₹{trade.amount?.toFixed(2)}</td>
                                                                        <td className="p-3 text-gray-500 font-mono text-xs">{trade.tradeId}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                ) : (
                                                    <div className="text-center py-8 text-sm text-muted-foreground">
                                                        No completed trades found for {selectedAccount} in the selected date range.
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    )}
                                </div>
                            </TabsContent>

                            {/* Positions */}
                            <TabsContent value="Positions" className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <div className="h-5 w-1 rounded bg-[var(--upx-primary)]" />
                                    <h3 className="text-lg font-semibold text-[var(--upx-primary)] dark:text-[var(--upx-primary-300)]">Positions</h3>
                                </div>
                                <div className="upstox-surface rounded p-3 text-sm text-muted-foreground">No positions to display.</div>
                            </TabsContent>

                            {/* Holdings */}
                            <TabsContent value="Holdings" className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <div className="h-5 w-1 rounded bg-[var(--upx-primary)]" />
                                    <h3 className="text-lg font-semibold text-[var(--upx-primary)] dark:text-[var(--upx-primary-300)]">Holdings</h3>
                                </div>
                                <div className="upstox-surface rounded p-3 text-sm text-muted-foreground">No holdings to display.</div>
                            </TabsContent>

                            {/* Funds & Ledger */}
                            <TabsContent value="Funds & ledger" className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <div className="h-5 w-1 rounded bg-[var(--upx-primary)]" />
                                    <h3 className="text-lg font-semibold text-[var(--upx-primary)] dark:text-[var(--upx-primary-300)]">Funds & ledger</h3>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <label className="text-muted-foreground" htmlFor="ledger-period">Period:</label>
                                    <select id="ledger-period" className="border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[var(--upx-primary)]/60">
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
                                    <div className="h-5 w-1 rounded bg-[var(--upx-primary)]" />
                                    <h3 className="text-lg font-semibold text-[var(--upx-primary)] dark:text-[var(--upx-primary-300)]">P&amp;L &amp; reconciliation</h3>
                                </div>

                            </TabsContent>
                        </div>
                    </Tabs>
                </div>
            </div>
        </SidebarInset>
    );
}
