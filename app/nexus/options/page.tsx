"use client";
import * as React from "react";
import { useEffect, useMemo, useState, useCallback } from "react";
import { SidebarInset } from "@/components/ui/sidebar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";
import { ArrowLeft, Layers, X, ChevronUp, ChevronDown, RotateCcw } from "lucide-react";
import { fetchUpstoxIntradayData, fetchUpstoxHistoricalData } from "@/components/utils/upstoxApi";
import toast, { Toaster } from 'react-hot-toast';
import { algoHorizonApi } from "@/lib/api/algoHorizonApi";
import { useRouter, useSearchParams } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { fetchInstrumentsMapping } from '@/lib/store/instrumentsSlice';
import { fetchOptionContracts, type OptionContract } from '@/app/alerts/instrumentCatalog';

export default function NexusOptionsPage() {
    // Account to phone number mapping
    const [accountPhoneMapping, setAccountPhoneMapping] = useState<Record<string, string>>({});
    const [accounts, setAccounts] = useState<string[]>([]);
    const [accountLogin, setAccountLogin] = useState<Record<string, boolean>>({});
    const [selectedAccount, setSelectedAccount] = useState<string>("All accounts");
    const featureTabs = useMemo(
        () => [
            "Place Order",
            "Open Positions",
            "Order Book",
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
    const [selectedUnderlyingKeys, setSelectedUnderlyingKeys] = React.useState<{ [account: string]: string }>({});
    const [lastClosingPrices, setLastClosingPrices] = React.useState<{ [account: string]: number | null }>({});
    const [companyPrices, setCompanyPrices] = React.useState<{ [company: string]: number | null }>({});
    const [isLoadingPrices, setIsLoadingPrices] = React.useState<{ [account: string]: boolean }>({});

    // Live price indicator
    const [isLivePrice, setIsLivePrice] = useState<boolean>(false)
    const [disclosedQuantityEnabled, setDisclosedQuantityEnabled] = React.useState<{ [account: string]: boolean }>({});

    // Option Contracts state
    const [optionContracts, setOptionContracts] = useState<OptionContract[]>([]);
    const [isLoadingContracts, setIsLoadingContracts] = useState<boolean>(false);
    const [contractsError, setContractsError] = useState<string | null>(null);
    const [selectedExpiry, setSelectedExpiry] = useState<string>('');
    const [selectedOptionContract, setSelectedOptionContract] = useState<OptionContract | null>(null);
    const [selectedLots, setSelectedLots] = useState<number>(1);
    const [underlyingRecordedPrice, setUnderlyingRecordedPrice] = useState<number | null>(null);
    const [contractLtpMap, setContractLtpMap] = useState<Record<string, number>>({});
    const [isLoadingOptionLtp, setIsLoadingOptionLtp] = useState<boolean>(false);
    const [strikeOffset, setStrikeOffset] = useState<number>(0);

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

    // Daily Order Book interface (supports both camelCase and snake_case DTO fields)
    interface DailyOrderRecord {
        exchange?: string;
        product?: string;
        price?: number;
        quantity?: number;
        status?: string;
        guid?: string | null;
        tag?: string | null;
        instrument_token?: string;
        instrumentToken?: string;
        placed_by?: string;
        placedBy?: string;
        trading_symbol?: string;
        tradingsymbol?: string;
        tradingSymbol?: string;
        order_type?: string;
        orderType?: string;
        validity?: string;
        trigger_price?: number;
        triggerPrice?: number;
        disclosed_quantity?: number;
        disclosedQuantity?: number;
        transaction_type?: string;
        transactionType?: string;
        average_price?: number;
        averagePrice?: number;
        filled_quantity?: number;
        filledQuantity?: number;
        pending_quantity?: number;
        pendingQuantity?: number;
        status_message?: string | null;
        statusMessage?: string | null;
        status_message_raw?: string | null;
        statusMessageRaw?: string | null;
        exchange_order_id?: string;
        exchangeOrderId?: string;
        parent_order_id?: string | null;
        parentOrderId?: string | null;
        order_id?: string;
        orderId?: string;
        variety?: string;
        order_timestamp?: string;
        orderTimestamp?: string;
        exchange_timestamp?: string | null;
        exchangeTimestamp?: string | null;
        is_amo?: boolean;
        isAmo?: boolean;
        order_request_id?: string;
        orderRequestId?: string;
        order_ref_id?: string;
        orderRefId?: string;
    }

    interface GetOrderBookResponse {
        status?: string;
        data?: DailyOrderRecord[];
        message?: string;
    }

    // Daily Order Book state
    const [orderBookData, setOrderBookData] = useState<{ [account: string]: DailyOrderRecord[] }>({});
    const [isLoadingOrderBook, setIsLoadingOrderBook] = useState<{ [account: string]: boolean }>({});
    const [orderBookStatusFilter, setOrderBookStatusFilter] = useState<'ALL' | 'COMPLETE' | 'OPEN' | 'CANCELLED' | 'REJECTED'>('ALL');

    // Open Positions interface (supports camelCase and snake_case DTO fields)
    interface PositionRecord {
        exchange?: string;
        multiplier?: number;
        value?: number;
        pnl?: number;
        product?: string;
        instrument_token?: string;
        instrumentToken?: string;
        average_price?: number;
        averagePrice?: number;
        buy_value?: number;
        buyValue?: number;
        overnight_quantity?: number;
        overnightQuantity?: number;
        day_buy_value?: number;
        dayBuyValue?: number;
        day_buy_price?: number;
        dayBuyPrice?: number;
        overnight_buy_amount?: number;
        overnightBuyAmount?: number;
        overnight_buy_quantity?: number;
        overnightBuyQuantity?: number;
        day_buy_quantity?: number;
        dayBuyQuantity?: number;
        day_sell_value?: number;
        daySellValue?: number;
        day_sell_price?: number;
        daySellPrice?: number;
        overnight_sell_amount?: number;
        overnightSellAmount?: number;
        overnight_sell_quantity?: number;
        overnightSellQuantity?: number;
        day_sell_quantity?: number;
        daySellQuantity?: number;
        quantity?: number;
        last_price?: number;
        lastPrice?: number;
        unrealised?: number;
        realised?: number;
        sell_value?: number;
        sellValue?: number;
        tradingsymbol?: string;
        trading_symbol?: string;
        tradingSymbol?: string;
        close_price?: number;
        closePrice?: number;
        buy_price?: number;
        buyPrice?: number;
        sell_price?: number;
        sellPrice?: number;
    }

    interface GetPositionResponse {
        status?: string;
        data?: PositionRecord[];
        message?: string;
    }

    // Open Positions state
    const [positionsData, setPositionsData] = useState<{ [account: string]: PositionRecord[] }>({});
    const [isLoadingPositions, setIsLoadingPositions] = useState<{ [account: string]: boolean }>({});
    const [positionsPnlFilter, setPositionsPnlFilter] = useState<'ALL' | 'PROFIT' | 'LOSS'>('ALL');

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
    const [pnlChargesMap, setPnlChargesMap] = useState<Record<string, number>>({});
    const [isLoadingCharges, setIsLoadingCharges] = useState<boolean>(false);
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
    const tradeSegment = "FO";

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
    const selectedUnderlyingKey = selectedUnderlyingKeys[selectedAccount] || '';
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

    // Visible CE and PE strikes for the selected expiry with paging/shifting support
    const visibleStrikeContracts = useMemo(() => {
        const effectivePrice = underlyingRecordedPrice ?? lastClosingPrice ?? 0;
        const expiryContracts = optionContracts.filter(c => !selectedExpiry || c.expiry === selectedExpiry);

        // All distinct strikes sorted ascending
        const allStrikes = Array.from(
            new Set(
                expiryContracts
                    .map(c => c.strike_price)
                    .filter((sp): sp is number => typeof sp === 'number')
            )
        ).sort((a, b) => a - b);

        if (allStrikes.length === 0) {
            return {
                callContracts: [],
                putContracts: [],
                canMoveUp: false,
                canMoveDown: false,
                strikeOffset: 0,
                visibleStrikes: []
            };
        }

        // Find ATM strike index (closest to effectivePrice)
        let atmIndex = 0;
        if (effectivePrice > 0) {
            let minDiff = Infinity;
            allStrikes.forEach((strike, idx) => {
                const diff = Math.abs(strike - effectivePrice);
                if (diff < minDiff) {
                    minDiff = diff;
                    atmIndex = idx;
                }
            });
        } else {
            atmIndex = Math.floor(allStrikes.length / 2);
        }

        // Base window centered on ATM: 3 below ATM, ATM, 2 above ATM (total 6 strikes)
        const windowSize = 6;
        const baseStartIndex = Math.max(0, Math.min(atmIndex - 2, allStrikes.length - windowSize));
        const effectiveStartIndex = Math.max(0, Math.min(baseStartIndex + strikeOffset, Math.max(0, allStrikes.length - windowSize)));
        const visibleStrikes = allStrikes.slice(effectiveStartIndex, effectiveStartIndex + windowSize);

        const canMoveUp = effectiveStartIndex + windowSize < allStrikes.length;
        const canMoveDown = effectiveStartIndex > 0;

        // Map visible strikes to corresponding CE and PE contracts
        const callContracts = visibleStrikes
            .map(strike => expiryContracts.find(c => c.instrument_type === 'CE' && c.strike_price === strike))
            .filter((c): c is OptionContract => Boolean(c));

        const putContracts = visibleStrikes
            .map(strike => expiryContracts.find(c => c.instrument_type === 'PE' && c.strike_price === strike))
            .filter((c): c is OptionContract => Boolean(c));

        return {
            callContracts,
            putContracts,
            canMoveUp,
            canMoveDown,
            strikeOffset,
            visibleStrikes
        };
    }, [optionContracts, selectedExpiry, underlyingRecordedPrice, lastClosingPrice, strikeOffset]);

    // Live LTP polling every 5 seconds for all relevant instrument keys in a SINGLE batch API call
    // Only active when on "Place Order" tab and a company is selected (until order is placed)
    useEffect(() => {
        const currentCompany = selectedCompanies[selectedAccount] || '';
        // If not on "Place Order" tab or no company selected, do not poll
        if (activeFeature !== 'Place Order' || !currentCompany) {
            return;
        }

        const pollLtpBatch = () => {
            const underlyingKey = selectedUnderlyingKeys[selectedAccount] || selectedUnderlyingKeys["All accounts"];
            const strikeKeys = [
                ...visibleStrikeContracts.callContracts,
                ...visibleStrikeContracts.putContracts,
            ].map(c => c.instrument_key);

            if (selectedOptionContract?.instrument_key) {
                strikeKeys.push(selectedOptionContract.instrument_key);
            }

            // Combine underlying key and all strike keys into a single batch
            const allKeysToPoll = Array.from(new Set([underlyingKey, ...strikeKeys].filter(Boolean)));
            if (allKeysToPoll.length > 0) {
                fetchLtpQuotes(allKeysToPoll, true);
            }
        };

        // Poll immediately when keys/tab change
        pollLtpBatch();

        // Refresh every 5 seconds while on "Place Order" tab with company selected
        const intervalId = setInterval(pollLtpBatch, 5000);
        return () => clearInterval(intervalId);
    }, [activeFeature, visibleStrikeContracts, selectedOptionContract, selectedUnderlyingKeys, selectedAccount, selectedCompanies]);

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

    // Fetch order book when Order Book tab is activated
    useEffect(() => {
        if (activeFeature === 'Order Book' && isUserLoggedIn()) {
            fetchOrderBook(selectedAccount);
        }
    }, [activeFeature, selectedAccount]);

    // Fetch open positions when Open Positions tab is activated
    useEffect(() => {
        if (activeFeature === 'Open Positions' && isUserLoggedIn()) {
            fetchOpenPositions(selectedAccount);
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

    // Load option contracts for the chosen underlying instrument key
    const loadOptionContracts = async (instrumentKey: string) => {
        if (!instrumentKey) {
            setOptionContracts([]);
            setSelectedOptionContract(null);
            setSelectedExpiry('');
            setStrikeOffset(0);
            return;
        }

        setIsLoadingContracts(true);
        setContractsError(null);
        setSelectedOptionContract(null);

        try {
            const contracts = await fetchOptionContracts(instrumentKey);
            const validContracts = Array.isArray(contracts) ? contracts : [];
            setOptionContracts(validContracts);

            if (validContracts.length === 0) {
                setContractsError('No options are available for this company.');
                setSelectedExpiry('');
            } else {
                // Auto-pick the nearest upcoming expiry
                const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
                const expiries = [...new Set(validContracts.map(c => c.expiry).filter((exp): exp is string => Boolean(exp)))].sort();
                const upcoming = expiries.find(e => e >= today) || expiries[0] || '';
                setSelectedExpiry(upcoming);
                setStrikeOffset(0);

                // Auto-select first contract for this expiry
                const firstForExpiry = validContracts.find(c => c.expiry === upcoming) || validContracts[0];
                if (firstForExpiry) {
                    handleSelectContract(firstForExpiry, selectedLots);
                }
            }
        } catch (err) {
            console.error('Failed to fetch option contracts:', err);
            setOptionContracts([]);
            setSelectedOptionContract(null);
            setSelectedExpiry('');
            setContractsError(err instanceof Error ? err.message : 'No options are available for this company.');
        } finally {
            setIsLoadingContracts(false);
        }
    };

    // Fetch Last Traded Price (LTP) quotes from Upstox market-quote/ltp API
    const fetchLtpQuotes = async (instrumentKeys: string[], isPolling = false) => {
        const cleanKeys = Array.from(new Set(instrumentKeys.map(k => k?.trim()).filter(Boolean)));
        if (cleanKeys.length === 0) return {};

        if (!isPolling) {
            setIsLoadingOptionLtp(true);
        }
        try {
            // Upstox LTP endpoint accepts up to 500 keys per call, but chunking in batches of 20 ensures reliability
            const chunkSize = 20;
            const newLtpMap: Record<string, number> = {};

            for (let i = 0; i < cleanKeys.length; i += chunkSize) {
                const chunk = cleanKeys.slice(i, i + chunkSize);
                const encodedKeys = encodeURIComponent(chunk.join(','));
                const res = await fetch(`/api/upstox/ltp?instrument_key=${encodedKeys}`);
                if (!res.ok) {
                    console.warn('Failed to fetch LTP quotes chunk:', res.statusText);
                    continue;
                }
                const json = await res.json();
                const data = json?.data || {};

                Object.entries(data).forEach(([key, val]: [string, any]) => {
                    const price = typeof val?.last_price === 'number' ? val.last_price : null;
                    if (price !== null) {
                        // Match key as returned by API
                        newLtpMap[key] = price;
                        // Match by instrument_token
                        if (val?.instrument_token) {
                            newLtpMap[val.instrument_token] = price;
                        }
                        // Match with pipe or colon variance (e.g. NSE_FO:123 vs NSE_FO|123)
                        const pipeKey = key.replace(':', '|');
                        const colonKey = key.replace('|', ':');
                        newLtpMap[pipeKey] = price;
                        newLtpMap[colonKey] = price;
                    }
                });
            }

            setContractLtpMap(prev => ({ ...prev, ...newLtpMap }));

            // Also update underlying recorded price if the underlying key is in the batch response
            const currentUnderlyingKey = selectedUnderlyingKeys[selectedAccount] || selectedUnderlyingKeys["All accounts"];
            if (currentUnderlyingKey && newLtpMap[currentUnderlyingKey] !== undefined) {
                const uPrice = newLtpMap[currentUnderlyingKey];
                setUnderlyingRecordedPrice(uPrice);
                setLastClosingPrices(prev => ({ ...prev, [selectedAccount]: uPrice }));
            }

            return newLtpMap;
        } catch (err) {
            console.error('Error fetching LTP quotes:', err);
            return {};
        } finally {
            if (!isPolling) {
                setIsLoadingOptionLtp(false);
            }
        }
    };

    // When an option contract is picked, update instrumentKey and quantity based on lot size
    const handleSelectContract = (contract: OptionContract, lots: number = selectedLots) => {
        setSelectedOptionContract(contract);
        const lotSize = contract.lot_size || contract.minimum_lot || 1;
        const totalQty = String(lots * lotSize);

        // Update the contract instrument key and calculated quantity in order forms
        if (selectedAccount === 'All accounts') {
            setSelectedInstrumentKeys(prev => {
                const next = { ...prev };
                accounts.slice(1).forEach(acc => { next[acc] = contract.instrument_key; });
                return next;
            });
            setOrderForms(prev => {
                const updatedForms = { ...prev };
                accounts.slice(1).forEach(account => {
                    const existing = updatedForms[account] || {
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
                    updatedForms[account] = {
                        ...existing,
                        instrumentKey: contract.instrument_key,
                        quantity: totalQty,
                    };
                });
                return updatedForms;
            });
        } else {
            setSelectedInstrumentKeys(prev => ({ ...prev, [selectedAccount]: contract.instrument_key }));
            setOrderForms(prev => ({
                ...prev,
                [selectedAccount]: {
                    ...orderForm,
                    instrumentKey: contract.instrument_key,
                    quantity: totalQty,
                }
            }));
        }

        // Fetch LTP specifically using Upstox /market-quote/ltp if not already cached
        if (contractLtpMap[contract.instrument_key] === undefined) {
            fetchLtpQuotes([contract.instrument_key]);
        }
    };

    // When lot count changes (1 to 10), update quantity across the accounts
    const handleLotChange = (lots: number) => {
        setSelectedLots(lots);
        const lotSize = selectedOptionContract?.lot_size || selectedOptionContract?.minimum_lot || 1;
        const totalQty = String(lots * lotSize);

        if (selectedAccount === 'All accounts') {
            setOrderForms(prev => {
                const updatedForms = { ...prev };
                accounts.slice(1).forEach(account => {
                    const existing = updatedForms[account] || {
                        instrumentKey: selectedOptionContract?.instrument_key || '',
                        quantity: '',
                        disclosedQuantity: '',
                        transactionType: 'Buy',
                        orderType: 'Market',
                        product: 'Delivery',
                        price: '',
                        triggerPrice: '',
                        validity: 'Day'
                    };
                    updatedForms[account] = {
                        ...existing,
                        quantity: totalQty,
                        ...(selectedOptionContract && { instrumentKey: selectedOptionContract.instrument_key })
                    };
                });
                return updatedForms;
            });
        } else {
            setOrderForms(prev => ({
                ...prev,
                [selectedAccount]: {
                    ...orderForm,
                    quantity: totalQty,
                    ...(selectedOptionContract && { instrumentKey: selectedOptionContract.instrument_key })
                }
            }));
        }
    };

    // Handle selection from suggestions
    const handleSelectCompany = (companyName: string) => {
        const instrumentKey = keyMapping[companyName];
        if (selectedAccount === 'All accounts') {
            setSelectedCompanies(prev => {
                const next: Record<string, string> = { ...prev, "All accounts": companyName };
                accounts.slice(1).forEach(acc => { next[acc] = companyName; });
                return next;
            });
            setSelectedInstrumentKeys(prev => {
                const next: Record<string, string> = { ...prev, "All accounts": instrumentKey };
                accounts.slice(1).forEach(acc => { next[acc] = instrumentKey; });
                return next;
            });
            setSelectedUnderlyingKeys(prev => {
                const next: Record<string, string> = { ...prev, "All accounts": instrumentKey };
                accounts.slice(1).forEach(acc => { next[acc] = instrumentKey; });
                return next;
            });
            setSearchTerms(prev => {
                const next: Record<string, string> = { ...prev, "All accounts": companyName };
                accounts.slice(1).forEach(acc => { next[acc] = companyName; });
                return next;
            });
        } else {
            setSelectedCompanies(prev => ({ ...prev, [selectedAccount]: companyName }));
            setSelectedInstrumentKeys(prev => ({ ...prev, [selectedAccount]: instrumentKey }));
            setSelectedUnderlyingKeys(prev => ({ ...prev, [selectedAccount]: instrumentKey }));
            setSearchTerms(prev => ({ ...prev, [selectedAccount]: companyName }));
        }

        setSuggestions(prev => ({ ...prev, [selectedAccount]: [] })); // Clear suggestions immediately
        setUnderlyingRecordedPrice(null);
        setOrderForms(prev => ({
            ...prev,
            [selectedAccount]: {
                ...orderForm,
                instrumentKey: instrumentKey
            }
        }));
        // Fetch underlying price
        fetchLastClosingPrice(instrumentKey);
        // Automatically fetch option contracts for this underlying
        loadOptionContracts(instrumentKey);
    };

    // Clear selected company to allow selecting a new one
    const handleClearSelectedCompany = () => {
        setSelectedCompanies(prev => ({ ...prev, [selectedAccount]: '' }));
        setSelectedInstrumentKeys(prev => ({ ...prev, [selectedAccount]: '' }));
        setSelectedUnderlyingKeys(prev => ({ ...prev, [selectedAccount]: '' }));
        setSearchTerms(prev => ({ ...prev, [selectedAccount]: '' }));
        setSuggestions(prev => ({ ...prev, [selectedAccount]: [] }));
        setUnderlyingRecordedPrice(null);
        setOptionContracts([]);
        setSelectedOptionContract(null);
        setSelectedExpiry('');
        setStrikeOffset(0);
        setContractsError(null);
        setContractLtpMap({});
        setLastClosingPrices(prev => ({ ...prev, [selectedAccount]: null }));
        setOrderForms(prev => ({
            ...prev,
            [selectedAccount]: {
                ...orderForm,
                instrumentKey: '',
                quantity: '',
            }
        }));
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
                const isOptionKey = instrumentKey.includes('_FO|') || instrumentKey.includes('FO|');

                // In options page, only update the account's displayed stock price if it's the underlying
                if (!isOptionKey) {
                    setLastClosingPrices(prev => ({ ...prev, [selectedAccount]: currentPrice }));
                    setUnderlyingRecordedPrice(currentPrice);
                } else {
                    // Cache the option's price in the LTP map so it doesn't touch the underlying price
                    setContractLtpMap(prev => ({ ...prev, [instrumentKey]: currentPrice }));
                }

                setCompanyPrices(prev => ({ ...prev, [instrumentKey]: currentPrice }));
                // Inform user that price was fetched (success)
                toast.success(`Price fetched for ${instrumentKey}`);
            }
        } catch (error) {
            console.error('Failed to fetch last closing price:', error);
            const isOptionKey = instrumentKey.includes('_FO|') || instrumentKey.includes('FO|');
            if (!isOptionKey) {
                setLastClosingPrices(prev => ({ ...prev, [selectedAccount]: null }));
            }
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

    // Place Order confirmation modal state
    const [isConfirmOrderModalOpen, setIsConfirmOrderModalOpen] = useState(false);


    // Fetch price when sell modal opens
    useEffect(() => {
        if (sellModalOpen && selectedOrderToSell?.instrumentKey) {
            const key = selectedOrderToSell.instrumentKey;
            fetchLtpQuotes([key]);
            fetchLastClosingPrice(key);
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
        const selectedContractKey = selectedOptionContract?.instrument_key || '';
        const price = (selectedContractKey && contractLtpMap[selectedContractKey] !== undefined)
            ? contractLtpMap[selectedContractKey]
            : (lastClosingPrice || 0);
        const totalCost = qty * price;
        const capitalRemaining = funds - totalCost;
        
        // Calculate maximum lots purchasable based on option contract price & lot size
        const lotSize = selectedOptionContract?.lot_size || selectedOptionContract?.minimum_lot || 1;
        const costPerLot = lotSize * price;
        const purchasableLots = costPerLot > 0 ? Math.floor(funds / costPerLot) : 0;
        const purchasableStocks = price > 0 ? Math.floor(funds / price) : 0;

        return {
            capitalRemaining,
            totalCost,
            purchasableStocks,
            purchasableLots,
            costPerLot,
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

    // Helper to calculate total charges (brokerage + STT + taxes) for a P&L trade using Upstox charges API
    const fetchTradeBrokerageCharges = useCallback(async (record: TradeWiseProfitAndLossData, account: string, recordIndex: number) => {
        const key = `${account}-${record.isin || record.scripName || recordIndex}-${recordIndex}`;
        const qty = record.quantity || 1;
        const buyAvg = typeof record.buyAverage === 'number' ? record.buyAverage : (typeof record.buy_average === 'number' ? record.buy_average : (Number(record.buyAverage || record.buy_average) || 0));
        const sellAvg = typeof record.sellAverage === 'number' ? record.sellAverage : (typeof record.sell_average === 'number' ? record.sell_average : (Number(record.sellAverage || record.sell_average) || 0));
        const instrumentToken = record.isin ? `NSE_FO|${record.isin}` : 'NSE_FO|35271';

        try {
            const url = new URL('/api/upstox/brokerage', window.location.origin);
            url.searchParams.set('instrument_token', instrumentToken);
            url.searchParams.set('quantity', String(qty));
            url.searchParams.set('product', 'D');
            url.searchParams.set('transaction_type', 'BUY');
            url.searchParams.set('price', String(buyAvg > 0 ? buyAvg : 1));
            if (sellAvg > 0) {
                url.searchParams.set('sell_price', String(sellAvg));
            }

            const res = await fetch(url.toString());
            if (res.ok) {
                const json = await res.json();
                const totalCharge = json?.data?.charges?.total;
                if (typeof totalCharge === 'number') {
                    setPnlChargesMap(prev => ({ ...prev, [key]: totalCharge }));
                    return totalCharge;
                }
            }
        } catch (err) {
            console.warn('Failed to fetch charges for record:', err);
        }

        // Fallback calculation: Option flat ₹20 buy + ₹20 sell = ₹40 + 0.1% STT on sell + GST
        const buyAmt = qty * buyAvg;
        const sellAmt = qty * sellAvg;
        const brokerage = 40;
        const stt = Math.round(sellAmt * 0.001);
        const txnCharges = Number(((buyAmt + sellAmt) * 0.0005).toFixed(2));
        const gst = Number(((brokerage + txnCharges) * 0.18).toFixed(2));
        const stamp = Math.round(buyAmt * 0.00003);
        const fallbackCharge = Number((brokerage + stt + txnCharges + gst + stamp).toFixed(2));

        setPnlChargesMap(prev => ({ ...prev, [key]: fallbackCharge }));
        return fallbackCharge;
    }, []);

    // Batch fetch charges for all records in an account
    const fetchChargesForRecords = useCallback(async (records: TradeWiseProfitAndLossData[], account: string) => {
        if (!records || records.length === 0) return;
        setIsLoadingCharges(true);
        try {
            await Promise.all(
                records.map((r, idx) => fetchTradeBrokerageCharges(r, account, idx))
            );
        } finally {
            setIsLoadingCharges(false);
        }
    }, [fetchTradeBrokerageCharges]);

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
                const recs = data.data || [];
                toast.success(`P&L report loaded for ${account}: ${recs.length} records`);
                setPnlData(prev => ({
                    ...prev,
                    [account]: recs
                }));
                // Automatically fetch brokerage and charges for all returned P&L records
                fetchChargesForRecords(recs, account);
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
    }, [accounts, accountPhoneMapping, pnlStartDate, pnlEndDate, pnlFinancialYear, pnlPageNumber, pnlPageSize, tradeSegment, fetchChargesForRecords]);

    // Fetch daily order book report for an account
    const fetchOrderBook = useCallback(async (account: string) => {
        if (account === 'All accounts') {
            const accountsToProcess = accounts.slice(1);
            for (const acc of accountsToProcess) {
                // eslint-disable-next-line no-await-in-loop
                await fetchOrderBook(acc);
            }
            return;
        }

        const phoneNumber = (accountPhoneMapping as Record<string, string>)[account];
        if (!phoneNumber) {
            console.error(`No phone number found for account: ${account}`);
            return;
        }

        setIsLoadingOrderBook(prev => ({ ...prev, [account]: true }));

        try {
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';
            const context = '/api/upstox/';

            const response = await fetch(
                `${backendUrl}${context}orders/get-order-book-for-day?phoneNumber=${phoneNumber}`,
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            );

            const jsonResponse = await response.json();
            // Handle if data is directly an array or inside GetOrderBookResponse.data
            let orders: DailyOrderRecord[] = [];
            if (Array.isArray(jsonResponse)) {
                orders = jsonResponse;
            } else if (Array.isArray(jsonResponse?.data)) {
                orders = jsonResponse.data;
            } else if (Array.isArray(jsonResponse?.orderBook)) {
                orders = jsonResponse.orderBook;
            }

            if (response.ok) {
                toast.success(`Order book loaded for ${account}: ${orders.length} orders found`);
                setOrderBookData(prev => ({
                    ...prev,
                    [account]: orders
                }));
            } else {
                console.error('Failed to fetch order book:', jsonResponse);
                toast.error(`Failed to fetch order book for ${account}: ${jsonResponse.message || 'Unknown error'}`);
                setOrderBookData(prev => ({
                    ...prev,
                    [account]: []
                }));
            }
        } catch (error) {
            console.error('Order book fetch error:', error);
            toast.error(`Failed to fetch order book for ${account}`);
            setOrderBookData(prev => ({
                ...prev,
                [account]: []
            }));
        } finally {
            setIsLoadingOrderBook(prev => ({ ...prev, [account]: false }));
        }
    }, [accounts, accountPhoneMapping]);

    // Fetch open positions report for an account
    const fetchOpenPositions = useCallback(async (account: string) => {
        if (account === 'All accounts') {
            const accountsToProcess = accounts.slice(1);
            for (const acc of accountsToProcess) {
                // eslint-disable-next-line no-await-in-loop
                await fetchOpenPositions(acc);
            }
            return;
        }

        const phoneNumber = (accountPhoneMapping as Record<string, string>)[account];
        if (!phoneNumber) {
            console.error(`No phone number found for account: ${account}`);
            return;
        }

        setIsLoadingPositions(prev => ({ ...prev, [account]: true }));

        try {
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';
            const context = '/api/upstox/';

            const response = await fetch(
                `${backendUrl}${context}get-open-positions?phoneNumber=${phoneNumber}`,
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            );

            const jsonResponse = await response.json();
            let positions: PositionRecord[] = [];
            if (Array.isArray(jsonResponse)) {
                positions = jsonResponse;
            } else if (Array.isArray(jsonResponse?.data)) {
                positions = jsonResponse.data;
            } else if (Array.isArray(jsonResponse?.positions)) {
                positions = jsonResponse.positions;
            }

            if (response.ok) {
                toast.success(`Open positions loaded for ${account}: ${positions.length} positions found`);
                setPositionsData(prev => ({
                    ...prev,
                    [account]: positions
                }));
            } else {
                console.error('Failed to fetch open positions:', jsonResponse);
                toast.error(`Failed to fetch open positions for ${account}: ${jsonResponse.message || 'Unknown error'}`);
                setPositionsData(prev => ({
                    ...prev,
                    [account]: []
                }));
            }
        } catch (error) {
            console.error('Open positions fetch error:', error);
            toast.error(`Failed to fetch open positions for ${account}`);
            setPositionsData(prev => ({
                ...prev,
                [account]: []
            }));
        } finally {
            setIsLoadingPositions(prev => ({ ...prev, [account]: false }));
        }
    }, [accounts, accountPhoneMapping]);

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
                            setSelectedUnderlyingKeys(prev => ({ ...prev, [account]: '' }));
                            setLastClosingPrices(prev => ({ ...prev, [account]: null }));
                        }
                        setOptionContracts([]);
                        setSelectedOptionContract(null);
                        setSelectedExpiry('');
                        setContractLtpMap({});
                        setUnderlyingRecordedPrice(null);
                        setStrikeOffset(0);
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
                        // Clear selected company & contracts state
                        setSelectedCompanies(prev => ({ ...prev, [selectedAccount]: '' }));
                        setSelectedInstrumentKeys(prev => ({ ...prev, [selectedAccount]: '' }));
                        setSelectedUnderlyingKeys(prev => ({ ...prev, [selectedAccount]: '' }));
                        setLastClosingPrices(prev => ({ ...prev, [selectedAccount]: null }));
                        setSearchTerms(prev => ({ ...prev, [selectedAccount]: '' }));
                        setOptionContracts([]);
                        setSelectedOptionContract(null);
                        setSelectedExpiry('');
                        setContractLtpMap({});
                        setUnderlyingRecordedPrice(null);
                        setStrikeOffset(0);
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
        setSelectedOrderToSell({
            ...orderRecord,
            avgPrice: orderRecord.avgPrice
        });
        setSellQuantity(orderRecord.holdingQty.toString());
        setSellModalOpen(true);
    };

    const handleSellAll = (companyName: string, account: string) => {
        const accountOrders = openOrders[account] || [];
        const companyOrders = accountOrders.find(order => order.companyName === companyName);
        if (companyOrders) {
            const totalHoldingQty = companyOrders.buyingOrders.reduce((sum, order) => sum + order.holdingQty, 0);
            const totalInvestment = companyOrders.buyingOrders.reduce((sum, order) => sum + (order.avgPrice * order.holdingQty), 0);
            const calculatedAvgPrice = totalHoldingQty > 0 ? (totalInvestment / totalHoldingQty) : undefined;
            setSelectedOrderToSell({
                companyName,
                instrumentKey: companyOrders.instrumentKey,
                holdingQty: totalHoldingQty,
                avgPrice: calculatedAvgPrice,
                isSellAll: true
            });
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
    const renderProfitAndLossTable = (records: TradeWiseProfitAndLossData[], account: string) => {
        const getBuyAmount = (r: TradeWiseProfitAndLossData) =>
            typeof r.buyAmount === 'number' ? r.buyAmount : (typeof r.buy_amount === 'number' ? r.buy_amount : (Number(r.buyAmount || r.buy_amount) || 0));
        const getSellAmount = (r: TradeWiseProfitAndLossData) =>
            typeof r.sellAmount === 'number' ? r.sellAmount : (typeof r.sell_amount === 'number' ? r.sell_amount : (Number(r.sellAmount || r.sell_amount) || 0));

        const getChargeForRecord = (r: TradeWiseProfitAndLossData, idx: number) => {
            const key = `${account}-${r.isin || r.scripName || idx}-${idx}`;
            if (pnlChargesMap[key] !== undefined) {
                return pnlChargesMap[key];
            }
            // Standard fallback estimate if still loading
            const qty = r.quantity || 1;
            const buyAvg = typeof r.buyAverage === 'number' ? r.buyAverage : (typeof r.buy_average === 'number' ? r.buy_average : (Number(r.buyAverage || r.buy_average) || 0));
            const sellAvg = typeof r.sellAverage === 'number' ? r.sellAverage : (typeof r.sell_average === 'number' ? r.sell_average : (Number(r.sellAverage || r.sell_average) || 0));
            const buyAmt = qty * buyAvg;
            const sellAmt = qty * sellAvg;
            const brokerage = 40;
            const stt = Math.round(sellAmt * 0.001);
            const txnCharges = Number(((buyAmt + sellAmt) * 0.0005).toFixed(2));
            const gst = Number(((brokerage + txnCharges) * 0.18).toFixed(2));
            const stamp = Math.round(buyAmt * 0.00003);
            return Number((brokerage + stt + txnCharges + gst + stamp).toFixed(2));
        };

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
        const grossRealizedPnl = totalSellAmt - totalBuyAmt;
        const totalCharges = filteredRecords.reduce((sum, r, idx) => sum + getChargeForRecord(r, idx), 0);
        const netProfit = grossRealizedPnl - totalCharges;
        const avgInvestment = count > 0 ? totalBuyAmt / count : 0;
        const avgNetPnl = count > 0 ? netProfit / count : 0;
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
                        <span className="text-amber-700 dark:text-amber-400 font-semibold">
                            Charges: ₹{totalCharges.toFixed(2)}
                        </span>
                        <span className={`font-semibold ${avgNetPnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            Avg Net: {avgNetPnl >= 0 ? '+' : ''}₹{avgNetPnl.toFixed(2)}
                        </span>
                        <span className={`px-2.5 py-1 rounded font-bold text-sm ${
                            netProfit >= 0 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        }`}>
                            Net Profit: {netProfit >= 0 ? '+' : ''}₹{netProfit.toFixed(2)}
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
                                <th className="px-3 py-2.5 text-right font-bold text-slate-700 dark:text-slate-300">Gross P&L</th>
                                <th className="px-3 py-2.5 text-right font-bold text-amber-700 dark:text-amber-400">Brokerage & Charges</th>
                                <th className="px-3 py-2.5 text-right font-bold text-emerald-700 dark:text-emerald-400">Net Profit</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-black/5 dark:divide-white/5">
                            {filteredRecords.map((r, idx) => {
                                const buyAmt = getBuyAmount(r);
                                const sellAmt = getSellAmount(r);
                                const grossPnl = sellAmt - buyAmt;
                                const isGrossProfit = grossPnl >= 0;
                                const charges = getChargeForRecord(r, idx);
                                const finalNetProfit = grossPnl - charges;
                                const isNetProfit = finalNetProfit >= 0;
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
                                        <td className={`px-3 py-2.5 whitespace-nowrap text-right font-mono font-semibold ${
                                            isGrossProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                                        }`}>
                                            {isGrossProfit ? '+' : ''}₹{grossPnl.toFixed(2)}
                                        </td>
                                        <td className="px-3 py-2.5 whitespace-nowrap text-right font-mono text-amber-700 dark:text-amber-400 font-medium">
                                            ₹{charges.toFixed(2)}
                                        </td>
                                        <td className={`px-3 py-2.5 whitespace-nowrap text-right font-mono font-bold ${
                                            isNetProfit ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'
                                        }`}>
                                            {isNetProfit ? '+' : ''}₹{finalNetProfit.toFixed(2)}
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

    const renderOrderBookTable = (orders: DailyOrderRecord[], account: string) => {
        const filtered = orders.filter(o => {
            const st = (o.status || '').toUpperCase();
            if (orderBookStatusFilter === 'COMPLETE') return st === 'COMPLETE';
            if (orderBookStatusFilter === 'OPEN') return st === 'OPEN' || st === 'TRIGGER PENDING';
            if (orderBookStatusFilter === 'CANCELLED') return st === 'CANCELLED';
            if (orderBookStatusFilter === 'REJECTED') return st === 'REJECTED';
            return true;
        });

        const totalOrders = orders.length;
        const completeOrders = orders.filter(o => (o.status || '').toUpperCase() === 'COMPLETE').length;
        const openOrdersCount = orders.filter(o => ['OPEN', 'TRIGGER PENDING'].includes((o.status || '').toUpperCase())).length;
        const rejectedOrders = orders.filter(o => (o.status || '').toUpperCase() === 'REJECTED').length;
        const cancelledOrders = orders.filter(o => (o.status || '').toUpperCase() === 'CANCELLED').length;

        if (!orders || orders.length === 0) {
            return (
                <div className="p-8 text-center text-sm text-muted-foreground">
                    No orders placed today for {account}.
                </div>
            );
        }

        return (
            <div className="space-y-4 p-3">
                {/* Summary bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs">
                    <div className="flex flex-wrap items-center gap-4">
                        <span className="font-semibold text-slate-800 dark:text-slate-100">
                            Total: <strong className="font-mono text-sm">{totalOrders}</strong>
                        </span>
                        <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                            Complete: <strong className="font-mono">{completeOrders}</strong>
                        </span>
                        <span className="text-blue-700 dark:text-blue-400 font-medium">
                            Open: <strong className="font-mono">{openOrdersCount}</strong>
                        </span>
                        <span className="text-rose-700 dark:text-rose-400 font-medium">
                            Rejected: <strong className="font-mono">{rejectedOrders}</strong>
                        </span>
                        <span className="text-gray-500 font-medium">
                            Cancelled: <strong className="font-mono">{cancelledOrders}</strong>
                        </span>
                    </div>

                    {/* Status filters */}
                    <div className="flex items-center gap-1.5">
                        {(['ALL', 'COMPLETE', 'OPEN', 'REJECTED', 'CANCELLED'] as const).map(st => (
                            <button
                                key={st}
                                onClick={() => setOrderBookStatusFilter(st)}
                                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                                    orderBookStatusFilter === st
                                        ? 'bg-[var(--upx-primary)] text-white shadow-xs'
                                        : 'bg-white dark:bg-slate-900 border text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                {st}
                            </button>
                        ))}
                    </div>
                </div>

                {filtered.length === 0 ? (
                    <div className="p-8 text-center text-sm text-muted-foreground">
                        No orders matching status filter &quot;{orderBookStatusFilter}&quot;.
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-lg border">
                        <table className="w-full text-xs text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-100/70 dark:bg-slate-800/70 border-b text-slate-700 dark:text-slate-200 font-semibold">
                                    <th className="px-3 py-2.5">Time</th>
                                    <th className="px-3 py-2.5">Symbol / Scrip</th>
                                    <th className="px-3 py-2.5">Type</th>
                                    <th className="px-3 py-2.5">Order</th>
                                    <th className="px-3 py-2.5 text-right">Qty</th>
                                    <th className="px-3 py-2.5 text-right">Price</th>
                                    <th className="px-3 py-2.5 text-right">Avg Price</th>
                                    <th className="px-3 py-2.5 text-center">Status</th>
                                    <th className="px-3 py-2.5">Exchange / Order ID</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                                {filtered.map((order, idx) => {
                                    const txType = (order.transactionType || order.transaction_type || '').toUpperCase();
                                    const isBuy = txType === 'BUY';
                                    const statusUpper = (order.status || '').toUpperCase();
                                    const statusBadge =
                                        statusUpper === 'COMPLETE'
                                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300'
                                            : statusUpper === 'REJECTED'
                                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300'
                                            : statusUpper === 'CANCELLED'
                                            ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-300'
                                            : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300';

                                    const rawTimestamp = order.orderTimestamp || order.order_timestamp || '';
                                    const timeStr = rawTimestamp
                                        ? (rawTimestamp.includes(' ') ? rawTimestamp.split(' ')[1] : rawTimestamp)
                                        : (order.exchangeTimestamp || order.exchange_timestamp || '-');

                                    const symbolStr = order.tradingSymbol || order.trading_symbol || order.tradingsymbol || 'Unknown';
                                    const tokenStr = order.instrumentToken || order.instrument_token || '';
                                    const orderTypeStr = order.orderType || order.order_type || 'MARKET';
                                    const productStr = order.product || 'D';

                                    const filledQty = order.filledQuantity ?? order.filled_quantity ?? 0;
                                    const totalQty = order.quantity ?? 0;
                                    const orderPrice = order.price ?? 0;
                                    const avgPrice = order.averagePrice ?? order.average_price ?? 0;
                                    const orderIdStr = order.orderId || order.order_id || order.exchangeOrderId || order.exchange_order_id || '-';
                                    const statusMsg = order.statusMessage || order.status_message || order.statusMessageRaw || order.status_message_raw || '';

                                    return (
                                        <tr key={orderIdStr !== '-' ? orderIdStr : idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                                            <td className="px-3 py-2.5 whitespace-nowrap font-mono text-gray-500 text-[11px]" title={rawTimestamp}>
                                                {timeStr}
                                            </td>
                                            <td className="px-3 py-2.5 whitespace-nowrap">
                                                <div className="font-semibold text-slate-800 dark:text-slate-100">
                                                    {symbolStr}
                                                </div>
                                                {tokenStr && (
                                                    <div className="text-[10px] text-gray-400 font-mono">
                                                        {tokenStr}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-3 py-2.5 whitespace-nowrap">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                    isBuy
                                                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300'
                                                        : 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300'
                                                }`}>
                                                    {txType || 'BUY'}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground text-[11px]">
                                                <span className="font-mono">{orderTypeStr}</span>
                                                <span className="ml-1 text-[10px] text-gray-400">({productStr})</span>
                                            </td>
                                            <td className="px-3 py-2.5 whitespace-nowrap text-right font-mono">
                                                <span className="font-semibold text-slate-800 dark:text-slate-100">{filledQty}</span>
                                                <span className="text-gray-400">/{totalQty}</span>
                                            </td>
                                            <td className="px-3 py-2.5 whitespace-nowrap text-right font-mono">
                                                ₹{Number(orderPrice).toFixed(2)}
                                            </td>
                                            <td className="px-3 py-2.5 whitespace-nowrap text-right font-mono font-medium">
                                                ₹{Number(avgPrice > 0 ? avgPrice : (statusUpper === 'COMPLETE' && filledQty > 0 ? orderPrice : 0)).toFixed(2)}
                                            </td>
                                            <td className="px-3 py-2.5 whitespace-nowrap text-center">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusBadge}`} title={statusMsg}>
                                                    {statusUpper}
                                                </span>
                                                {statusMsg && statusUpper === 'REJECTED' && (
                                                    <div className="text-[10px] text-rose-600 dark:text-rose-400 max-w-xs truncate mx-auto mt-0.5" title={statusMsg}>
                                                        {statusMsg}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-3 py-2.5 whitespace-nowrap text-gray-400 font-mono text-[11px]">
                                                <div>{order.exchange || 'NFO'}</div>
                                                <div className="text-[10px] text-gray-500 truncate max-w-[120px]" title={orderIdStr}>
                                                    #{orderIdStr}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        );
    };

    const renderAllAccountsOrderBookView = () => (
        <div className="space-y-6 p-4">
            {accounts.slice(1).map(account => {
                const orders = orderBookData[account] || [];
                const loading = isLoadingOrderBook[account];
                return (
                    <div key={account} className="border rounded-xl p-4 bg-white/50 dark:bg-slate-900/40 space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b">
                            <h4 className="font-bold text-sm text-[var(--upx-primary)] flex items-center gap-2">
                                <span>{account}</span>
                                <span className="text-xs font-normal text-muted-foreground">({orders.length} orders today)</span>
                            </h4>
                            <button
                                onClick={() => fetchOrderBook(account)}
                                disabled={loading}
                                className="px-2.5 py-1 text-xs rounded bg-[var(--upx-primary)] text-white hover:bg-[var(--upx-primary)]/80 disabled:opacity-50"
                            >
                                {loading ? 'Loading...' : 'Refresh'}
                            </button>
                        </div>
                        {loading ? (
                            <div className="py-6 text-center text-xs text-muted-foreground">Loading order book for {account}...</div>
                        ) : (
                            renderOrderBookTable(orders, account)
                        )}
                    </div>
                );
            })}
        </div>
    );

    const renderIndividualAccountOrderBookView = () => {
        const orders = orderBookData[selectedAccount] || [];
        const loading = isLoadingOrderBook[selectedAccount];
        return (
            <div className="p-4">
                {loading ? (
                    <div className="py-8 text-center text-xs text-muted-foreground">Loading order book for {selectedAccount}...</div>
                ) : (
                    renderOrderBookTable(orders, selectedAccount)
                )}
            </div>
        );
    };

    const renderPositionsTable = (positions: PositionRecord[], account: string) => {
        const filtered = positions.filter(p => {
            const netPnl = p.pnl ?? p.unrealised ?? 0;
            if (positionsPnlFilter === 'PROFIT') return netPnl > 0;
            if (positionsPnlFilter === 'LOSS') return netPnl < 0;
            return true;
        });

        const totalPositions = positions.length;
        const totalPnl = positions.reduce((sum, p) => sum + (p.pnl ?? p.unrealised ?? 0), 0);
        const totalBuyValue = positions.reduce((sum, p) => {
            const bv = p.buyValue ?? p.buy_value ?? p.dayBuyValue ?? p.day_buy_value ?? 0;
            if (bv > 0) return sum + bv;
            const overnightBuy = p.overnightBuyAmount ?? p.overnight_buy_amount ?? 0;
            return sum + overnightBuy;
        }, 0);
        const totalSellValue = positions.reduce((sum, p) => {
            const sv = p.sellValue ?? p.sell_value ?? p.daySellValue ?? p.day_sell_value ?? 0;
            if (sv > 0) return sum + sv;
            const overnightSell = p.overnightSellAmount ?? p.overnight_sell_amount ?? 0;
            return sum + overnightSell;
        }, 0);
        const openQtyCount = positions.filter(p => (p.quantity ?? p.overnightQuantity ?? p.overnight_quantity ?? 0) !== 0).length;

        if (!positions || positions.length === 0) {
            return (
                <div className="p-8 text-center text-sm text-muted-foreground">
                    No open positions found for {account}.
                </div>
            );
        }

        return (
            <div className="space-y-4 p-3">
                {/* Summary bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs">
                    <div className="flex flex-wrap items-center gap-4">
                        <span className="font-semibold text-slate-800 dark:text-slate-100">
                            Positions: <strong className="font-mono text-sm">{totalPositions}</strong>
                        </span>
                        <span className="text-slate-600 dark:text-slate-300 font-medium">
                            Active Net Qty: <strong className="font-mono">{openQtyCount}</strong>
                        </span>
                        <span className="text-slate-600 dark:text-slate-300 font-medium">
                            Buy Value: <strong className="font-mono">₹{totalBuyValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                        </span>
                        <span className="text-slate-600 dark:text-slate-300 font-medium">
                            Sell Value: <strong className="font-mono">₹{totalSellValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                        </span>
                        <span className={`font-bold ${totalPnl >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
                            Net P&amp;L: <strong className="font-mono">{totalPnl >= 0 ? '+' : ''}₹{totalPnl.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                        </span>
                    </div>

                    {/* Filter chips */}
                    <div className="flex items-center gap-1.5">
                        {(['ALL', 'PROFIT', 'LOSS'] as const).map(filter => (
                            <button
                                key={filter}
                                onClick={() => setPositionsPnlFilter(filter)}
                                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                                    positionsPnlFilter === filter
                                        ? 'bg-[var(--upx-primary)] text-white shadow-xs'
                                        : 'bg-white dark:bg-slate-900 border text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                {filter}
                            </button>
                        ))}
                    </div>
                </div>

                {filtered.length === 0 ? (
                    <div className="p-8 text-center text-sm text-muted-foreground">
                        No positions matching filter &quot;{positionsPnlFilter}&quot;.
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-lg border">
                        <table className="w-full text-xs text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-100/70 dark:bg-slate-800/70 border-b text-slate-700 dark:text-slate-200 font-semibold">
                                    <th className="px-3 py-2.5">Symbol</th>
                                    <th className="px-3 py-2.5">Product</th>
                                    <th className="px-3 py-2.5 text-right">Net Qty</th>
                                    <th className="px-3 py-2.5 text-right">Avg Price</th>
                                    <th className="px-3 py-2.5 text-right">LTP</th>
                                    <th className="px-3 py-2.5 text-right">Buy / Sell Qty</th>
                                    <th className="px-3 py-2.5 text-right">Unrealised</th>
                                    <th className="px-3 py-2.5 text-right">Realised</th>
                                    <th className="px-3 py-2.5 text-right">Total P&amp;L</th>
                                    <th className="px-3 py-2.5 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                                {filtered.map((pos, idx) => {
                                    const symbolStr = pos.tradingSymbol || pos.trading_symbol || pos.tradingsymbol || 'Unknown';
                                    const netQty = (pos.quantity !== undefined && pos.quantity !== null && pos.quantity !== 0)
                                        ? pos.quantity
                                        : (pos.overnightQuantity ?? pos.overnight_quantity ?? 0);

                                    // Check day buy/sell price/value, fallback to overnightBuyAmount / overnightBuyQuantity
                                    const dayBuyPrice = pos.dayBuyPrice ?? pos.day_buy_price ?? 0;
                                    const overnightBuyQty = pos.overnightBuyQuantity ?? pos.overnight_buy_quantity ?? 0;
                                    const overnightBuyAmt = pos.overnightBuyAmount ?? pos.overnight_buy_amount ?? 0;
                                    const overnightPrice = overnightBuyQty > 0 ? (overnightBuyAmt / overnightBuyQty) : 0;

                                    let avgPrice = pos.averagePrice ?? pos.average_price ?? pos.buyPrice ?? pos.buy_price ?? 0;
                                    if (avgPrice === 0) {
                                        if (dayBuyPrice > 0) {
                                            avgPrice = dayBuyPrice;
                                        } else if (overnightPrice > 0) {
                                            avgPrice = overnightPrice;
                                        }
                                    }

                                    const ltp = pos.lastPrice ?? pos.last_price ?? pos.closePrice ?? pos.close_price ?? 0;
                                    const dayBuyQty = (pos.dayBuyQuantity ?? pos.day_buy_quantity ?? 0) > 0
                                        ? (pos.dayBuyQuantity ?? pos.day_buy_quantity ?? 0)
                                        : overnightBuyQty;

                                    const daySellQty = pos.daySellQuantity ?? pos.day_sell_quantity ?? pos.overnightSellQuantity ?? pos.overnight_sell_quantity ?? 0;
                                    const unrealised = pos.unrealised ?? 0;
                                    const realised = pos.realised ?? 0;
                                    const pnl = pos.pnl ?? (unrealised + realised);
                                    const isProfit = pnl >= 0;

                                    // If sell Qty is 0 and net quantity > 0, show Square off button
                                    const canSquareOff = daySellQty === 0 && netQty > 0;

                                    return (
                                        <tr key={pos.instrumentToken || pos.instrument_token || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                                            <td className="px-3 py-2.5 whitespace-nowrap">
                                                <div className="font-semibold text-slate-800 dark:text-slate-100">
                                                    {symbolStr}
                                                </div>
                                                <div className="text-[10px] text-gray-400 font-mono">
                                                    {pos.exchange || 'NFO'} • {pos.instrumentToken || pos.instrument_token || ''}
                                                </div>
                                            </td>
                                            <td className="px-3 py-2.5 whitespace-nowrap">
                                                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 dark:bg-slate-800 border text-slate-700 dark:text-slate-300">
                                                    {pos.product || 'D'}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2.5 whitespace-nowrap text-right font-mono font-bold">
                                                <span className={netQty > 0 ? 'text-blue-600 dark:text-blue-400' : netQty < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-gray-500'}>
                                                    {netQty}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2.5 whitespace-nowrap text-right font-mono">
                                                ₹{Number(avgPrice).toFixed(2)}
                                            </td>
                                            <td className="px-3 py-2.5 whitespace-nowrap text-right font-mono font-semibold">
                                                ₹{Number(ltp).toFixed(2)}
                                            </td>
                                            <td className="px-3 py-2.5 whitespace-nowrap text-right font-mono text-[11px] text-muted-foreground">
                                                <span className="text-emerald-700 dark:text-emerald-400">+{dayBuyQty}</span> / <span className="text-rose-700 dark:text-rose-400">-{daySellQty}</span>
                                            </td>
                                            <td className={`px-3 py-2.5 whitespace-nowrap text-right font-mono ${unrealised >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                                                {unrealised >= 0 ? '+' : ''}₹{unrealised.toFixed(2)}
                                            </td>
                                            <td className={`px-3 py-2.5 whitespace-nowrap text-right font-mono ${realised >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                                                {realised >= 0 ? '+' : ''}₹{realised.toFixed(2)}
                                            </td>
                                            <td className={`px-3 py-2.5 whitespace-nowrap text-right font-mono font-bold ${isProfit ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
                                                {isProfit ? '+' : ''}₹{pnl.toFixed(2)}
                                            </td>
                                            <td className="px-3 py-2.5 whitespace-nowrap text-center">
                                                {canSquareOff ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const instKey = pos.instrumentToken || pos.instrument_token || '';
                                                            setSelectedOrderToSell({
                                                                companyName: symbolStr,
                                                                instrumentKey: instKey,
                                                                holdingQty: netQty,
                                                                product: pos.product || 'D',
                                                                avgPrice: avgPrice > 0 ? avgPrice : undefined,
                                                                ltp: ltp > 0 ? ltp : undefined
                                                            });
                                                            setSellQuantity(netQty.toString());
                                                            if (ltp > 0) {
                                                                setLastClosingPrices(prev => ({ ...prev, [account]: ltp }));
                                                                setCompanyPrices(prev => ({ ...prev, [symbolStr]: ltp }));
                                                                if (instKey) {
                                                                    setContractLtpMap(prev => ({ ...prev, [instKey]: ltp }));
                                                                }
                                                            }
                                                            if (instKey) {
                                                                fetchLtpQuotes([instKey]);
                                                            }
                                                            setSellModalOpen(true);
                                                        }}
                                                        className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-colors"
                                                    >
                                                        Square off
                                                    </button>
                                                ) : (
                                                    <span className="text-[11px] text-gray-400 italic">
                                                        {netQty === 0 ? 'Closed' : '-'}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        );
    };

    const renderAllAccountsPositionsView = () => (
        <div className="space-y-6 p-4">
            {accounts.slice(1).map(account => {
                const positions = positionsData[account] || [];
                const loading = isLoadingPositions[account];
                return (
                    <div key={account} className="border rounded-xl p-4 bg-white/50 dark:bg-slate-900/40 space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b">
                            <h4 className="font-bold text-sm text-[var(--upx-primary)] flex items-center gap-2">
                                <span>{account}</span>
                                <span className="text-xs font-normal text-muted-foreground">({positions.length} positions)</span>
                            </h4>
                            <button
                                onClick={() => fetchOpenPositions(account)}
                                disabled={loading}
                                className="px-2.5 py-1 text-xs rounded bg-[var(--upx-primary)] text-white hover:bg-[var(--upx-primary)]/80 disabled:opacity-50"
                            >
                                {loading ? 'Loading...' : 'Refresh'}
                            </button>
                        </div>
                        {loading ? (
                            <div className="py-6 text-center text-xs text-muted-foreground">Loading positions for {account}...</div>
                        ) : (
                            renderPositionsTable(positions, account)
                        )}
                    </div>
                );
            })}
        </div>
    );

    const renderIndividualAccountPositionsView = () => {
        const positions = positionsData[selectedAccount] || [];
        const loading = isLoadingPositions[selectedAccount];
        return (
            <div className="p-4">
                {loading ? (
                    <div className="py-8 text-center text-xs text-muted-foreground">Loading positions for {selectedAccount}...</div>
                ) : (
                    renderPositionsTable(positions, selectedAccount)
                )}
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
                            renderProfitAndLossTable(records, account)
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
                    renderProfitAndLossTable(records, selectedAccount)
                )}
            </div>
        );
    };

    return (
        <SidebarInset className="flex min-h-screen flex-col overflow-y-auto py-6 px-4 bg-gradient-to-b from-violet-50/60 via-[var(--upx-primary-50)] to-slate-100 dark:from-[#0b0812] dark:via-[#0f0b1a] dark:to-black">


            <div className="max-w-8xl w-full mx-auto nexus-options-theme upstox-theme rounded-2xl bg-white/70 dark:bg-slate-900/40 ring-1 ring-black/10 dark:ring-white/10 shadow-sm backdrop-blur p-4 sm:p-6 relative">
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
                                    Nexus Options
                                </h1>
                                <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-[var(--upx-primary-50)] text-[var(--upx-primary)] border border-[var(--upx-border)]">
                                    Derivatives Terminal
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                High-Velocity Order Execution &amp; Multi-Account Hub
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

                                            {/* Live Price Display & Reset Button */}
                                            {selectedCompany && (
                                                <div className="flex-1 max-w-md p-2.5 bg-[var(--upx-primary-50)] border border-[var(--upx-border)] rounded-md mt-2 flex items-center justify-between gap-2">
                                                    <div className="text-sm">
                                                        <div className="text-[var(--upx-primary-700)]">
                                                            {isLoadingPrice && <span>Loading price...</span>}
                                                            {!isLoadingPrice && (underlyingRecordedPrice !== null || lastClosingPrice !== null) && (
                                                                <div className="flex items-center gap-2">
                                                                    <span>
                                                                        {isLivePrice ? 'Live Price:' : 'Last Recorded Price:'}
                                                                        <strong className="text-md text-[var(--upx-primary)] ml-1">
                                                                            ₹{(underlyingRecordedPrice ?? lastClosingPrice)?.toFixed(2)}
                                                                        </strong>
                                                                    </span>
                                                                    {isLivePrice && (
                                                                        <div className="flex items-center gap-1">
                                                                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                                                                            <span className="text-xs text-red-600 font-medium">LIVE</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                            {!isLoadingPrice && underlyingRecordedPrice === null && lastClosingPrice === null && (
                                                                <span className="text-red-600">Price not available</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {/* X Close button to clear selected company */}
                                                    <button
                                                        type="button"
                                                        onClick={handleClearSelectedCompany}
                                                        title="Remove company and reselect"
                                                        className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-muted-foreground hover:text-red-600 transition-colors"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {/* Option Contracts Picker Section */}
                                        {selectedCompany && (
                                            <div className="p-4 rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 shadow-sm space-y-3">
                                                <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="h-2 w-2 rounded-full bg-[var(--upx-primary)] animate-pulse" />
                                                        <h4 className="text-sm font-bold text-[var(--upx-primary)]">
                                                            Option Contracts for {selectedCompany}
                                                        </h4>
                                                    </div>
                                                    {isLoadingContracts && (
                                                        <span className="text-xs text-muted-foreground animate-pulse">
                                                            Fetching contracts from Upstox...
                                                        </span>
                                                    )}
                                                </div>

                                                {isLoadingContracts ? (
                                                    <div className="py-6 text-center text-xs text-muted-foreground">
                                                        Loading option chain & contracts for {selectedCompany}...
                                                    </div>
                                                ) : contractsError || optionContracts.length === 0 ? (
                                                    <div className="p-4 text-center rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs font-medium">
                                                        ⚠️ {contractsError || 'No options are available for this company.'}
                                                    </div>
                                                ) : (
                                                    <div className="space-y-3">
                                                        {/* Latest Expiry Display */}
                                                        {selectedExpiry && (
                                                            <div className="flex items-center gap-2 text-xs">
                                                                <span className="font-semibold text-muted-foreground">Expiry Date:</span>
                                                                <span className="px-2.5 py-1 rounded bg-[var(--upx-primary)] text-white text-xs font-bold shadow-sm">
                                                                    {selectedExpiry}
                                                                </span>
                                                            </div>
                                                        )}

                                                        {/* Split CE & PE Option Tables based on Last Recorded Underlying Price */}
                                                        {(() => {
                                                            const effectivePrice = underlyingRecordedPrice ?? lastClosingPrice ?? 0;
                                                            const { callContracts, putContracts, canMoveUp, canMoveDown, strikeOffset: currentOffset, visibleStrikes } = visibleStrikeContracts;
                                                            const minVisibleStrike = visibleStrikes.length > 0 ? visibleStrikes[0] : null;
                                                            const maxVisibleStrike = visibleStrikes.length > 0 ? visibleStrikes[visibleStrikes.length - 1] : null;

                                                            return (
                                                                <div className="space-y-2">
                                                                    <div className="text-[11px] font-mono text-muted-foreground flex flex-wrap items-center justify-between gap-2 px-1">
                                                                        <div className="flex items-center gap-2">
                                                                            {effectivePrice > 0 && (
                                                                                <span>
                                                                                    Underlying Price: <strong className="text-slate-700 dark:text-slate-200">₹{effectivePrice.toFixed(2)}</strong>
                                                                                </span>
                                                                            )}
                                                                            {minVisibleStrike !== null && maxVisibleStrike !== null && (
                                                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                                                                    Strikes: ₹{minVisibleStrike} – ₹{maxVisibleStrike}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        {currentOffset !== 0 && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setStrikeOffset(0)}
                                                                                className="inline-flex items-center gap-1 text-[10px] text-blue-600 hover:text-blue-700 dark:text-blue-400 font-semibold"
                                                                            >
                                                                                <RotateCcw className="h-3 w-3" />
                                                                                Reset to ATM
                                                                            </button>
                                                                        )}
                                                                    </div>

                                                                    {/* Navigation: Move Up (Higher Strikes) on Top */}
                                                                    <div className="flex items-center justify-between gap-2 px-1 py-1 bg-slate-100/70 dark:bg-slate-800/40 rounded-lg border border-slate-200/60 dark:border-slate-800">
                                                                        <span className="text-[10px] font-medium text-muted-foreground">
                                                                            Higher Strikes
                                                                        </span>
                                                                        <button
                                                                            type="button"
                                                                            disabled={!canMoveUp}
                                                                            onClick={() => setStrikeOffset(prev => prev + 3)}
                                                                            className="inline-flex items-center gap-1 px-3 py-1 rounded text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 shadow-xs disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                                                        >
                                                                            <ChevronUp className="h-3.5 w-3.5 text-blue-600" />
                                                                            <span>Move Up (+3 Strikes)</span>
                                                                        </button>
                                                                    </div>

                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                                        {/* Calls (CE) Column */}
                                                                        <div className="border rounded-xl p-2.5 bg-emerald-50/30 dark:bg-emerald-950/10 border-emerald-200/60 dark:border-emerald-900/40 space-y-2">
                                                                            <div className="flex items-center justify-between pb-1.5 border-b border-emerald-200/40 dark:border-emerald-900/30">
                                                                                <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-700 dark:text-emerald-400">
                                                                                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                                                                    <span>Call Options (CE)</span>
                                                                                </div>
                                                                                <span className="text-[10px] font-mono font-medium text-emerald-600 dark:text-emerald-400">
                                                                                    {callContracts.length} Strike{callContracts.length === 1 ? '' : 's'}
                                                                                </span>
                                                                            </div>

                                                                            <div className="space-y-1.5">
                                                                                {callContracts.length === 0 ? (
                                                                                    <div className="py-4 text-center text-xs text-muted-foreground">
                                                                                        No CE strikes available in this range.
                                                                                    </div>
                                                                                ) : (
                                                                                    callContracts.map(c => {
                                                                                        const isSelected = selectedOptionContract?.instrument_key === c.instrument_key;
                                                                                        const ltp = contractLtpMap[c.instrument_key];
                                                                                        return (
                                                                                            <button
                                                                                                key={c.instrument_key}
                                                                                                type="button"
                                                                                                onClick={() => handleSelectContract(c, selectedLots)}
                                                                                                className={`w-full p-2.5 rounded-lg border text-left transition-all ${
                                                                                                    isSelected
                                                                                                        ? 'border-emerald-600 bg-emerald-100 dark:bg-emerald-950/80 shadow-sm ring-2 ring-emerald-500'
                                                                                                        : 'border-emerald-200/70 dark:border-emerald-900/50 bg-white dark:bg-slate-900 hover:border-emerald-400'
                                                                                                }`}
                                                                                            >
                                                                                                <div className="flex items-center justify-between text-xs font-bold">
                                                                                                    <span className="text-emerald-800 dark:text-emerald-300 font-mono text-sm">₹{c.strike_price ?? '—'} CE</span>
                                                                                                    <div className="text-right flex items-center gap-2">
                                                                                                        {ltp !== undefined ? (
                                                                                                            <span className="text-xs font-mono font-extrabold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                                                                                                                LTP: ₹{ltp.toFixed(2)}
                                                                                                            </span>
                                                                                                        ) : isLoadingOptionLtp ? (
                                                                                                            <span className="text-[10px] font-mono text-muted-foreground animate-pulse">LTP: ...</span>
                                                                                                        ) : null}
                                                                                                        <span className="text-[11px] font-mono font-medium text-muted-foreground">
                                                                                                            Lot: {c.lot_size || c.minimum_lot || 1}
                                                                                                        </span>
                                                                                                    </div>
                                                                                                </div>
                                                                                                <div className="text-[11px] text-muted-foreground truncate mt-0.5" title={c.trading_symbol}>
                                                                                                    {c.trading_symbol}
                                                                                                </div>
                                                                                            </button>
                                                                                        );
                                                                                    })
                                                                                )}
                                                                            </div>
                                                                        </div>

                                                                        {/* Puts (PE) Column */}
                                                                        <div className="border rounded-xl p-2.5 bg-rose-50/30 dark:bg-rose-950/10 border-rose-200/60 dark:border-rose-900/40 space-y-2">
                                                                            <div className="flex items-center justify-between pb-1.5 border-b border-rose-200/40 dark:border-rose-900/30">
                                                                                <div className="flex items-center gap-1.5 font-bold text-xs text-rose-700 dark:text-rose-400">
                                                                                    <span className="h-2 w-2 rounded-full bg-rose-500" />
                                                                                    <span>Put Options (PE)</span>
                                                                                </div>
                                                                                <span className="text-[10px] font-mono font-medium text-rose-600 dark:text-rose-400">
                                                                                    {putContracts.length} Strike{putContracts.length === 1 ? '' : 's'}
                                                                                </span>
                                                                            </div>

                                                                            <div className="space-y-1.5">
                                                                                {putContracts.length === 0 ? (
                                                                                    <div className="py-4 text-center text-xs text-muted-foreground">
                                                                                        No PE strikes available in this range.
                                                                                    </div>
                                                                                ) : (
                                                                                    putContracts.map(c => {
                                                                                        const isSelected = selectedOptionContract?.instrument_key === c.instrument_key;
                                                                                        const ltp = contractLtpMap[c.instrument_key];
                                                                                        return (
                                                                                            <button
                                                                                                key={c.instrument_key}
                                                                                                type="button"
                                                                                                onClick={() => handleSelectContract(c, selectedLots)}
                                                                                                className={`w-full p-2.5 rounded-lg border text-left transition-all ${
                                                                                                    isSelected
                                                                                                        ? 'border-rose-600 bg-rose-100 dark:bg-rose-950/80 shadow-sm ring-2 ring-rose-500'
                                                                                                        : 'border-rose-200/70 dark:border-rose-900/50 bg-white dark:bg-slate-900 hover:border-rose-400'
                                                                                                }`}
                                                                                            >
                                                                                                <div className="flex items-center justify-between text-xs font-bold">
                                                                                                    <span className="text-rose-800 dark:text-rose-300 font-mono text-sm">₹{c.strike_price ?? '—'} PE</span>
                                                                                                    <div className="text-right flex items-center gap-2">
                                                                                                        {ltp !== undefined ? (
                                                                                                            <span className="text-xs font-mono font-extrabold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-1.5 py-0.5 rounded border border-rose-200 dark:border-rose-800">
                                                                                                                LTP: ₹{ltp.toFixed(2)}
                                                                                                            </span>
                                                                                                        ) : isLoadingOptionLtp ? (
                                                                                                            <span className="text-[10px] font-mono text-muted-foreground animate-pulse">LTP: ...</span>
                                                                                                        ) : null}
                                                                                                        <span className="text-[11px] font-mono font-medium text-muted-foreground">
                                                                                                            Lot: {c.lot_size || c.minimum_lot || 1}
                                                                                                        </span>
                                                                                                    </div>
                                                                                                </div>
                                                                                                <div className="text-[11px] text-muted-foreground truncate mt-0.5" title={c.trading_symbol}>
                                                                                                    {c.trading_symbol}
                                                                                                </div>
                                                                                            </button>
                                                                                        );
                                                                                    })
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    {/* Navigation: Move Down (Lower Strikes) on Bottom */}
                                                                    <div className="flex items-center justify-between gap-2 px-1 py-1 bg-slate-100/70 dark:bg-slate-800/40 rounded-lg border border-slate-200/60 dark:border-slate-800">
                                                                        <span className="text-[10px] font-medium text-muted-foreground">
                                                                            Lower Strikes
                                                                        </span>
                                                                        <button
                                                                            type="button"
                                                                            disabled={!canMoveDown}
                                                                            onClick={() => setStrikeOffset(prev => prev - 3)}
                                                                            className="inline-flex items-center gap-1 px-3 py-1 rounded text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 shadow-xs disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                                                        >
                                                                            <ChevronDown className="h-3.5 w-3.5 text-blue-600" />
                                                                            <span>Move Down (-3 Strikes)</span>
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })()}

                                                        {/* Selected Contract Info Banner with Live Traded Price & Capital Required */}
                                                        {selectedOptionContract && (() => {
                                                            const lotSize = selectedOptionContract.lot_size || selectedOptionContract.minimum_lot || 1;
                                                            const totalQty = selectedLots * lotSize;
                                                            const optionPrice = (contractLtpMap[selectedOptionContract.instrument_key] !== undefined)
                                                                ? contractLtpMap[selectedOptionContract.instrument_key]
                                                                : (lastClosingPrice !== null && lastClosingPrice > 0 ? lastClosingPrice : null);
                                                            const perAccountCapital = (optionPrice !== null && optionPrice > 0)
                                                                ? totalQty * optionPrice
                                                                : null;
                                                            return (
                                                                <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg bg-[var(--upx-primary-50)] dark:bg-[var(--upx-primary)]/10 border border-[var(--upx-border)] text-xs">
                                                                    <div className="space-y-0.5">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="font-bold text-[var(--upx-primary)]">Contract: </span>
                                                                            <span className="font-mono font-bold">{selectedOptionContract.trading_symbol}</span>
                                                                        </div>
                                                                        <div className="text-muted-foreground text-[11px]">
                                                                            Lot Size: <strong className="text-slate-800 dark:text-slate-200">{lotSize}</strong> | Quantity ({selectedLots} {selectedLots === 1 ? 'lot' : 'lots'}): <strong className="text-slate-800 dark:text-slate-200">{totalQty}</strong>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center gap-4">
                                                                        <div className="text-right">
                                                                            <span className="text-muted-foreground text-[10px] block">Option Traded Price</span>
                                                                            {isLoadingOptionLtp && optionPrice === null ? (
                                                                                <span className="text-xs font-mono text-muted-foreground animate-pulse">Loading price...</span>
                                                                            ) : optionPrice !== null ? (
                                                                                <span className="text-sm font-extrabold font-mono text-[var(--upx-primary)]">₹{optionPrice.toFixed(2)}</span>
                                                                            ) : (
                                                                                <span className="text-xs text-muted-foreground font-mono">—</span>
                                                                            )}
                                                                        </div>
                                                                        <div className="text-right pl-3 border-l border-[var(--upx-border)]">
                                                                            <span className="text-muted-foreground text-[10px] block">Capital Required {selectedAccount === 'All accounts' ? '(Per Account)' : ''}</span>
                                                                            {isLoadingOptionLtp && perAccountCapital === null ? (
                                                                                <span className="text-xs font-mono text-muted-foreground animate-pulse">Calculating...</span>
                                                                            ) : perAccountCapital !== null ? (
                                                                                <div className="flex flex-col items-end">
                                                                                    <span className="text-sm font-extrabold font-mono text-emerald-700 dark:text-emerald-400">
                                                                                        ₹{perAccountCapital.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                                    </span>
                                                                                    {selectedAccount === 'All accounts' && (
                                                                                        <span className="text-[10px] text-muted-foreground font-mono">
                                                                                            Total: ₹{(perAccountCapital * (accounts.length - 1)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                            ) : (
                                                                                <span className="text-xs text-muted-foreground font-mono">—</span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })()}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Order Details Section */}
                                        {selectedAccount === 'All accounts' ? (
                                            /* All Accounts Mode */
                                            <div className="space-y-6">


                                                {/* Lots Selector (1 to 10) */}
                                                <div className="p-4 rounded-xl border border-black/10 dark:border-white/10 bg-white/50 dark:bg-slate-900/40 space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <label className="block text-sm font-bold text-[var(--upx-primary)]">
                                                            Lots <span className="text-red-500">*</span>
                                                        </label>
                                                        {selectedOptionContract && (
                                                            <span className="text-xs font-mono text-muted-foreground">
                                                                Lot Size: {selectedOptionContract.lot_size || selectedOptionContract.minimum_lot || 1} | Total Qty: {selectedLots * (selectedOptionContract.lot_size || selectedOptionContract.minimum_lot || 1)}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((lot) => (
                                                            <button
                                                                key={lot}
                                                                type="button"
                                                                onClick={() => handleLotChange(lot)}
                                                                className={`h-9 min-w-10 px-3 rounded-lg font-bold text-xs transition-all ${
                                                                    selectedLots === lot
                                                                        ? 'bg-[var(--upx-primary)] text-white shadow-md scale-105'
                                                                        : 'bg-white dark:bg-slate-800 border hover:border-[var(--upx-primary)]/60 text-slate-700 dark:text-slate-300'
                                                                }`}
                                                            >
                                                                {lot} {lot === 1 ? 'Lot' : 'Lots'}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Quantity Inputs */}
                                                {accounts.length > 1 && (
                                                    /* Individual Account Quantities (Auto-calculated from Lots) */
                                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                                        {accounts.slice(1).map((account) => (
                                                            <div key={account}>
                                                                <label htmlFor={`quantity-${account}`} className="block text-sm font-medium text-gray-700 mb-1">
                                                                    {account} <span className="text-xs font-mono text-muted-foreground">({selectedLots} {selectedLots === 1 ? 'lot' : 'lots'})</span>
                                                                </label>
                                                                <div className="relative">
                                                                    <div className="flex gap-0">
                                                                        <input
                                                                            id={`quantity-${account}`}
                                                                            className="flex-1 border rounded-l px-3 py-2 bg-slate-100 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 font-mono text-xs font-bold border-r-0 cursor-not-allowed select-none"
                                                                            type="number"
                                                                            value={orderForms[account]?.quantity || ''}
                                                                            disabled
                                                                            readOnly
                                                                            tabIndex={-1}
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
                                                                                                {lastClosingPrice !== null && lastClosingPrice > 0 && capitalInfo.totalCost > 0 && (
                                                                                                    <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400">
                                                                                                        Need: <strong className="text-slate-900 dark:text-slate-100">₹{capitalInfo.totalCost.toFixed(2)}</strong>
                                                                                                    </div>
                                                                                                )}
                                                                                                {hasInsufficientFunds ? (
                                                                                                    <div className="text-red-600 font-semibold">⚠️ Insufficient Funds!</div>
                                                                                                ) : (
                                                                                                    <div className="font-semibold text-emerald-700 dark:text-emerald-400">Max {isNaN(capitalInfo?.purchasableLots) ? '0' : capitalInfo?.purchasableLots} {capitalInfo?.purchasableLots === 1 ? 'lot' : 'lots'}</div>
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
                                                                Order Type <span className="text-xs text-muted-foreground font-normal">(Disabled)</span>
                                                            </div>
                                                            <div className="flex flex-wrap gap-2">
                                                                {['Market', 'Limit', 'Stop Loss - M'].map((type) => (
                                                                    <button
                                                                        key={type}
                                                                        type="button"
                                                                        disabled
                                                                        className={`px-4 py-2 text-sm rounded-md border cursor-not-allowed ${orderForm.orderType === type
                                                                            ? 'bg-[var(--upx-primary)] text-white border-[var(--upx-primary)] shadow-sm opacity-80 font-semibold'
                                                                            : 'bg-gray-100 border-gray-200 text-gray-400 opacity-50'
                                                                            }`}
                                                                    >
                                                                        {type}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-medium text-gray-700 mb-2">
                                                                Product <span className="text-xs text-muted-foreground font-normal">(Disabled)</span>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                {['Delivery', 'Intraday'].map((product) => (
                                                                    <button
                                                                        key={product}
                                                                        type="button"
                                                                        disabled
                                                                        className={`px-4 py-2 text-sm rounded-md border cursor-not-allowed ${orderForm.product === product
                                                                            ? 'bg-[var(--upx-primary)] text-white border-[var(--upx-primary)] shadow-sm opacity-80 font-semibold'
                                                                            : 'bg-gray-100 border-gray-200 text-gray-400 opacity-50'
                                                                            }`}
                                                                    >
                                                                        {product}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-medium text-gray-700 mb-2">
                                                                Validity <span className="text-xs text-muted-foreground font-normal">(Disabled)</span>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                {['Day', 'IOC'].map((validity) => (
                                                                    <button
                                                                        key={validity}
                                                                        type="button"
                                                                        disabled
                                                                        className={`px-4 py-2 text-sm rounded-md border cursor-not-allowed ${orderForm.validity === validity
                                                                            ? 'bg-[var(--upx-primary)] text-white border-[var(--upx-primary)] shadow-sm opacity-80 font-semibold'
                                                                            : 'bg-gray-100 border-gray-200 text-gray-400 opacity-50'
                                                                            }`}
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
                                                    {/* Lots Selector (1 to 10) */}
                                                    <div className="p-3.5 rounded-xl border border-black/10 dark:border-white/10 bg-white/50 dark:bg-slate-900/40 space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <label className="block text-sm font-bold text-[var(--upx-primary)]">
                                                                Lots <span className="text-red-500">*</span>
                                                            </label>
                                                            {selectedOptionContract && (
                                                                <span className="text-xs font-mono text-muted-foreground">
                                                                    Lot Size: {selectedOptionContract.lot_size || selectedOptionContract.minimum_lot || 1}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((lot) => (
                                                                <button
                                                                    key={lot}
                                                                    type="button"
                                                                    onClick={() => handleLotChange(lot)}
                                                                    className={`h-8 min-w-9 px-2.5 rounded-lg font-bold text-xs transition-all ${
                                                                        selectedLots === lot
                                                                            ? 'bg-[var(--upx-primary)] text-white shadow-md scale-105'
                                                                            : 'bg-white dark:bg-slate-800 border hover:border-[var(--upx-primary)]/60 text-slate-700 dark:text-slate-300'
                                                                    }`}
                                                                >
                                                                    {lot} {lot === 1 ? 'Lot' : 'Lots'}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-1 gap-3">
                                                        <div>
                                                            <label htmlFor="quantity-input" className="block text-sm font-medium text-gray-700 mb-1">
                                                                Quantity <span className="text-xs font-mono text-muted-foreground">({selectedLots} {selectedLots === 1 ? 'lot' : 'lots'})</span>
                                                            </label>
                                                            <div className="flex gap-0">
                                                                {/* Quantity Display - Left Half */}
                                                                <input
                                                                    id="quantity-input"
                                                                    className="flex-1 border rounded-l px-3 py-2 bg-slate-100 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 font-mono text-xs font-bold border-r-0 cursor-not-allowed select-none"
                                                                    type="number"
                                                                    value={orderForm.quantity}
                                                                    disabled
                                                                    readOnly
                                                                    tabIndex={-1}
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
                                                                                        {lastClosingPrice !== null && lastClosingPrice > 0 && capitalInfo.totalCost > 0 && (
                                                                                            <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400">
                                                                                                Need: <strong className="text-slate-900 dark:text-slate-100">₹{capitalInfo.totalCost.toFixed(2)}</strong>
                                                                                            </div>
                                                                                        )}
                                                                                        {hasInsufficientFunds ? (
                                                                                            <div className="text-red-600 font-semibold">⚠️ Insufficient Funds!</div>
                                                                                        ) : (
                                                                                            <div className="font-semibold text-emerald-700 dark:text-emerald-400">Max {isNaN(capitalInfo?.purchasableLots) ? '0' : capitalInfo?.purchasableLots} {capitalInfo?.purchasableLots === 1 ? 'lot' : 'lots'}</div>
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
                                                            Order Type <span className="text-xs text-muted-foreground font-normal">(Disabled)</span>
                                                        </div>
                                                        <div className="flex flex-wrap gap-2">
                                                            {['Market', 'Limit', 'Stop Loss - M'].map((type) => (
                                                                <button
                                                                    key={type}
                                                                    type="button"
                                                                    disabled
                                                                    className={`px-4 py-2 text-sm rounded-md border cursor-not-allowed ${orderForm.orderType === type
                                                                        ? 'bg-[var(--upx-primary)] text-white border-[var(--upx-primary)] shadow-sm opacity-80 font-semibold'
                                                                        : 'bg-gray-100 border-gray-200 text-gray-400 opacity-50'
                                                                        }`}
                                                                >
                                                                    {type}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-700 mb-2">
                                                            Product <span className="text-xs text-muted-foreground font-normal">(Disabled)</span>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            {['Delivery', 'Intraday'].map((product) => (
                                                                <button
                                                                    key={product}
                                                                    type="button"
                                                                    disabled
                                                                    className={`px-4 py-2 text-sm rounded-md border cursor-not-allowed ${orderForm.product === product
                                                                        ? 'bg-[var(--upx-primary)] text-white border-[var(--upx-primary)] shadow-sm opacity-80 font-semibold'
                                                                        : 'bg-gray-100 border-gray-200 text-gray-400 opacity-50'
                                                                        }`}
                                                                >
                                                                    {product}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-700 mb-2">
                                                            Validity <span className="text-xs text-muted-foreground font-normal">(Disabled)</span>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            {['Day', 'IOC'].map((validity) => (
                                                                <button
                                                                    key={validity}
                                                                    type="button"
                                                                    disabled
                                                                    className={`px-4 py-2 text-sm rounded-md border cursor-not-allowed ${orderForm.validity === validity
                                                                        ? 'bg-[var(--upx-primary)] text-white border-[var(--upx-primary)] shadow-sm opacity-80 font-semibold'
                                                                        : 'bg-gray-100 border-gray-200 text-gray-400 opacity-50'
                                                                        }`}
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
                                        {(() => {
                                            // Condition: company is selected, contract is selected, and funds are sufficient for the selected lots
                                            if (!selectedCompany || !selectedOptionContract) {
                                                return null;
                                            }

                                            let hasInsufficientFunds = false;
                                            let insufficientFundsAccounts: string[] = [];
                                            let hasNoFunds = false;

                                            const lotSize = selectedOptionContract.lot_size || selectedOptionContract.minimum_lot || 1;
                                            const totalQty = selectedLots * lotSize;

                                            if (totalQty <= 0) {
                                                return null;
                                            }

                                            if (selectedAccount === 'All accounts') {
                                                // Check all accounts for insufficient funds and zero funds
                                                for (const account of accounts.slice(1)) {
                                                    const capitalInfo = getCapitalInfo(account, String(totalQty));
                                                    if (capitalInfo.capitalRemaining < 0) {
                                                        hasInsufficientFunds = true;
                                                        insufficientFundsAccounts.push(account);
                                                    }
                                                }
                                                hasNoFunds = accounts.slice(1).every(account => accountFunds[account] <= 0);
                                            } else {
                                                // Check single account for insufficient funds and zero funds
                                                const capitalInfo = getCapitalInfo(selectedAccount, String(totalQty));
                                                if (capitalInfo.capitalRemaining < 0) {
                                                    hasInsufficientFunds = true;
                                                    insufficientFundsAccounts.push(selectedAccount);
                                                }
                                                hasNoFunds = accountFunds[selectedAccount] <= 0;
                                            }

                                            // Only show the order place button when the lots are valid based on the money available
                                            if (hasInsufficientFunds || hasNoFunds) {
                                                return (
                                                    <div className="pt-4 border-t border-gray-200">
                                                        <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md text-xs text-amber-800 dark:text-amber-200 font-medium">
                                                            {hasNoFunds ? (
                                                                <span>⚠️ No funds available in {selectedAccount === 'All accounts' ? 'any account' : selectedAccount}.</span>
                                                            ) : (
                                                                <span>
                                                                    ⚠️ Insufficient funds for {selectedLots} {selectedLots === 1 ? 'lot' : 'lots'} in {insufficientFundsAccounts.join(', ')}. Please reduce lots to place order.
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            }

                                            return (
                                                <div className="pt-4 border-t border-gray-200">
                                                    {/* Two simpler buttons: one for batch (All accounts) and one for single account. */}
                                                    {selectedAccount === 'All accounts' ? (
                                                        (() => {
                                                            const disabled = isSubmittingOrder;
                                                            const className = `w-full py-3 text-base font-semibold rounded-md transition-colors ${disabled ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'btn-upstox hover:bg-[var(--upx-primary)]/90 shadow-md'}`;
                                                            const label = isSubmittingOrder
                                                                ? `Placing Orders (${accounts.slice(1).length})...`
                                                                : `Place Orders for All Accounts (${accounts.slice(1).length} accounts)`;

                                                            return (
                                                                <button
                                                                    className={className}
                                                                    onClick={disabled ? undefined : () => setIsConfirmOrderModalOpen(true)}
                                                                    disabled={disabled}
                                                                >
                                                                    {label}
                                                                </button>
                                                            );
                                                        })()
                                                    ) : (
                                                        (() => {
                                                            const disabled = isSubmittingOrder;
                                                            const className = `w-full py-3 text-base font-semibold rounded-md transition-colors ${disabled ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'btn-upstox hover:bg-[var(--upx-primary)]/90 shadow-md'}`;
                                                            const label = isSubmittingOrder
                                                                ? `Placing Order for ${selectedAccount}...`
                                                                : `Place Order for ${selectedAccount}`;

                                                            return (
                                                                <button
                                                                    className={className}
                                                                    onClick={disabled ? undefined : () => setIsConfirmOrderModalOpen(true)}
                                                                    disabled={disabled}
                                                                >
                                                                    {label}
                                                                </button>
                                                            );
                                                        })()
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </TabsContent>

                            {/* Open Positions */}
                            <TabsContent value="Open Positions" className="space-y-4">
                                <div className="space-y-3">
                                    <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white/60 dark:bg-slate-900/40 rounded-xl border border-black/5 dark:border-white/5">
                                        <div className="flex items-center gap-2">
                                            <div className="h-5 w-1 rounded bg-[var(--upx-primary)]" />
                                            <h3 className="text-lg font-semibold text-[var(--upx-primary)] dark:text-[var(--upx-primary-300)]">
                                                Open Positions
                                            </h3>
                                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[var(--upx-primary-50)] text-[var(--upx-primary)] border border-[var(--upx-border)]">
                                                Live Portfolio Positions
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => fetchOpenPositions(selectedAccount)}
                                                disabled={isLoadingPositions[selectedAccount]}
                                                className="px-3 py-1 bg-[var(--upx-primary)] text-white font-medium rounded hover:bg-[var(--upx-primary)]/90 transition-colors disabled:opacity-50 text-xs flex items-center gap-1.5"
                                            >
                                                {isLoadingPositions[selectedAccount] ? 'Loading...' : 'Refresh Positions'}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Positions records display */}
                                    <div className="upstox-surface rounded-xl overflow-hidden border">
                                        {selectedAccount === 'All accounts'
                                            ? renderAllAccountsPositionsView()
                                            : renderIndividualAccountPositionsView()}
                                    </div>
                                </div>
                            </TabsContent>

                            {/* Order Book (Today's Orders) */}
                            <TabsContent value="Order Book" className="space-y-4">
                                <div className="space-y-3">
                                    <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white/60 dark:bg-slate-900/40 rounded-xl border border-black/5 dark:border-white/5">
                                        <div className="flex items-center gap-2">
                                            <div className="h-5 w-1 rounded bg-[var(--upx-primary)]" />
                                            <h3 className="text-lg font-semibold text-[var(--upx-primary)] dark:text-[var(--upx-primary-300)]">
                                                Today&apos;s Order Book
                                            </h3>
                                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[var(--upx-primary-50)] text-[var(--upx-primary)] border border-[var(--upx-border)]">
                                                Current Day Orders
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => fetchOrderBook(selectedAccount)}
                                                disabled={isLoadingOrderBook[selectedAccount]}
                                                className="px-3 py-1 bg-[var(--upx-primary)] text-white font-medium rounded hover:bg-[var(--upx-primary)]/90 transition-colors disabled:opacity-50 text-xs flex items-center gap-1.5"
                                            >
                                                {isLoadingOrderBook[selectedAccount] ? 'Loading...' : 'Refresh Orders'}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Order book records display */}
                                    <div className="upstox-surface rounded-xl overflow-hidden border">
                                        {selectedAccount === 'All accounts'
                                            ? renderAllAccountsOrderBookView()
                                            : renderIndividualAccountOrderBookView()}
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
            {sellModalOpen && selectedOrderToSell && (() => {
                const sellKey = selectedOrderToSell.instrumentKey || '';
                const currentSellLtp = (contractLtpMap[sellKey] ?? selectedOrderToSell.ltp ?? lastClosingPrices[selectedAccount] ?? companyPrices[selectedOrderToSell.companyName]) ?? null;
                const entryAvgPrice = selectedOrderToSell.avgPrice !== undefined && selectedOrderToSell.avgPrice !== null ? Number(selectedOrderToSell.avgPrice) : null;
                const parsedQty = Number.parseInt(sellQuantity) || 0;
                const estimatedProceeds = currentSellLtp !== null ? parsedQty * currentSellLtp : null;
                const costBasis = entryAvgPrice !== null ? parsedQty * entryAvgPrice : null;
                const projectedPnl = estimatedProceeds !== null && costBasis !== null ? estimatedProceeds - costBasis : null;
                const projectedPnlPercent = costBasis && costBasis > 0 && projectedPnl !== null ? (projectedPnl / costBasis) * 100 : null;

                return (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
                        <h3 className="text-lg font-semibold mb-4 text-[var(--upx-primary)]">
                            Confirm Sell Order
                        </h3>
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <p className="text-sm text-gray-600">
                                    Company: <span className="font-medium text-slate-800">{selectedOrderToSell.companyName}</span>
                                </p>
                                <p className="text-sm text-gray-600">
                                    Available Quantity: <span className="font-medium text-slate-800">{selectedOrderToSell.holdingQty}</span>
                                </p>
                                {entryAvgPrice !== null && (
                                    <p className="text-sm text-gray-600">
                                        Entry / Buy Price: <span className="font-medium font-mono text-slate-800">₹{entryAvgPrice.toFixed(2)}</span>
                                    </p>
                                )}
                                <p className="text-sm text-gray-600">
                                    Current Price: <span className="font-medium font-mono text-slate-800">{currentSellLtp !== null && currentSellLtp !== undefined ? `₹${currentSellLtp.toFixed(2)}` : 'Loading...'}</span>
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

                            {/* Estimated Proceeds & P&L */}
                            {sellQuantity && (
                                <div className="p-3 bg-gray-50 rounded space-y-2 border border-gray-100">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-600">Estimated Proceeds:</span>
                                        <span className="font-semibold font-mono text-slate-900">
                                            ₹{(estimatedProceeds ?? 0).toFixed(2)}
                                        </span>
                                    </div>
                                    {projectedPnl !== null && (
                                        <div className="flex justify-between items-center text-sm pt-2 border-t border-gray-200/80">
                                            <span className="text-gray-600 font-medium">Estimated {projectedPnl >= 0 ? 'Profit' : 'Loss'}:</span>
                                            <span className={`font-bold font-mono ${projectedPnl >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                {projectedPnl >= 0 ? '+' : ''}₹{projectedPnl.toFixed(2)}
                                                {projectedPnlPercent !== null && (
                                                    <span className="text-xs ml-1 font-semibold">
                                                        ({projectedPnl >= 0 ? '+' : ''}{projectedPnlPercent.toFixed(2)}%)
                                                    </span>
                                                )}
                                            </span>
                                        </div>
                                    )}
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
                );
            })()}
            {/* Place Order Confirmation Modal */}
            {isConfirmOrderModalOpen && selectedOptionContract && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
                    <div className="bg-white dark:bg-slate-900 border border-black/10 dark:border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b pb-3 border-gray-100 dark:border-slate-800">
                            <h3 className="text-lg font-bold text-[var(--upx-primary)] flex items-center gap-2">
                                <span>Confirm Options Order</span>
                            </h3>
                            <button
                                type="button"
                                onClick={() => setIsConfirmOrderModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-lg"
                                disabled={isSubmittingOrder}
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-3 text-sm">
                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-1.5">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-muted-foreground">Account</span>
                                    <span className="font-bold text-slate-800 dark:text-slate-100">{selectedAccount}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-muted-foreground">Company</span>
                                    <span className="font-bold text-slate-800 dark:text-slate-100">{selectedCompany}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-muted-foreground">Contract</span>
                                    <span className="font-mono font-bold text-[var(--upx-primary)]">{selectedOptionContract.trading_symbol}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-muted-foreground">Strike & Type</span>
                                    <span className="font-mono font-bold">
                                        ₹{selectedOptionContract.strike_price} {selectedOptionContract.instrument_type} ({selectedOptionContract.expiry})
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="p-2.5 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/50">
                                    <span className="text-muted-foreground block text-[11px]">Lots & Quantity</span>
                                    <span className="font-bold text-sm text-emerald-800 dark:text-emerald-300">
                                        {selectedLots} {selectedLots === 1 ? 'Lot' : 'Lots'} ({selectedLots * (selectedOptionContract.lot_size || selectedOptionContract.minimum_lot || 1)} Qty)
                                    </span>
                                </div>
                                <div className="p-2.5 rounded-lg bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-800/50">
                                    <span className="text-muted-foreground block text-[11px]">Option Price (LTP)</span>
                                    <span className="font-bold text-sm text-blue-800 dark:text-blue-300">
                                        ₹{((contractLtpMap[selectedOptionContract.instrument_key] ?? lastClosingPrice) ?? 0).toFixed(2)}
                                    </span>
                                </div>
                            </div>

                            {(() => {
                                const lotSize = selectedOptionContract.lot_size || selectedOptionContract.minimum_lot || 1;
                                const totalQty = selectedLots * lotSize;
                                const price = (contractLtpMap[selectedOptionContract.instrument_key] ?? lastClosingPrice) ?? 0;
                                const perAccountCapital = totalQty * price;
                                return (
                                    <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-xs flex justify-between items-center">
                                        <span className="font-medium text-amber-900 dark:text-amber-200">
                                            Total Capital Required {selectedAccount === 'All accounts' ? `(${accounts.slice(1).length} accounts)` : ''}:
                                        </span>
                                        <span className="font-bold font-mono text-sm text-amber-950 dark:text-amber-100">
                                            ₹{(selectedAccount === 'All accounts' ? perAccountCapital * accounts.slice(1).length : perAccountCapital).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                );
                            })()}
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setIsConfirmOrderModalOpen(false)}
                                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 font-medium text-sm transition-colors"
                                disabled={isSubmittingOrder}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={async () => {
                                    setIsConfirmOrderModalOpen(false);
                                    await handleSubmitOrder();
                                }}
                                className="flex-1 px-4 py-2.5 rounded-xl btn-upstox hover:bg-[var(--upx-primary)]/90 text-white font-bold text-sm shadow-md transition-colors"
                                disabled={isSubmittingOrder}
                            >
                                {isSubmittingOrder ? 'Placing...' : 'OK, Place Order'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </SidebarInset>
    );
}
