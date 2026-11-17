"use client";
import * as React from "react";
import { useEffect, useMemo, useState, useCallback } from "react";
import { SidebarInset } from "@/components/ui/sidebar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";
import { ArrowLeft, Layers } from "lucide-react";
import { fetchUpstoxIntradayData, fetchUpstoxHistoricalData } from "@/components/utils/upstoxApi";
import toast, { Toaster } from 'react-hot-toast';
import { algoHorizonApi } from "@/lib/api/algoHorizonApi";
import { useRouter, useSearchParams } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { fetchInstrumentsMapping } from '@/lib/store/instrumentsSlice';

export default function NexusStocksPage() {
    // Account to phone number mapping
    const [accountPhoneMapping, setAccountPhoneMapping] = useState<Record<string, string>>({});
    const [accounts, setAccounts] = useState<string[]>([]);
    const [accountLogin, setAccountLogin] = useState<Record<string, boolean>>({});
    const [selectedAccount, setSelectedAccount] = useState<string>("All accounts");
    const featureTabs = useMemo(
        () => [
            "Place Order",
            "Trade History",
            "Profit and Loss",
        ],
        []
    );
    const [activeFeature, setActiveFeature] = React.useState<string>(featureTabs[0]);

    const router = useRouter();
    const searchParams = useSearchParams();
    const dispatch = useAppDispatch();

    // Redux instruments state
    const { keyMapping: reduxKeyMapping, isLoading: isReduxKeyMappingLoading } = useAppSelector((state) => state.instruments);
    const keyMapping = reduxKeyMapping;
    const isLoadingKeyMapping = isReduxKeyMappingLoading;
    const [searchTerms, setSearchTerms] = React.useState<{ [account: string]: string }>({});
    const [suggestions, setSuggestions] = React.useState<{ [account: string]: string[] }>({});
    const [selectedCompanies, setSelectedCompanies] = React.useState<{ [account: string]: string }>({});
    const [selectedInstrumentKeys, setSelectedInstrumentKeys] = React.useState<{ [account: string]: string }>({});
    const [lastClosingPrices, setLastClosingPrices] = React.useState<{ [account: string]: number | null }>({});
    const [companyPrices, setCompanyPrices] = React.useState<{ [company: string]: number | null }>({});
    const [isLoadingPrices, setIsLoadingPrices] = React.useState<{ [account: string]: boolean }>({});

    // Live price indicator
    const [isLivePrice, setIsLivePrice] = useState<boolean>(false)
    const [disclosedQuantityEnabled, setDisclosedQuantityEnabled] = React.useState<{ [account: string]: boolean }>({});

    // Fetch phone number mapping on mount
    useEffect(() => {
        const fetchAllUsers = async () => {
            setIsLoadingUsers(true);
            try {
                const allUsers = await algoHorizonApi.getAllUsers();
                const phoneNumberMap: Record<string, string> = {};
                allUsers.forEach(user => {
                    if (user.name && user.phoneNumber) {
                        phoneNumberMap[user.name] = String(user.phoneNumber);
                    }
                    const isLoggedIn = user.tokenId !== null;
                    setAccountLogin(prev => ({ ...prev, [user.name]: isLoggedIn }));
                });
                setAccountPhoneMapping(phoneNumberMap);

                const accountList = ["All accounts", ...Object.keys(phoneNumberMap)];
                setAccounts(accountList);

                // Initialize lastClosingPrices for all accounts
                setLastClosingPrices(prev => {
                    const newState = { ...prev };
                    accountList.forEach(acc => {
                        // Initialize with null if not present
                        if (newState[acc] === undefined) {
                            newState[acc] = null;
                        }
                    });
                    return newState;
                });

                const accountParam = searchParams?.get('account');
                const tabParam = searchParams?.get('tab');
                if (accountParam && accountList.includes(accountParam)) {
                    setSelectedAccount(accountParam);
                } else {
                    setSelectedAccount("All accounts");
                }
                if (tabParam && featureTabs.includes(tabParam)) {
                    setActiveFeature(tabParam);
                }
                toast.success('User accounts loaded');
            } catch (error) {
                console.error('Error fetching phone number mapping:', error);
                toast.error('Failed to load user accounts');
            } finally {
                setIsLoadingUsers(false);
            }
        };

        fetchAllUsers();
    }, []);

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

    // Profit & Loss interfaces
    interface TradeWiseProfitAndLossData {
        quantity?: number;
        isin?: string;
        scripName?: string;
        scrip_name?: string;
        tradeType?: string;
        trade_type?: string;
        buyDate?: string;
        buy_date?: string;
        buyAverage?: number;
        buy_average?: number;
        sellDate?: string;
        sell_date?: string;
        sellAverage?: number;
        sell_average?: number;
        buyAmount?: number;
        buy_amount?: number;
        sellAmount?: number;
        sell_amount?: number;
    }

    interface ProfitAndLossResponse {
        status: 'success' | 'error' | 'SUCCESS' | 'ERROR';
        data: TradeWiseProfitAndLossData[];
        metadata?: {
            page?: {
                page_number?: number;
                page_size?: number;
            };
        };
        message?: string;
    }

    interface BuyOrderTradeRecord {
        tradeDate: string;
        orderId: string;
        isHolding: boolean;
        avgPrice: number;
        buyingQty: number;
        holdingQty: number;
    }

     interface SellOrderTradeRecord {
        tradeDate: string;
        orderId: string;
        isHolding: boolean;
        avgPrice: number;
        sellingQty: number;
    }

    interface OpenOrders {
        id: string;
        phoneNumber: number;
        companyName: string;
        instrumentKey: string;
        buyingOrders: BuyOrderTradeRecord[];
        sellingOrders: SellOrderTradeRecord[];
        isHolding: boolean;
    }

    // Trade history state
    const [tradeHistory, setTradeHistory] = useState<{ [account: string]: TradeData[] }>({});
    const [isLoadingTradeHistory, setIsLoadingTradeHistory] = useState<{ [account: string]: boolean }>({});
    // Open orders state
    const [openOrders, setOpenOrders] = useState<{ [account: string]: OpenOrders[] }>({});
    const [isLoadingOpenOrders, setIsLoadingOpenOrders] = useState<{ [account: string]: boolean }>({});
    // Completed orders state
    const [completedOrders, setCompletedOrders] = useState<{ [account: string]: OpenOrders[] }>({});
    const [isLoadingCompletedOrders, setIsLoadingCompletedOrders] = useState<{ [account: string]: boolean }>({});
    // Misc loading flags for API activity
    const [isLoadingUsers, setIsLoadingUsers] = useState<boolean>(false);
    const [isSubmittingOrder, setIsSubmittingOrder] = useState<boolean>(false);
    // Helper to format YYYY-MM-DD into DD-MM-YYYY required by Upstox P&L API
    const formatToDDMMYYYY = (isoDateStr: string): string => {
        if (!isoDateStr) return '';
        const parts = isoDateStr.split('-');
        if (parts.length === 3) {
            const [year, month, day] = parts;
            return `${day}-${month}-${year}`;
        }
        return isoDateStr;
    };

    // Helper to calculate Indian Financial Year (e.g. 2026-11-16 -> 2627, 2025-02-10 -> 2425)
    const calculateFYFromDate = (dateStr: string): string => {
        if (!dateStr) return '2425';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return '2425';
        const year = d.getFullYear();
        const month = d.getMonth() + 1; // 1-12
        // In India, FY runs from April 1 to March 31.
        // If month is Jan, Feb, Mar (1,2,3), start year is previous year.
        const startYear = month >= 4 ? year : year - 1;
        const endYear = startYear + 1;
        const startCode = String(startYear).slice(-2);
        const endCode = String(endYear).slice(-2);
        return `${startCode}${endCode}`;
    };

    // Profit and Loss state
    const [pnlData, setPnlData] = useState<{ [account: string]: TradeWiseProfitAndLossData[] }>({});
    const [isLoadingPnl, setIsLoadingPnl] = useState<{ [account: string]: boolean }>({});
    const [pnlStartDate, setPnlStartDate] = useState<string>(() => {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        return d.toISOString().split('T')[0];
    });
    const [pnlEndDate, setPnlEndDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
    const [pnlFinancialYear, setPnlFinancialYear] = useState<string>(() => {
        const d = new Date();
        const year = d.getFullYear();
        const month = d.getMonth() + 1;
        const startYear = month >= 4 ? year : year - 1;
        return `${String(startYear).slice(-2)}${String(startYear + 1).slice(-2)}`;
    });
    const [pnlPageNumber, setPnlPageNumber] = useState<number>(1);
    const [pnlPageSize, setPnlPageSize] = useState<number>(100);
    const [pnlTypeFilter, setPnlTypeFilter] = useState<'ALL' | 'PROFIT' | 'LOSS'>('ALL');

    // Trade history custom date range
    const [tradeStartDate, setTradeStartDate] = useState<string>(() => {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        return d.toISOString().split('T')[0];
    });
    const [tradeEndDate, setTradeEndDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
    const [tradeTypeFilter, setTradeTypeFilter] = useState<'ALL' | 'SOLD' | 'UNSOLD'>('ALL');
    const tradeSegment = "EQ";

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
        "Nawaz": 0,
        "Sadiq": 0,
        "Yasmeen": 0,
        "Samreen": 0,
        "Mudassir": 0,
        "Tasneem": 0
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

    // Ensure company to instrument key mapping is available in Redux
    useEffect(() => {
        if (!keyMapping || Object.keys(keyMapping).length === 0) {
            dispatch(fetchInstrumentsMapping());
        }
    }, [dispatch, keyMapping]);

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
                //console.log('Market is open, fetching live price...');
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

    // Fetch open orders when Open Orders tab is activated
    useEffect(() => {
        if (activeFeature === 'Open Orders' && isUserLoggedIn()) {
            fetchOpenOrders(selectedAccount);
        }
    }, [activeFeature, selectedAccount]);

    // Fetch completed orders when Completed Orders tab is activated
    useEffect(() => {
        if (activeFeature === 'Completed Orders' && isUserLoggedIn()) {
            fetchCompletedOrders(selectedAccount);
        }
    }, [activeFeature, selectedAccount]);

    // Fetch trade history when Trade History tab is activated
    useEffect(() => {
        if (activeFeature === 'Trade History' && isUserLoggedIn()) {
            fetchTradeHistory(selectedAccount);
        }
    }, [activeFeature, selectedAccount, tradeStartDate, tradeEndDate]);

    // Fetch profit & loss when Profit and Loss tab is activated
    useEffect(() => {
        if (activeFeature === 'Profit and Loss' && isUserLoggedIn()) {
            fetchProfitAndLoss(selectedAccount);
        }
    }, [activeFeature, selectedAccount, pnlStartDate, pnlEndDate, pnlFinancialYear, pnlPageNumber, pnlPageSize]);

    // Fetch funds when account is selected or when Place order tab is activated
    useEffect(() => {
        if (selectedAccount !== 'All accounts') {
            fetchAccountFunds(selectedAccount);
        } else {
            accounts.slice(1).forEach(account => fetchAccountFunds(account));
        }
    }, [selectedAccount, accounts]);

    // Update URL params when state changes
    useEffect(() => {
        const params = new URLSearchParams();
        params.set('account', selectedAccount);
        params.set('tab', activeFeature);
        router.replace(`?${params.toString()}`, { scroll: false });
    }, [selectedAccount, activeFeature, router]);

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

    const isUserLoggedIn = () => {
        if (selectedAccount !== "All accounts") {
            return true;
        }
        return isUserLoggedIn;
    };

    const isOrderMarketOrLimit = () => {
        return orderForm.orderType === 'Market' || orderForm.orderType === 'Limit'
    }

    // Fetch last closing price for the selected instrument
    const fetchLastClosingPrice = async (instrumentKey: string, isPollingUpdate = false) => {
        if (!instrumentKey) return;

        if (!isPollingUpdate) {
            setIsLoadingPrices(prev => ({ ...prev, [selectedAccount]: true }));
        }
        try {
            let apiKey = localStorage.getItem('upstoxApiKey');
            if (!apiKey) {
                apiKey = 'DEFAULT_API_KEY';
             } // Use a default or placeholder API key            }

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
                setCompanyPrices(prev => ({ ...prev, [instrumentKey]: currentPrice }));
                // Inform user that price was fetched (success)
                toast.success(`Price fetched for ${instrumentKey}`);
            }
        } catch (error) {
            console.error('Failed to fetch last closing price:', error);
            setLastClosingPrices(prev => ({ ...prev, [selectedAccount]: null }));
            setCompanyPrices(prev => ({ ...prev, [instrumentKey]: null }));
            toast.error(`Failed to fetch price for instrument ${instrumentKey}`);
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

    // State for loading funds
    const [isLoadingFunds, setIsLoadingFunds] = useState<{ [account: string]: boolean }>({});

    // Sell modal state
    const [sellModalOpen, setSellModalOpen] = useState(false);
    const [selectedOrderToSell, setSelectedOrderToSell] = useState<any>(null);
    const [sellQuantity, setSellQuantity] = useState('');


    // Fetch price when sell modal opens
    useEffect(() => {
        if (sellModalOpen && selectedOrderToSell) {
            fetchLastClosingPrice(selectedOrderToSell.instrumentKey);
        }
    }, [sellModalOpen, selectedOrderToSell]);

    const fetchOpenOrders = async (account: string) => {
        const phoneNumber = (accountPhoneMapping as Record<string, string>)[account];
        if (!phoneNumber) return;

        setIsLoadingOpenOrders(prev => ({ ...prev, [account]: true }));

        try {
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';
            const response = await fetch(`${backendUrl}/api/upstox/orders/get-open-orders?phoneNumber=${phoneNumber}`);
            if (response.ok) {
                const data: OpenOrders[] = await response.json();

                setOpenOrders(prev => ({
                    ...prev,
                    [account]: data
                }));
                toast.success(`Open orders loaded for ${account}`);

                // Fetch prices for companies in open orders
                const instrumentKeys = data.map((order: OpenOrders) => order.instrumentKey);
                const uniqueInstrumentKeys = Array.from(new Set(instrumentKeys));
                if (uniqueInstrumentKeys.length > 0) {
                    for (const instrumentKey of uniqueInstrumentKeys) {
                        await fetchLastClosingPrice(instrumentKey);
                    }
                }

            }
        } catch (error) {
            console.error(`Failed to fetch open orders for ${account}:`, error);
            toast.error(`Failed to fetch open orders for ${account}`);
        } finally {
            setIsLoadingOpenOrders(prev => ({ ...prev, [account]: false }));
        }
    };

      const fetchCompletedOrders = async (account: string) => {
        const phoneNumber = (accountPhoneMapping as Record<string, string>)[account];
        if (!phoneNumber) return;

        setIsLoadingCompletedOrders(prev => ({ ...prev, [account]: true }));

        try {
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';
            const response = await fetch(`${backendUrl}/api/upstox/orders/get-completed-orders?phoneNumber=${phoneNumber}`);
            
            if (response.ok) {
                const data: OpenOrders[] = await response.json();

                setCompletedOrders(prev => ({
                    ...prev,
                    [account]: data
                }));
                toast.success(`Completed orders loaded for ${account}`);
            }
        } catch (error) {
            console.error(`Failed to fetch completed orders for ${account}:`, error);
            toast.error(`Failed to fetch completed orders for ${account}`);
        } finally {
            setIsLoadingCompletedOrders(prev => ({ ...prev, [account]: false }));
        }
    };


    // Helper function to fetch funds from API
    const fetchAccountFunds = async (account: string) => {
        const phoneNumber = (accountPhoneMapping as Record<string, string>)[account];
        if (!phoneNumber) return;

        setIsLoadingFunds(prev => ({ ...prev, [account]: true }));

        try {
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8090';
            const response = await fetch(`${backendUrl}/api/upstox/user/get-funds?phoneNumber=${phoneNumber}`);
            if (response.ok) {
                const data = await response.json();
                const isSuccess = data?.status?.toLowerCase() === 'success' || data?.status === 'SUCCESS';
                const availableMargin = data?.data?.equity?.availableMargin ?? data?.equity?.availableMargin;

                if (isSuccess && typeof availableMargin === 'number') {
                    setAccountFunds(prev => ({
                        ...prev,
                        [account]: availableMargin
                    }));
                    toast.success(`Funds loaded for ${account}`);
                }
            }
        } catch (error) {
            console.error(`Failed to fetch funds for ${account}:`, error);
            toast.error(`Failed to fetch funds for ${account}`);
        } finally {
            setIsLoadingFunds(prev => ({ ...prev, [account]: false }));
        }
    };


    // Helper functions for capital calculation
    const getCapitalInfo = (account: string, quantity: string) => {
        const funds = accountFunds[account] || 0;
        const qty = parseInt(quantity) || 0;
        const price = lastClosingPrice || 0;
        const totalCost = qty * price;
        const capitalRemaining = funds - totalCost;
        const purchasableStocks = price > 0 ? Math.floor(funds / price) : 0;

        return {
            capitalRemaining,
            purchasableStocks,
            availableFunds: funds
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

        // Capital/Funds validation for Buy orders
        if (orderForm.transactionType === 'Buy' && orderForm.quantity && lastClosingPrice) {
            const accountToCheck = accountName || selectedAccount;
            const capitalInfo = getCapitalInfo(accountToCheck, orderForm.quantity);

            if (capitalInfo.capitalRemaining < 0) {
                const shortfall = Math.abs(capitalInfo.capitalRemaining);
                errors.push(`${prefix}Insufficient funds! You need ₹${shortfall.toFixed(2)} more to place this order. Available: ₹${capitalInfo.availableFunds.toFixed(2)}, Required: ₹${(capitalInfo.availableFunds + shortfall).toFixed(2)}`);
            }
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
            for (const acc of accountsToProcess) {
                // eslint-disable-next-line no-await-in-loop
                await fetchTradeHistory(acc);
            }
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

            const params = new URLSearchParams({
                phoneNumber: String(phoneNumber),
                startDate: tradeStartDate,
                endDate: tradeEndDate,
                segment: tradeSegment,
            });

            const response = await fetch(
                `${backendUrl}${context}orders/get-trade-history?${params.toString()}`,
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            );

            const data: TradeHistoryResponse = await response.json();

            //console.log('Trade history API response for', account, ':', data);
            //console.log('Response status:', response.status, response.ok);
            //console.log('Data status:', data.status);
            //console.log('Data array:', data.data);
            //console.log('Data array length:', data.data?.length);

            if (response.ok && (data.status === 'success' || data.status === 'SUCCESS')) {
                //console.log('Setting trade history for', account, 'with data:', data.data);
                toast.success(`Trade history loaded for ${account}: ${data.data?.length || 0} trades found`);
                setTradeHistory(prev => {
                    const newState = {
                        ...prev,
                        [account]: data.data || []
                    };
                    //console.log('New trade history state:', newState);
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
            toast.error(`Failed to fetch trade history for ${account}`);
            setTradeHistory(prev => ({
                ...prev,
                [account]: []
            }));
        } finally {
            setIsLoadingTradeHistory(prev => ({ ...prev, [account]: false }));
        }
    }, [accounts, accountPhoneMapping, tradeStartDate, tradeEndDate, tradeSegment]);

    // Fetch profit & loss report for an account
    const fetchProfitAndLoss = useCallback(async (account: string) => {
        if (account === 'All accounts') {
            const accountsToProcess = accounts.slice(1);
            for (const acc of accountsToProcess) {
                // eslint-disable-next-line no-await-in-loop
                await fetchProfitAndLoss(acc);
            }
            return;
        }

        const phoneNumber = (accountPhoneMapping as Record<string, string>)[account];
        if (!phoneNumber) {
            console.error(`No phone number found for account: ${account}`);
            return;
        }

        setIsLoadingPnl(prev => ({ ...prev, [account]: true }));

        try {
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';
            const context = '/api/upstox/';

            const params = new URLSearchParams({
                phoneNumber: String(phoneNumber),
                startDate: formatToDDMMYYYY(pnlStartDate),
                endDate: formatToDDMMYYYY(pnlEndDate),
                financialYear: pnlFinancialYear,
                pageNumber: String(pnlPageNumber),
                pageSize: String(pnlPageSize),
                segment: tradeSegment,
            });

            const response = await fetch(
                `${backendUrl}${context}trade/profit-loss-data?${params.toString()}`,
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            );

            const data: ProfitAndLossResponse = await response.json();

            if (response.ok && (data.status === 'success' || data.status === 'SUCCESS')) {
                toast.success(`P&L report loaded for ${account}: ${data.data?.length || 0} records`);
                setPnlData(prev => ({
                    ...prev,
                    [account]: data.data || []
                }));
            } else {
                console.error('Failed to fetch P&L report:', data);
                toast.error(`Failed to fetch P&L for ${account}: ${data.message || 'Unknown error'}`);
                setPnlData(prev => ({
                    ...prev,
                    [account]: []
                }));
            }
        } catch (error) {
            console.error('P&L report fetch error:', error);
            toast.error(`Failed to fetch P&L for ${account}`);
            setPnlData(prev => ({
                ...prev,
                [account]: []
            }));
        } finally {
            setIsLoadingPnl(prev => ({ ...prev, [account]: false }));
        }
    }, [accounts, accountPhoneMapping, pnlStartDate, pnlEndDate, pnlFinancialYear, pnlPageNumber, pnlPageSize, tradeSegment]);

    const handleSubmitOrder = async () => {
        setIsSubmittingOrder(true);
        try {
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
                            quantity: Number.parseInt(accountForm.quantity || '0', 10) || 0,
                            product: mapProductToApi(accountForm.product),
                            validity: accountForm.validity.toUpperCase(),
                            price: Number.parseFloat(accountForm.price || '0') || 0,
                            tag: `order-${account}-${Date.now()}`,
                            instrumentToken: accountForm.instrumentKey,
                            orderType: mapOrderTypeToApi(accountForm.orderType),
                            transactionType: accountForm.transactionType.toUpperCase(),
                            disclosedQuantity: (disclosedQuantityEnabled[account] && accountForm.disclosedQuantity) ? Number.parseInt(accountForm.disclosedQuantity || '0', 10) : 0,
                            triggerPrice: accountForm.triggerPrice ? Number.parseFloat(accountForm.triggerPrice || '0') : 0,
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
                        for (const account of accountsToProcess) {
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
                        }
                        // Refresh funds for all accounts after successful batch orders
                        accounts.slice(1).forEach(account => fetchAccountFunds(account));
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
                    //console.log('Submitting order for account:', selectedAccount, 'with phone number:', phoneNumber);
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
                                quantity: Number.parseInt(orderForm.quantity || '0', 10) || 0,
                                product: mapProductToApi(orderForm.product),
                                validity: orderForm.validity.toUpperCase(),
                                price: Number.parseFloat(orderForm.price || '0') || 0,
                                tag: `order-${selectedAccount}-${Date.now()}`,
                                instrumentToken: selectedInstrumentKey,
                                orderType: mapOrderTypeToApi(orderForm.orderType),
                                transactionType: orderForm.transactionType.toUpperCase(),
                                disclosedQuantity: (isDisclosedQuantityEnabled && orderForm.disclosedQuantity) ? Number.parseInt(orderForm.disclosedQuantity || '0', 10) : 0,
                                triggerPrice: orderForm.triggerPrice ? Number.parseFloat(orderForm.triggerPrice || '0') : 0,
                                isAmo: false,
                                slice: false
                            }
                        }),
                    });

                    const data = await response.json();

                    if (response.ok && data.status === 'SUCCESS') {
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
                                product: 'Delivery',
                                price: '',
                                triggerPrice: '',
                                validity: 'Day'
                            }
                        }));
                        // Clear selected company
                        setSelectedCompanies(prev => ({ ...prev, [selectedAccount]: '' }));
                        setSelectedInstrumentKeys(prev => ({ ...prev, [selectedAccount]: '' }));
                        setLastClosingPrices(prev => ({ ...prev, [selectedAccount]: null }));
                        setSearchTerms(prev => ({ ...prev, [selectedAccount]: '' }));
                        // Refresh funds after successful order
                        fetchAccountFunds(selectedAccount);
                    } else {
                        toast.error(data.error || 'Failed to place order');
                    }
                } catch (error) {
                    console.error('Order submission error:', error);
                    toast.error('Failed to submit order. Please try again.');
                }
            }
        } finally {
            setIsSubmittingOrder(false);
        }
    };

    // Sell order handlers
    const handleSellOrder = (orderRecord: any) => {
        setSelectedOrderToSell(orderRecord);
        setSellQuantity(orderRecord.holdingQty.toString());
        setSellModalOpen(true);
    };

    const handleSellAll = (companyName: string, account: string) => {
        const accountOrders = openOrders[account] || [];
        const companyOrders = accountOrders.find(order => order.companyName === companyName);
        if (companyOrders) {
            const totalHoldingQty = companyOrders.buyingOrders.reduce((sum, order) => sum + order.holdingQty, 0);
            setSelectedOrderToSell({ companyName, instrumentKey: companyOrders.instrumentKey, holdingQty: totalHoldingQty, isSellAll: true });
            setSellQuantity(totalHoldingQty.toString());
            setSellModalOpen(true);
        }
    };

    const placeSellOrder = async (orderData: any) => {
        const apiKey = localStorage.getItem('upstoxApiKey');
        if (!apiKey) {
            toast.error('No Upstox API key found. Please set your API key first.');
            return;
        }

        try {
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';
            const context = '/api/upstox/';

            const response = await fetch(`${backendUrl}${context}orders/place-order`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(orderData),
            });

            const data = await response.json();

            if (response.ok && data.status === 'SUCCESS') {
                toast.success('Sell order placed successfully!');
                // Refresh open orders after successful sell
                fetchOpenOrders(selectedAccount);
                return true;
            } else {
                toast.error(data.error || 'Failed to place sell order');
                return false;
            }
        } catch (error) {
            console.error('Sell order submission error:', error);
            toast.error('Failed to submit sell order. Please try again.');
            return false;
        }
    };

    const confirmSellOrder = async () => {
        if (!selectedOrderToSell || !sellQuantity) return;

        const quantity = Number.parseInt(sellQuantity);
        if (quantity <= 0) {
            toast.error('Please enter a valid quantity');
            return;
        }

        if (quantity > selectedOrderToSell.holdingQty) {
            toast.error('Cannot sell more than holding quantity');
            return;
        }

        setIsSubmittingOrder(true);
        try {
            const phoneNumber = accountPhoneMapping[selectedAccount];

            const orderData = {
                phoneNumber: phoneNumber,
                isSandbox: true,
                orderData: {
                    quantity: quantity,
                    product: 'D', // Default to Delivery for sells
                    validity: 'DAY',
                    price: 0, // Market order
                    tag: `sell-${selectedAccount}-${Date.now()}`,
                    instrumentToken: selectedOrderToSell.instrumentKey,
                    orderType: 'MARKET',
                    transactionType: 'SELL',
                    disclosedQuantity: 0,
                    triggerPrice: 0,
                    isAmo: false,
                    slice: false
                }
            };

            const success = await placeSellOrder(orderData);
            if (success) {
                setSellModalOpen(false);
                setSelectedOrderToSell(null);
                setSellQuantity('');
                // Refresh funds after successful sell order
                fetchAccountFunds(selectedAccount);
            }
        } finally {
            setIsSubmittingOrder(false);
        }
    };

    // Helper functions for rendering completed orders
    const renderCompanyCompletedOrdersSection = (companyName: string, orders: any[], isCompact: boolean, account: string) => {
        const padding = isCompact ? 'p-2' : 'p-3';
        const textSize = isCompact ? 'text-xs' : 'text-sm';
        const companyPrice = lastClosingPrices[selectedAccount];
        

        // Only show selling orders for completed trades
        const sellOrders = orders.filter(o => o.type === 'sell');

        // Weighted Average Selling Price
        const totalSellValue = sellOrders.reduce((sum, o) => sum + (o.avgPrice * o.holdingQty), 0);
        const totalSellQty = sellOrders.reduce((sum, o) => sum + o.holdingQty, 0);
        const avgSellPrice = totalSellQty > 0 ? totalSellValue / totalSellQty : 0;

        return (
            <div key={companyName} className="border rounded-lg p-4 mb-4 bg-gray-50/50">
                {/* Company Header with Price */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-10">
                        <h4 className="text-lg font-semibold text-[var(--upx-primary)]">{companyName}</h4>
                    </div>
                </div>

                {/* Orders Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="border-b text-left bg-white/50">
                                <th className={padding}>Order ID</th>
                                <th className={padding}>Trade Date</th>
                                <th className={padding}>Stock Selling Price</th>
                                <th className={padding}>Sold Market Value</th>
                                <th className={padding}>Sold Qty</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sellOrders.map((record, idx) => (
                                <tr key={`${companyName}-${idx}`} className="border-b hover:bg-white/30">
                                    <td className={`${padding} text-gray-500 font-mono`}>{record.orderId}</td>
                                    <td className={padding}>
                                        {isCompact ? record.tradeDate : new Date(record.tradeDate).toLocaleDateString()}
                                    </td>
                                    <td className={padding}>₹{record.avgPrice?.toFixed(2)}</td>
                                    <td className={`${padding}`}>₹{(record.avgPrice ? (record.avgPrice * record.sellingQty)?.toFixed(2) : '0.0')}</td>
                                    <td className={padding}>{record.sellingQty}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    // Helper function for rendering open orders
    const renderCompanyOrdersSection = (companyName: string, orders: any[], isCompact: boolean, account: string) => {
        const padding = isCompact ? 'p-2' : 'p-3';
        const textSize = isCompact ? 'text-xs' : 'text-sm';
        const companyPrice = lastClosingPrices[selectedAccount];
        

        // Calculate weighted average price from all orders
        const totalValue = orders.reduce((sum, order) => sum + (order.avgPrice * order.holdingQty), 0);
        const totalQty = orders.reduce((sum, order) => sum + order.holdingQty, 0);
        const avgPrice = totalQty > 0 ? totalValue / totalQty : 0;

        // Check if it's market hours
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentDay = now.getDay();
        const isWeekday = currentDay >= 1 && currentDay <= 5;
        const isMarketOpenTime = (currentHour > 9 || (currentHour === 9 && currentMinute >= 15)) &&
            (currentHour < 15 || (currentHour === 15 && currentMinute <= 30));
        const isMarketHours = isWeekday && isMarketOpenTime;

        return (
            <div key={companyName} className="border rounded-lg p-4 mb-4 bg-gray-50/50">
                {/* Company Header with Price */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-10">
                        <h4 className="text-lg font-semibold text-[var(--upx-primary)]">{companyName}</h4>
                        <div className="text-sm text-gray-600">
                            {companyPrice === null ? (
                                <span className="text-gray-500">Price: Loading...</span>
                            ) : (
                                <span className={`font-medium px-2 py-1 rounded bg-white/80 border ${!isMarketHours ? 'text-gray-600 border-gray-200' : (companyPrice > avgPrice ? 'text-green-600 border-green-200' : 'text-red-600 border-red-200')}`}>
                                    ₹{companyPrice?.toFixed(2) || '0.0'}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-10">
                        {(
                            <button className={`px-3 py-1 text-white text-xs rounded hover:opacity-80 ${!isMarketHours ? 'bg-gray-500' : (companyPrice && companyPrice * totalQty > totalValue ? 'bg-green-500' : 'bg-red-500')}`} disabled={!isMarketHours} onClick={() => handleSellAll(companyName, account)}>
                                Sell All
                            </button>
                        )}
                    </div>
                </div>

                {/* Orders Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="border-b text-left bg-white/50">
                                <th className={padding}>Order ID</th>
                                <th className={padding}>Trade Date</th>
                                <th className={padding}>Avg Price</th>
                                <th className={padding}>Investment</th>
                                <th className={padding}>Market Value</th>
                                <th className={padding}>Total Qty</th>
                                <th className={padding}>Holding Qty</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map((record, idx) => (
                                <tr key={`${companyName}-${idx}`} className="border-b hover:bg-white/30">
                                    <td className={`${padding} text-gray-500 font-mono`}>{record.orderId}</td>
                                    <td className={padding}>
                                        {isCompact ? record.tradeDate : new Date(record.tradeDate).toLocaleDateString()}
                                    </td>
                                    <td className={padding}>₹{record.avgPrice?.toFixed(2)}</td>
                                    <td className={padding}>₹{(record.avgPrice * record.holdingQty)?.toFixed(2)}</td>
                                    <td className={`${padding} ${companyPrice && companyPrice * record.holdingQty > record.avgPrice * record.holdingQty ? 'text-green-600' : 'text-red-600'}`}>
                                        ₹{(companyPrice ? (companyPrice * record.holdingQty)?.toFixed(2) : '0.0')}
                                        {companyPrice && record.avgPrice ? (
                                            <span className="text-xs ml-1">
                                                ({(((companyPrice * record.holdingQty - record.avgPrice * record.holdingQty) / (record.avgPrice * record.holdingQty)) * 100).toFixed(2)}%)
                                            </span>
                                        ) : null}
                                    </td>
                                    <td className={padding}>{record.buyingQty}</td>
                                    <td className={padding}>{record.holdingQty}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const renderAllAccountsOpenOrdersView = () => (
        <div className="space-y-4 p-4">
            {accounts.slice(1).map(account => {
                const accountOrders = openOrders[account] || [];
                return (
                    <div key={account} className="border-b pb-4 last:border-b-0">
                        <h4 className="font-medium text-[var(--upx-primary)] mb-2">{account}</h4>
                        {accountOrders.length > 0 ? (
                            <div className="space-y-2">
                                {/* Group orders by company */}
                                {(() => {
                                    const ordersByCompany = accountOrders.reduce((acc, order) => {
                                        const company = order.companyName;
                                        if (!acc[company]) acc[company] = [];
                                        acc[company].push(...order.buyingOrders.map(record => ({ ...record, instrumentKey: order.instrumentKey })));
                                        return acc;
                                    }, {} as Record<string, any[]>);

                                    return Object.entries(ordersByCompany).map(([companyName, orders]) =>
                                        renderCompanyOrdersSection(companyName, orders, true, account)
                                    );
                                })()}
                            </div>
                        ) : (
                            <div className="text-sm text-muted-foreground">No open orders found for {account}</div>
                        )}
                    </div>
                );
            })}
        </div>
    );

    const renderIndividualAccountOpenOrdersView = () => {
        const accountOrders = openOrders[selectedAccount] || [];
        return accountOrders.length > 0 ? (
            <div className="p-4">
                <div className="space-y-2">
                    {/* Group orders by company */}
                    {(() => {
                        const ordersByCompany = accountOrders.reduce((acc, order) => {
                            const company = order.companyName;
                            if (!acc[company]) acc[company] = [];
                            acc[company].push(...order.buyingOrders.map(record => ({ ...record, instrumentKey: order.instrumentKey })));
                            return acc;
                        }, {} as Record<string, any[]>);

                        return Object.entries(ordersByCompany).map(([companyName, orders]) =>
                            renderCompanyOrdersSection(companyName, orders, false, selectedAccount)
                        );
                    })()}
                </div>
            </div>
        ) : (
            <div className="p-4">
                <div className="text-center py-8 text-sm text-muted-foreground">
                    No open orders found for {selectedAccount}.
                </div>
            </div>
        );
    };

    const renderAllAccountsCompletedOrdersView = () => (
        <div className="space-y-4 p-4">
            {accounts.slice(1).map(account => {
                const accountOrders = completedOrders[account] || [];
                return (
                    <div key={account} className="border-b pb-4 last:border-b-0">
                        <h4 className="font-medium text-[var(--upx-primary)] mb-2">{account}</h4>
                        {accountOrders.length > 0 ? (
                            <div className="space-y-2">
                                {/* Group orders by company */}
                                {(() => {
                                    const ordersByCompany = accountOrders.reduce((acc, order) => {
                                        const company = order.companyName;
                                        if (!acc[company]) acc[company] = [];
                                        acc[company].push(...(order.buyingOrders || []).map(record => ({ ...record, instrumentKey: order.instrumentKey, type: 'buy' })));
                                        acc[company].push(...(order.sellingOrders || []).map(record => ({ ...record, instrumentKey: order.instrumentKey, type: 'sell' })));
                                        return acc;
                                    }, {} as Record<string, any[]>);

                                    return Object.entries(ordersByCompany).map(([companyName, orders]) =>
                                        renderCompanyCompletedOrdersSection(companyName, orders, true, account)
                                    );
                                })()}
                            </div>
                        ) : (
                            <div className="text-sm text-muted-foreground">No completed orders found for {account}</div>
                        )}
                    </div>
                );
            })}
        </div>
    );

    const renderIndividualAccountCompletedOrdersView = () => {
        const accountOrders = completedOrders[selectedAccount] || [];
        return accountOrders.length > 0 ? (
            <div className="p-4">
                <div className="space-y-2">
                    {/* Group orders by company */}
                    {(() => {
                        const ordersByCompany = accountOrders.reduce((acc, order) => {
                            const company = order.companyName;
                            if (!acc[company]) acc[company] = [];
                            acc[company].push(...(order.buyingOrders || []).map(record => ({ ...record, instrumentKey: order.instrumentKey, type: 'buy' })));
                            acc[company].push(...(order.sellingOrders || []).map(record => ({ ...record, instrumentKey: order.instrumentKey, type: 'sell' })));
                            return acc;
                        }, {} as Record<string, any[]>);

                        return Object.entries(ordersByCompany).map(([companyName, orders]) =>
                            renderCompanyCompletedOrdersSection(companyName, orders, false, selectedAccount)
                        );
                    })()}
                </div>
            </div>
        ) : (
            <div className="p-4">
                <div className="text-center py-8 text-sm text-muted-foreground">
                    No completed orders found for {selectedAccount}.
                </div>
            </div>
        );
    };

    const getTradeGroupKey = (t: TradeData) => {
        const name = (t.scripName || t.symbol || 'Unknown').trim();
        const strike = t.strikePrice ? t.strikePrice.trim() : '';
        const opt = t.optionType ? t.optionType.trim() : '';
        const exp = t.expiry ? t.expiry.trim() : '';
        if (strike || opt || exp) {
            return `${name} | ${strike} ${opt} | Exp: ${exp}`.replace(/\s+/g, ' ').trim();
        }
        return name;
    };

    const renderTradeHistoryTable = (trades: TradeData[]) => {
        // Group trades by unique contract / stock key
        const groups: Record<string, {
            key: string;
            scripName: string;
            strikePrice?: string;
            optionType?: string;
            expiry?: string;
            segment: string;
            buyTrades: TradeData[];
            sellTrades: TradeData[];
            allTrades: TradeData[];
        }> = {};

        trades.forEach(t => {
            const groupKey = getTradeGroupKey(t);
            if (!groups[groupKey]) {
                groups[groupKey] = {
                    key: groupKey,
                    scripName: t.scripName || t.symbol || 'Unknown',
                    strikePrice: t.strikePrice,
                    optionType: t.optionType,
                    expiry: t.expiry,
                    segment: t.segment || tradeSegment,
                    buyTrades: [],
                    sellTrades: [],
                    allTrades: [],
                };
            }
            const isBuy = t.transactionType?.toUpperCase() === 'BUY';
            if (isBuy) {
                groups[groupKey].buyTrades.push(t);
            } else {
                groups[groupKey].sellTrades.push(t);
            }
            groups[groupKey].allTrades.push(t);
        });

        const groupList = Object.values(groups).map(g => {
            const totalBuyQty = g.buyTrades.reduce((sum, t) => sum + (t.quantity || 0), 0);
            const totalSellQty = g.sellTrades.reduce((sum, t) => sum + (t.quantity || 0), 0);
            // Fully sold when sell quantity covers buy quantity (or totalSellQty >= totalBuyQty and sell exists)
            const isFullySold = totalSellQty > 0 && totalSellQty >= totalBuyQty;
            // Unsold / pending when there are buy trades and buy quantity is not fully sold yet (or zero sell trades)
            const isUnsoldOrPending = totalBuyQty > 0 && totalSellQty < totalBuyQty;

            return {
                ...g,
                totalBuyQty,
                totalSellQty,
                isFullySold,
                isUnsoldOrPending,
                displayedTrades: g.allTrades,
            };
        }).filter(g => {
            if (tradeTypeFilter === 'SOLD') {
                return g.isFullySold;
            } else if (tradeTypeFilter === 'UNSOLD') {
                return g.isUnsoldOrPending;
            }
            return g.displayedTrades.length > 0;
        });

        if (groupList.length === 0) {
            return (
                <div className="p-8 text-center text-sm text-muted-foreground">
                    {trades.length > 0 ? `No ${tradeTypeFilter.toLowerCase()} trades found for this period.` : 'No trades found for this period.'}
                </div>
            );
        }

        const uniqueCompanies = new Set(groupList.map(g => g.scripName)).size;

        return (
            <div className="space-y-4 p-3">
                {/* Top Statistics Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-black/[0.02] dark:bg-white/[0.02] border rounded-xl font-mono text-xs">
                    <div className="flex items-center gap-3">
                        <span className="px-2.5 py-1 rounded-lg bg-[var(--upx-primary-50)] text-[var(--upx-primary)] border border-[var(--upx-border)] font-sans font-bold">
                            {uniqueCompanies} {uniqueCompanies === 1 ? 'Company' : 'Companies'} / Contracts
                        </span>
                        <span className="text-slate-500 dark:text-slate-400 font-sans font-semibold">
                            {groupList.reduce((sum, g) => sum + g.displayedTrades.length, 0)} Total Trades
                        </span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground text-[11px]">
                        <span>Showing {tradeTypeFilter === 'ALL' ? 'All' : tradeTypeFilter === 'SOLD' ? 'Sold' : 'Unsold / Pending'}</span>
                    </div>
                </div>

                {groupList.map(group => {
                    const totalBuyQty = group.buyTrades.reduce((sum, t) => sum + (t.quantity || 0), 0);
                    const totalBuyAmt = group.buyTrades.reduce((sum, t) => sum + (typeof t.amount === 'number' ? t.amount : (Number(t.amount) || 0)), 0);
                    const totalSellQty = group.sellTrades.reduce((sum, t) => sum + (t.quantity || 0), 0);
                    const totalSellAmt = group.sellTrades.reduce((sum, t) => sum + (typeof t.amount === 'number' ? t.amount : (Number(t.amount) || 0)), 0);
                    const netQty = totalBuyQty - totalSellQty;

                    return (
                        <div key={group.key} className="border rounded-xl bg-white dark:bg-slate-900/60 overflow-hidden shadow-sm">
                            {/* Contract / Stock Group Header */}
                            <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-black/[0.02] dark:bg-white/[0.02] border-b">
                                <div>
                                    <div className="font-bold text-sm text-[var(--upx-primary)]">
                                        {group.scripName}
                                    </div>
                                    {group.strikePrice ? (
                                        <div className="text-xs font-semibold text-muted-foreground mt-0.5">
                                            {group.strikePrice} {group.optionType} | Exp: {group.expiry || '—'}
                                        </div>
                                    ) : (
                                        <div className="text-[11px] text-muted-foreground">
                                            Segment: {group.segment}
                                        </div>
                                    )}
                                </div>

                                {/* Summary metrics for this group */}
                                <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                                    {totalBuyQty > 0 && (
                                        <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50">
                                            Bought: {totalBuyQty} (₹{totalBuyAmt.toFixed(2)})
                                        </span>
                                    )}
                                    {totalSellQty > 0 && (
                                        <span className="px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200/50">
                                            Sold: {totalSellQty} (₹{totalSellAmt.toFixed(2)})
                                        </span>
                                    )}
                                    <span className="px-2 py-0.5 rounded bg-black/5 dark:bg-white/10 font-bold">
                                        Net Qty: {netQty}
                                    </span>
                                </div>
                            </div>

                            {/* Group Trades Table */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-black/[0.01] dark:bg-white/[0.01] uppercase font-semibold text-muted-foreground text-[11px] border-b">
                                        <tr>
                                            <th className="px-3 py-2">Date & Time</th>
                                            <th className="px-3 py-2">Trade ID</th>
                                            <th className="px-3 py-2">Side</th>
                                            <th className="px-3 py-2 text-right">Qty</th>
                                            <th className="px-3 py-2 text-right">Price</th>
                                            <th className="px-3 py-2 text-right">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                        {group.displayedTrades.map((t, idx) => {
                                            const isBuy = t.transactionType?.toUpperCase() === 'BUY';
                                            return (
                                                <tr key={t.tradeId || idx} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                                                    <td className="px-3 py-2 whitespace-nowrap font-mono">{t.tradeDate || '—'}</td>
                                                    <td className="px-3 py-2 whitespace-nowrap font-mono text-[11px] text-muted-foreground">{t.tradeId || '—'}</td>
                                                    <td className="px-3 py-2 whitespace-nowrap">
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                            isBuy
                                                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                                                        }`}>
                                                            {t.transactionType || '—'}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-2 whitespace-nowrap text-right font-mono font-medium">{t.quantity ?? '—'}</td>
                                                    <td className="px-3 py-2 whitespace-nowrap text-right font-mono">₹{typeof t.price === 'number' ? t.price.toFixed(2) : (t.price || '0.00')}</td>
                                                    <td className="px-3 py-2 whitespace-nowrap text-right font-mono font-bold">₹{typeof t.amount === 'number' ? t.amount.toFixed(2) : (t.amount || '0.00')}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderAllAccountsTradeHistoryView = () => (
        <div className="space-y-6 p-4">
            {accounts.slice(1).map(account => {
                const trades = tradeHistory[account] || [];
                const loading = isLoadingTradeHistory[account];
                return (
                    <div key={account} className="border rounded-xl p-4 bg-white/50 dark:bg-slate-900/40 space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b">
                            <h4 className="font-bold text-sm text-[var(--upx-primary)] flex items-center gap-2">
                                <span>{account}</span>
                                <span className="text-xs font-normal text-muted-foreground">({trades.length} trades)</span>
                            </h4>
                            <button
                                onClick={() => fetchTradeHistory(account)}
                                disabled={loading}
                                className="px-2.5 py-1 text-xs rounded bg-[var(--upx-primary)] text-white hover:bg-[var(--upx-primary)]/80 disabled:opacity-50"
                            >
                                {loading ? 'Loading...' : 'Refresh'}
                            </button>
                        </div>
                        {loading ? (
                            <div className="py-6 text-center text-xs text-muted-foreground">Loading trade history for {account}...</div>
                        ) : (
                            renderTradeHistoryTable(trades)
                        )}
                    </div>
                );
            })}
        </div>
    );

    const renderIndividualAccountTradeHistoryView = () => {
        const trades = tradeHistory[selectedAccount] || [];
        const loading = isLoadingTradeHistory[selectedAccount];
        return (
            <div className="p-4">
                {loading ? (
                    <div className="py-8 text-center text-xs text-muted-foreground">Loading trade history for {selectedAccount}...</div>
                ) : (
                    renderTradeHistoryTable(trades)
                )}
            </div>
        );
    };

    // Render Profit & Loss Table
    const renderProfitAndLossTable = (records: TradeWiseProfitAndLossData[]) => {
        const getBuyAmount = (r: TradeWiseProfitAndLossData) =>
            typeof r.buyAmount === 'number' ? r.buyAmount : (typeof r.buy_amount === 'number' ? r.buy_amount : (Number(r.buyAmount || r.buy_amount) || 0));
        const getSellAmount = (r: TradeWiseProfitAndLossData) =>
            typeof r.sellAmount === 'number' ? r.sellAmount : (typeof r.sell_amount === 'number' ? r.sell_amount : (Number(r.sellAmount || r.sell_amount) || 0));

        const filteredRecords = records.filter(r => {
            const buyAmt = getBuyAmount(r);
            const sellAmt = getSellAmount(r);
            const realizedPnl = sellAmt - buyAmt;
            if (pnlTypeFilter === 'PROFIT') return realizedPnl > 0;
            if (pnlTypeFilter === 'LOSS') return realizedPnl < 0;
            return true;
        });

        if (!filteredRecords || filteredRecords.length === 0) {
            return (
                <div className="p-8 text-center text-sm text-muted-foreground">
                    {records.length > 0 ? `No ${pnlTypeFilter.toLowerCase()} records found for this period.` : 'No realized P&L records found for this period.'}
                </div>
            );
        }

        const count = filteredRecords.length;
        const totalBuyAmt = filteredRecords.reduce((sum, r) => sum + getBuyAmount(r), 0);
        const totalSellAmt = filteredRecords.reduce((sum, r) => sum + getSellAmount(r), 0);
        const netRealizedPnl = totalSellAmt - totalBuyAmt;
        const avgInvestment = count > 0 ? totalBuyAmt / count : 0;
        const avgPnl = count > 0 ? netRealizedPnl / count : 0;
        const uniqueCompanies = new Set(filteredRecords.map(r => r.scripName || r.scrip_name).filter(Boolean)).size;

        return (
            <div className="space-y-4 p-3">
                {/* Overall Summary Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-black/[0.02] dark:bg-white/[0.02] border rounded-xl font-mono text-xs">
                    <div className="flex items-center gap-3">
                        <span className="px-2.5 py-1 rounded-lg bg-[var(--upx-primary-50)] text-[var(--upx-primary)] border border-[var(--upx-border)] font-sans font-bold">
                            {uniqueCompanies} {uniqueCompanies === 1 ? 'Company' : 'Companies'}
                        </span>
                        <div className="text-slate-500 dark:text-slate-400 font-sans font-semibold">
                            {count} Realized Trades
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <span className="text-slate-600 dark:text-slate-300">Total Buy: ₹{totalBuyAmt.toFixed(2)}</span>
                        <span className="text-slate-600 dark:text-slate-300">Total Sell: ₹{totalSellAmt.toFixed(2)}</span>
                        <span className="text-slate-600 dark:text-slate-300">Avg Inv: ₹{avgInvestment.toFixed(2)}</span>
                        <span className={`font-semibold ${avgPnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            Avg P&L: {avgPnl >= 0 ? '+' : ''}₹{avgPnl.toFixed(2)}
                        </span>
                        <span className={`px-2.5 py-1 rounded font-bold text-sm ${
                            netRealizedPnl >= 0 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        }`}>
                            Net Realized P&L: ₹{netRealizedPnl.toFixed(2)}
                        </span>
                    </div>
                </div>

                <div className="overflow-x-auto border rounded-xl bg-white dark:bg-slate-900/60 shadow-sm">
                    <table className="w-full text-xs text-left">
                        <thead className="bg-black/5 dark:bg-white/5 uppercase font-semibold text-muted-foreground border-b text-[11px]">
                            <tr>
                                <th className="px-3 py-2.5">Scrip / Symbol</th>
                                <th className="px-3 py-2.5">Type</th>
                                <th className="px-3 py-2.5 text-right">Qty</th>
                                <th className="px-3 py-2.5">Buy Date</th>
                                <th className="px-3 py-2.5 text-right">Buy Avg</th>
                                <th className="px-3 py-2.5 text-right">Buy Amt</th>
                                <th className="px-3 py-2.5">Sell Date</th>
                                <th className="px-3 py-2.5 text-right">Sell Avg</th>
                                <th className="px-3 py-2.5 text-right">Sell Amt</th>
                                <th className="px-3 py-2.5 text-right font-bold">Realized P&L</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-black/5 dark:divide-white/5">
                            {filteredRecords.map((r, idx) => {
                                const buyAmt = getBuyAmount(r);
                                const sellAmt = getSellAmount(r);
                                const pnl = sellAmt - buyAmt;
                                const isProfit = pnl >= 0;
                                const scrip = r.scripName || r.scrip_name || '—';
                                const tradeType = r.tradeType || r.trade_type || tradeSegment;
                                const buyDate = r.buyDate || r.buy_date || '—';
                                const sellDate = r.sellDate || r.sell_date || '—';
                                const buyAvg = typeof r.buyAverage === 'number' ? r.buyAverage : (typeof r.buy_average === 'number' ? r.buy_average : (Number(r.buyAverage || r.buy_average) || 0));
                                const sellAvg = typeof r.sellAverage === 'number' ? r.sellAverage : (typeof r.sell_average === 'number' ? r.sell_average : (Number(r.sellAverage || r.sell_average) || 0));

                                return (
                                    <tr key={r.isin ? `${r.isin}-${idx}` : idx} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                                        <td className="px-3 py-2.5 whitespace-nowrap font-medium">
                                            <div>{scrip}</div>
                                            {r.isin && <div className="text-[10px] text-muted-foreground font-mono">{r.isin}</div>}
                                        </td>
                                        <td className="px-3 py-2.5 whitespace-nowrap">
                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-black/5 dark:bg-white/10">
                                                {tradeType}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2.5 whitespace-nowrap text-right font-mono font-medium">{r.quantity ?? '—'}</td>
                                        <td className="px-3 py-2.5 whitespace-nowrap font-mono text-[11px] text-muted-foreground">{buyDate}</td>
                                        <td className="px-3 py-2.5 whitespace-nowrap text-right font-mono">₹{buyAvg.toFixed(2)}</td>
                                        <td className="px-3 py-2.5 whitespace-nowrap text-right font-mono">₹{buyAmt.toFixed(2)}</td>
                                        <td className="px-3 py-2.5 whitespace-nowrap font-mono text-[11px] text-muted-foreground">{sellDate}</td>
                                        <td className="px-3 py-2.5 whitespace-nowrap text-right font-mono">₹{sellAvg.toFixed(2)}</td>
                                        <td className="px-3 py-2.5 whitespace-nowrap text-right font-mono">₹{sellAmt.toFixed(2)}</td>
                                        <td className={`px-3 py-2.5 whitespace-nowrap text-right font-mono font-bold ${
                                            isProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                                        }`}>
                                            {isProfit ? '+' : ''}₹{pnl.toFixed(2)}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const renderAllAccountsProfitAndLossView = () => (
        <div className="space-y-6 p-4">
            {accounts.slice(1).map(account => {
                const records = pnlData[account] || [];
                const loading = isLoadingPnl[account];
                return (
                    <div key={account} className="border rounded-xl p-4 bg-white/50 dark:bg-slate-900/40 space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b">
                            <h4 className="font-bold text-sm text-[var(--upx-primary)] flex items-center gap-2">
                                <span>{account}</span>
                                <span className="text-xs font-normal text-muted-foreground">({records.length} records)</span>
                            </h4>
                            <button
                                onClick={() => fetchProfitAndLoss(account)}
                                disabled={loading}
                                className="px-2.5 py-1 text-xs rounded bg-[var(--upx-primary)] text-white hover:bg-[var(--upx-primary)]/80 disabled:opacity-50"
                            >
                                {loading ? 'Loading...' : 'Refresh'}
                            </button>
                        </div>
                        {loading ? (
                            <div className="py-6 text-center text-xs text-muted-foreground">Loading P&L report for {account}...</div>
                        ) : (
                            renderProfitAndLossTable(records)
                        )}
                    </div>
                );
            })}
        </div>
    );

    const renderIndividualAccountProfitAndLossView = () => {
        const records = pnlData[selectedAccount] || [];
        const loading = isLoadingPnl[selectedAccount];
        return (
            <div className="p-4">
                {loading ? (
                    <div className="py-8 text-center text-xs text-muted-foreground">Loading P&L report for {selectedAccount}...</div>
                ) : (
                    renderProfitAndLossTable(records)
                )}
            </div>
        );
    };

    return (
        <SidebarInset className="flex min-h-screen flex-col overflow-y-auto py-6 px-4 bg-gradient-to-b from-slate-50 via-[var(--upx-primary-50)] to-slate-100 dark:from-[#0b1220] dark:via-[#0a0f1a] dark:to-black">


            <div className="max-w-8xl w-full mx-auto upstox-theme rounded-2xl bg-white/70 dark:bg-slate-900/40 ring-1 ring-black/10 dark:ring-white/10 shadow-sm backdrop-blur p-4 sm:p-6 relative">
                {/* Toaster moved to global layout (app/layout.tsx) */}
                {/* Nexus brand banner */}
                <div className="flex items-center gap-3">
                    <Link
                        href="/"
                        className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-[var(--upx-primary-50)] hover:bg-[var(--upx-primary)]/15 text-[var(--upx-primary)] transition-colors border border-[var(--upx-border)]"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[var(--upx-primary)] to-[var(--upx-primary-700)] flex items-center justify-center text-white shadow-sm">
                            <Layers className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
                                    Nexus Stocks
                                </h1>
                                <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-[var(--upx-primary-50)] text-[var(--upx-primary)] border border-[var(--upx-border)]">
                                    Equity Terminal
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Order Execution &amp; Multi-Account Hub
                            </p>
                        </div>
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

                            {/* Place Order */}
                            <TabsContent value="Place Order" className="space-y-3">
                                <div className="relative">
                                    {!isUserLoggedIn && (
                                        <div className="absolute inset-0 backdrop-blur-sm bg-white/50 dark:bg-slate-900/50 z-50 flex items-center justify-center rounded-lg">
                                            <div className="text-center p-6 bg-white/90 dark:bg-slate-800/90 rounded-xl shadow-lg border-2 border-red-200">
                                                <p className="text-xl font-bold text-red-600 mb-2">⚠️ Account Not Logged In</p>
                                                <p className="text-gray-600 dark:text-gray-400">Please log in to access trading functionality for {selectedAccount}</p>
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2">
                                        <div className="h-5 w-1 rounded bg-[var(--upx-primary)]" />
                                        <h3 className="text-lg font-semibold text-[var(--upx-primary)] dark:text-[var(--upx-primary-300)]">Place order</h3>
                                        <div className="flex items-center gap-2 ml-5">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (selectedAccount === 'All accounts') {
                                                        for (const account of accounts.slice(1)) {
                                                            fetchAccountFunds(account);
                                                        }
                                                    } else {
                                                        fetchAccountFunds(selectedAccount);
                                                    }
                                                }}
                                                className="px-3 py-1 text-sm bg-[var(--upx-primary)] text-white rounded-md hover:bg-[var(--upx-primary)]/80 transition-colors"
                                            >
                                                Refresh Funds
                                            </button>
                                        </div>
                                    </div>
                                    <div className="space-y-6 mt-2">
                                        {/* Company Selection Section */}
                                        <div className="flex gap-4 items-start mt-2">
                                            {/* Search Input - Reduced Width */}
                                            <div className="relative flex-1 max-w-md mt-2">
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
                                                <div className="flex-1 max-w-md p-2.5 bg-[var(--upx-primary-50)] border border-[var(--upx-border)] rounded-md mt-2">
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


                                                {/* Quantity Inputs */}
                                                {accounts.length > 1 && (
                                                    /* Individual Quantities */
                                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                                        {accounts.slice(1).map((account) => (
                                                            <div key={account}>
                                                                <label htmlFor={`quantity-${account}`} className="block text-sm font-medium text-gray-700 mb-1">
                                                                    {account} <span className="text-red-500">*</span>
                                                                </label>
                                                                <div className="relative">
                                                                    <div className="flex gap-0">
                                                                        <input
                                                                            id={`quantity-${account}`}
                                                                            className={`flex-1 border rounded-l px-3 py-2 focus:outline-none border-r-0 ${!accountLogin[account] || accountFunds[account] <= 0
                                                                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                                                : 'focus:ring-2 focus:ring-[var(--upx-primary)]/60 bg-white'
                                                                                }`}
                                                                            type="number"
                                                                            placeholder={
                                                                                !accountLogin[account]
                                                                                    ? 'Account not logged in'
                                                                                    : accountFunds[account] <= 0
                                                                                        ? 'No funds available'
                                                                                        : `Qty for ${account}`
                                                                            }
                                                                            value={orderForms[account]?.quantity || ''}
                                                                            onChange={(e) => accountLogin[account] && accountFunds[account] > 0 && handleIndividualQuantityChange(account, e.target.value)}
                                                                            disabled={!accountLogin[account] || accountFunds[account] <= 0}
                                                                        />
                                                                        {/* Capital Info - Right Half */}
                                                                        <div className="flex-1 bg-gray-50 border rounded-r px-3 py-2 text-xs text-gray-600 border-l-0">
                                                                            {(() => {
                                                                                const capitalInfo = getCapitalInfo(account, orderForms[account]?.quantity || '');
                                                                                const isLoading = isLoadingFunds[account] || false;
                                                                                const hasInsufficientFunds = capitalInfo.capitalRemaining < 0;
                                                                                return (
                                                                                    <div className="flex flex-col justify-center h-full">
                                                                                        {isLoading ? (
                                                                                            <div className="text-center text-xs">Loading funds...</div>
                                                                                        ) : (
                                                                                            <>
                                                                                                <div>₹{capitalInfo.availableFunds.toFixed(2)} Available</div>

                                                                                                {hasInsufficientFunds ? (
                                                                                                    <div className="text-red-600 font-semibold">⚠️ Insufficient Funds!</div>
                                                                                                ) : (
                                                                                                    <div>Max {isNaN(capitalInfo?.purchasableStocks) ? '0' : capitalInfo?.purchasableStocks} stocks</div>
                                                                                                )}
                                                                                            </>
                                                                                        )}
                                                                                    </div>
                                                                                );
                                                                            })()}
                                                                        </div>
                                                                        {!accountLogin[account] && (
                                                                            <div className="absolute top-0 right-0 h-full px-3 flex items-center">
                                                                                <span className="text-red-500">🔒</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Common Order Fields */}
                                                <div className="grid grid-cols-2 gap-4">
                                                    {/* Left Column */}
                                                    <div className="space-y-4">
                                                        {/* Trigger Price Field (for SL orders) */}
                                                        {!isOrderMarketOrLimit() && (
                                                            <div>
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
                                                                    className={`flex-1 border rounded-l px-3 py-2 focus:outline-none border-r-0 ${accountFunds[selectedAccount] <= 0
                                                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                                        : 'focus:ring-2 focus:ring-[var(--upx-primary)]/60'
                                                                        }`}
                                                                    type="number"
                                                                    placeholder={accountFunds[selectedAccount] <= 0 ? "No funds available" : "Enter quantity"}
                                                                    value={orderForm.quantity}
                                                                    onChange={(e) => handleInputChange('quantity', e.target.value)}
                                                                    disabled={accountFunds[selectedAccount] <= 0}
                                                                />
                                                                {/* Capital Info - Right Half */}
                                                                <div className="flex-1 bg-gray-50 border rounded-r px-3 py-2 text-xs text-gray-600 border-l-0">
                                                                    {(() => {
                                                                        const capitalInfo = getCapitalInfo(selectedAccount, orderForm.quantity);
                                                                        const isLoading = isLoadingFunds[selectedAccount] || false;
                                                                        const hasInsufficientFunds = capitalInfo.capitalRemaining < 0;
                                                                        return (
                                                                            <div className="flex flex-col justify-center h-full">
                                                                                {isLoading ? (
                                                                                    <div className="text-center text-xs">Loading funds...</div>
                                                                                ) : (
                                                                                    <>
                                                                                        <div>₹{capitalInfo.availableFunds.toFixed(2)} Available</div>

                                                                                        {hasInsufficientFunds ? (
                                                                                            <div className="text-red-600 font-semibold">⚠️ Insufficient Funds!</div>
                                                                                        ) : (
                                                                                            <div>Max {isNaN(capitalInfo?.purchasableStocks) ? '0' : capitalInfo?.purchasableStocks} stocks</div>
                                                                                        )}
                                                                                    </>
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    })()}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Trigger Price Field (for SL orders) */}
                                                    {!isOrderMarketOrLimit() && (
                                                        <div>
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
                                            {(() => {
                                                // Check for insufficient funds, missing selections, and no funds
                                                let hasInsufficientFunds = false;
                                                let insufficientFundsAccounts: string[] = [];
                                                let hasNoFunds = false;
                                                // True when company/instrument/quantity/search term is missing or quantity is 0
                                                let hasMissingSelection = false;

                                                if (selectedAccount === 'All accounts') {
                                                    // Check all accounts for insufficient funds and missing selections
                                                    for (const account of accounts.slice(1)) {
                                                        const accountForm = orderForms[account];

                                                        // Validate quantity/selection/search term for each account
                                                        const acctCompany = selectedCompanies[account] || '';
                                                        const acctInstrument = selectedInstrumentKeys[account] || '';
                                                        const acctQty = Number.parseInt(accountForm?.quantity || '0', 10) || 0;
                                                        const acctSearchTerm = searchTerms[account] || '';

                                                        if (!acctCompany || !acctInstrument || acctQty <= 0 || !acctSearchTerm) {
                                                            hasMissingSelection = true;
                                                        }

                                                        if (accountForm?.quantity && accountForm?.transactionType === 'Buy' && lastClosingPrice) {
                                                            const capitalInfo = getCapitalInfo(account, accountForm.quantity);
                                                            if (capitalInfo.capitalRemaining < 0) {
                                                                hasInsufficientFunds = true;
                                                                insufficientFundsAccounts.push(account);
                                                            }
                                                        }
                                                    }
                                                } else {
                                                    // Check single account for insufficient funds and missing selection
                                                    const acctQty = Number.parseInt(orderForm?.quantity || '0', 10) || 0;
                                                    if (!selectedCompany || !selectedInstrumentKey || acctQty <= 0 || !searchTerm) {
                                                        hasMissingSelection = true;
                                                    }

                                                    if (orderForm?.quantity && orderForm?.transactionType === 'Buy' && lastClosingPrice) {
                                                        const capitalInfo = getCapitalInfo(selectedAccount, orderForm.quantity);
                                                        if (capitalInfo.capitalRemaining < 0) {
                                                            hasInsufficientFunds = true;
                                                            insufficientFundsAccounts.push(selectedAccount);
                                                        }
                                                    }
                                                }

                                                // Check for no funds condition
                                                if (selectedAccount === 'All accounts') {
                                                    // Check if all accounts have no funds
                                                    hasNoFunds = accounts.slice(1).every(account => accountFunds[account] <= 0);
                                                } else {
                                                    hasNoFunds = accountFunds[selectedAccount] <= 0;
                                                }

                                                return (
                                                    <>
                                                        {(hasInsufficientFunds || hasNoFunds) && (
                                                            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-md">
                                                                <div className="flex items-center gap-2 text-red-800">
                                                                    <span>⚠️</span>
                                                                    <span className="font-medium">{hasNoFunds ? 'No Funds Available' : 'Insufficient Funds'}</span>
                                                                </div>
                                                                <div className="text-sm text-red-700 mt-1">
                                                                    {hasNoFunds ? (
                                                                        selectedAccount === 'All accounts'
                                                                            ? 'All accounts have no funds available.'
                                                                            : `${selectedAccount} has no funds available.`
                                                                    ) : (
                                                                        insufficientFundsAccounts.length === 1
                                                                            ? `${insufficientFundsAccounts[0]} has insufficient funds for this order.`
                                                                            : `${insufficientFundsAccounts.length} accounts have insufficient funds: ${insufficientFundsAccounts.join(', ')}`
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}
                                                        {/* Two simpler buttons: one for batch (All accounts) and one for single account. */}
                                                        {selectedAccount === 'All accounts' ? (
                                                            (() => {
                                                                const disabled = hasInsufficientFunds || hasNoFunds || isSubmittingOrder || hasMissingSelection;
                                                                const className = `w-full py-3 text-base font-medium rounded-md transition-colors ${disabled ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'btn-upstox hover:bg-[var(--upx-primary)]/90'}`;
                                                                const label = isSubmittingOrder
                                                                    ? `Placing Orders (${accounts.slice(1).length})...`
                                                                    : hasNoFunds
                                                                        ? 'No Funds Available in Any Account'
                                                                        : hasInsufficientFunds
                                                                            ? 'Insufficient Funds - Cannot Place Order'
                                                                            : hasMissingSelection
                                                                                ? 'Select companies and quantities to proceed'
                                                                                : `Place Orders for All Accounts (${accounts.slice(1).length} accounts)`;

                                                                return (
                                                                    <button
                                                                        className={className}
                                                                        onClick={disabled ? undefined : handleSubmitOrder}
                                                                        disabled={disabled}
                                                                    >
                                                                        {label}
                                                                    </button>
                                                                );
                                                            })()
                                                        ) : (
                                                            (() => {
                                                                const disabled = hasInsufficientFunds || hasNoFunds || isSubmittingOrder || hasMissingSelection;
                                                                const className = `w-full py-3 text-base font-medium rounded-md transition-colors ${disabled ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'btn-upstox hover:bg-[var(--upx-primary)]/90'}`;
                                                                const label = isSubmittingOrder
                                                                    ? `Placing Order for ${selectedAccount}...`
                                                                    : hasNoFunds
                                                                        ? `No Funds Available in ${selectedAccount}`
                                                                        : hasInsufficientFunds
                                                                            ? 'Insufficient Funds - Cannot Place Order'
                                                                            : hasMissingSelection
                                                                                ? 'Select company and quantity to proceed'
                                                                                : `Place Order for ${selectedAccount}`;

                                                                return (
                                                                    <button
                                                                        className={className}
                                                                        onClick={disabled ? undefined : handleSubmitOrder}
                                                                        disabled={disabled}
                                                                    >
                                                                        {label}
                                                                    </button>
                                                                );
                                                            })()
                                                        )}
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>

                            {/* Trade History */}
                            <TabsContent value="Trade History" className="space-y-4">
                                <div className="space-y-3">
                                    <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white/60 dark:bg-slate-900/40 rounded-xl border border-black/5 dark:border-white/5">
                                        <div className="flex items-center gap-2">
                                            <div className="h-5 w-1 rounded bg-[var(--upx-primary)]" />
                                            <h3 className="text-lg font-semibold text-[var(--upx-primary)] dark:text-[var(--upx-primary-300)]">
                                                Trade History
                                            </h3>
                                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[var(--upx-primary-50)] text-[var(--upx-primary)] border border-[var(--upx-border)]">
                                                Segment: {tradeSegment}
                                            </span>
                                        </div>

                                        {/* Date selection controls & Buy/Sell Filter */}
                                        <div className="flex flex-wrap items-center gap-3 text-xs">
                                                {/* Sold / Unsold / All Toggle Segment */}
                                                <div className="flex rounded-lg border p-0.5 bg-black/5 dark:bg-white/5 font-semibold">
                                                    <button
                                                        type="button"
                                                        onClick={() => setTradeTypeFilter('ALL')}
                                                        className={`px-2.5 py-1 rounded transition-colors ${
                                                            tradeTypeFilter === 'ALL'
                                                                ? 'bg-white dark:bg-slate-800 text-[var(--upx-primary)] shadow-sm'
                                                                : 'text-muted-foreground hover:text-foreground'
                                                        }`}
                                                    >
                                                        All
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setTradeTypeFilter('SOLD')}
                                                        className={`px-2.5 py-1 rounded transition-colors ${
                                                            tradeTypeFilter === 'SOLD'
                                                                ? 'bg-emerald-600 text-white shadow-sm'
                                                                : 'text-muted-foreground hover:text-emerald-700'
                                                        }`}
                                                    >
                                                        Sold
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setTradeTypeFilter('UNSOLD')}
                                                        className={`px-2.5 py-1 rounded transition-colors ${
                                                            tradeTypeFilter === 'UNSOLD'
                                                                ? 'bg-amber-600 text-white shadow-sm'
                                                                : 'text-muted-foreground hover:text-amber-700'
                                                        }`}
                                                    >
                                                        Unsold
                                                    </button>
                                                </div>

                                            <div className="flex items-center gap-1.5">
                                                <label className="text-muted-foreground font-medium">From:</label>
                                                <input
                                                    type="date"
                                                    value={tradeStartDate}
                                                    onChange={(e) => setTradeStartDate(e.target.value)}
                                                    className="border rounded px-2 py-1 bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-[var(--upx-primary)]"
                                                />
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <label className="text-muted-foreground font-medium">To:</label>
                                                <input
                                                    type="date"
                                                    value={tradeEndDate}
                                                    onChange={(e) => setTradeEndDate(e.target.value)}
                                                    className="border rounded px-2 py-1 bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-[var(--upx-primary)]"
                                                />
                                            </div>
                                            <button
                                                onClick={() => fetchTradeHistory(selectedAccount)}
                                                disabled={isLoadingTradeHistory[selectedAccount]}
                                                className="px-3 py-1 bg-[var(--upx-primary)] text-white font-medium rounded hover:bg-[var(--upx-primary)]/90 transition-colors disabled:opacity-50"
                                            >
                                                {isLoadingTradeHistory[selectedAccount] ? 'Loading...' : 'Fetch Trades'}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Trade history records display */}
                                    <div className="upstox-surface rounded-xl overflow-hidden border">
                                        {selectedAccount === 'All accounts'
                                            ? renderAllAccountsTradeHistoryView()
                                            : renderIndividualAccountTradeHistoryView()}
                                    </div>
                                </div>
                            </TabsContent>

                            {/* Profit and Loss */}
                            <TabsContent value="Profit and Loss" className="space-y-4">
                                <div className="space-y-3">
                                    <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white/60 dark:bg-slate-900/40 rounded-xl border border-black/5 dark:border-white/5">
                                        <div className="flex items-center gap-2">
                                            <div className="h-5 w-1 rounded bg-[var(--upx-primary)]" />
                                            <h3 className="text-lg font-semibold text-[var(--upx-primary)] dark:text-[var(--upx-primary-300)]">
                                                Realized Profit &amp; Loss Report
                                            </h3>
                                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[var(--upx-primary-50)] text-[var(--upx-primary)] border border-[var(--upx-border)]">
                                                Segment: {tradeSegment}
                                            </span>
                                        </div>

                                        {/* Date selection, FY & Filter controls */}
                                        <div className="flex flex-wrap items-center gap-3 text-xs">
                                            {/* Profit / Loss Filter */}
                                            <div className="flex rounded-lg border p-0.5 bg-black/5 dark:bg-white/5 font-semibold">
                                                <button
                                                    type="button"
                                                    onClick={() => setPnlTypeFilter('ALL')}
                                                    className={`px-2.5 py-1 rounded transition-colors ${
                                                        pnlTypeFilter === 'ALL'
                                                            ? 'bg-white dark:bg-slate-800 text-[var(--upx-primary)] shadow-sm'
                                                            : 'text-muted-foreground hover:text-foreground'
                                                    }`}
                                                >
                                                    All
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setPnlTypeFilter('PROFIT')}
                                                    className={`px-2.5 py-1 rounded transition-colors ${
                                                        pnlTypeFilter === 'PROFIT'
                                                            ? 'bg-emerald-600 text-white shadow-sm'
                                                            : 'text-muted-foreground hover:text-emerald-700'
                                                    }`}
                                                >
                                                    Profits
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setPnlTypeFilter('LOSS')}
                                                    className={`px-2.5 py-1 rounded transition-colors ${
                                                        pnlTypeFilter === 'LOSS'
                                                            ? 'bg-rose-600 text-white shadow-sm'
                                                            : 'text-muted-foreground hover:text-rose-700'
                                                    }`}
                                                >
                                                    Losses
                                                </button>
                                            </div>

                                            <div className="flex items-center gap-1.5">
                                                <label className="text-muted-foreground font-medium">FY:</label>
                                                <select
                                                    value={pnlFinancialYear}
                                                    onChange={(e) => setPnlFinancialYear(e.target.value)}
                                                    className="border rounded px-2 py-1 bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-[var(--upx-primary)] font-semibold text-[var(--upx-primary)]"
                                                >
                                                    <option value="2627">FY 26-27</option>
                                                    <option value="2526">FY 25-26</option>
                                                    <option value="2425">FY 24-25</option>
                                                    <option value="2324">FY 23-24</option>
                                                    <option value="2223">FY 22-23</option>
                                                </select>
                                            </div>

                                            <div className="flex items-center gap-1.5">
                                                <label className="text-muted-foreground font-medium">From:</label>
                                                <input
                                                    type="date"
                                                    value={pnlStartDate}
                                                    onChange={(e) => {
                                                        const newStart = e.target.value;
                                                        setPnlStartDate(newStart);
                                                        const autoFY = calculateFYFromDate(newStart);
                                                        if (autoFY) setPnlFinancialYear(autoFY);
                                                    }}
                                                    className="border rounded px-2 py-1 bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-[var(--upx-primary)]"
                                                />
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <label className="text-muted-foreground font-medium">To:</label>
                                                <input
                                                    type="date"
                                                    value={pnlEndDate}
                                                    onChange={(e) => {
                                                        const newEnd = e.target.value;
                                                        setPnlEndDate(newEnd);
                                                        // If start date is not yet chosen or same year, derive from end date
                                                        const autoFY = calculateFYFromDate(pnlStartDate || newEnd);
                                                        if (autoFY) setPnlFinancialYear(autoFY);
                                                    }}
                                                    className="border rounded px-2 py-1 bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-[var(--upx-primary)]"
                                                />
                                            </div>
                                            <button
                                                onClick={() => fetchProfitAndLoss(selectedAccount)}
                                                disabled={isLoadingPnl[selectedAccount]}
                                                className="px-3 py-1 bg-[var(--upx-primary)] text-white font-medium rounded hover:bg-[var(--upx-primary)]/90 transition-colors disabled:opacity-50"
                                            >
                                                {isLoadingPnl[selectedAccount] ? 'Loading...' : 'Fetch P&L'}
                                            </button>
                                        </div>
                                    </div>

                                    {/* P&L records display */}
                                    <div className="upstox-surface rounded-xl overflow-hidden border">
                                        {selectedAccount === 'All accounts'
                                            ? renderAllAccountsProfitAndLossView()
                                            : renderIndividualAccountProfitAndLossView()}
                                    </div>
                                </div>
                            </TabsContent>
                        </div>
                    </Tabs>
                </div>
            </div>

            {/* Sell Confirmation Modal */}
            {sellModalOpen && selectedOrderToSell && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
                        <h3 className="text-lg font-semibold mb-4 text-[var(--upx-primary)]">
                            Confirm Sell Order
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <p className="text-sm text-gray-600">
                                    Company: <span className="font-medium">{selectedOrderToSell.companyName}</span>
                                </p>
                                <p className="text-sm text-gray-600">
                                    Available Quantity: <span className="font-medium">{selectedOrderToSell.holdingQty}</span>
                                </p>
                                <p className="text-sm text-gray-600">
                                    Current Price: <span className="font-medium">{lastClosingPrices[selectedAccount] ? `₹${lastClosingPrices[selectedAccount].toFixed(2)}` : 'Loading...'}</span>
                                </p>
                            </div>

                            {/* Quantity */}
                            <div>
                                <label htmlFor="sell-quantity" className="block text-sm font-medium text-gray-700 mb-2">
                                    Quantity to Sell <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="sell-quantity"
                                    type="number"
                                    value={sellQuantity}
                                    onChange={(e) => setSellQuantity(e.target.value)}
                                    className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--upx-primary)]/60"
                                    placeholder="Enter quantity"
                                    min="1"
                                    max={selectedOrderToSell.holdingQty}
                                />
                                {/* Percentage Buttons */}
                                <div className="flex gap-2 mt-2">
                                    {[25, 50, 75, 100].map((p) => {
                                        const qty = Math.floor((selectedOrderToSell.holdingQty * p) / 100);
                                        const isValid = qty >= 1;
                                        return isValid ? (
                                            <button
                                                key={p}
                                                type="button"
                                                onClick={() => setSellQuantity(qty.toString())}
                                                className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                                            >
                                                {p}%
                                            </button>
                                        ) : null;
                                    })}
                                </div>
                            </div>

                            {/* Estimated Proceeds */}
                            {sellQuantity && (
                                <div className="p-3 bg-gray-50 rounded">
                                    <p className="text-sm text-gray-600">
                                        Estimated Proceeds: <span className="font-medium">₹{(Number.parseInt(sellQuantity) * (lastClosingPrices[selectedAccount] || 0)).toFixed(2)}</span>
                                    </p>
                                </div>
                            )}

                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => {
                                        setSellModalOpen(false);
                                        setSelectedOrderToSell(null);
                                        setSellQuantity('');
                                    }}
                                    className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                                    disabled={isSubmittingOrder}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmSellOrder}
                                    className="flex-1 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                                    disabled={isSubmittingOrder || !sellQuantity || Number.parseInt(sellQuantity) <= 0 || Number.parseInt(sellQuantity) > selectedOrderToSell.holdingQty}
                                >
                                    {isSubmittingOrder ? 'Placing Order...' : 'Confirm Sell'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </SidebarInset>
    );
}
