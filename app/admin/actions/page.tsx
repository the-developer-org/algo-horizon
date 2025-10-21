"use client";

import React, { useState, useEffect } from 'react';
import * as Switch from "@radix-ui/react-switch";
import { Calculator, Database, ArrowLeft, Mail } from "lucide-react";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import toast, { Toaster } from 'react-hot-toast';
import { fetchKeyMapping } from "@/utils/apiUtils";
import { fetchUpstoxCombinedData, fetchUpstoxHistoricalData } from "@/components/utils/upstoxApi";
import { calculateSwingPointsFromCandles, parseTimestampToUnix } from "@/utils/swingPointCalculator";
import axios from 'axios';
import { calculateAllSwingPoints, calculateDateRangeDynamic, createProcessedCompanyObject, fetchAllTimeframeData } from '@/utils/swingsCalculation';

// Generate all alphabets A-Z
const alphabets = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));

// Admin actions sidebar component with Recalculations and Data Insertion sections
function AdminActionsSidebar({ onItemClick, ...props }: { onItemClick: (section: string) => void } & React.ComponentProps<typeof Sidebar>) {
  const handleBackToAdmin = () => {
    // Navigate to admin panel
    window.location.href = '/admin';
  };

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarContent>
        {/* Back to Admin Panel Button */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={handleBackToAdmin}
                  className="flex items-center gap-2 cursor-pointer text-gray-400 hover:text-white hover:bg-gray-900 mb-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to Admin Panel</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Recalculations Section */}
        <SidebarGroup>
          <SidebarGroupLabel>Recalculations</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => onItemClick('recalculate')}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Calculator />
                  <span>Recalculate Data</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Data Insertion Section */}
        <SidebarGroup>
          <SidebarGroupLabel>Data Insertion</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => onItemClick('highs-lows')}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Database />
                  <span>High's & Low's</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => onItemClick('crucial-actions')}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Database />
                  <span>Crucial Actions</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Gmail Integration Section */}
        <SidebarGroup>
          <SidebarGroupLabel>Communication</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => onItemClick('add-gmail')}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Mail />
                  <span>Gmail Access</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

// High's & Low's Component
function HighsAndLowsInterface() {
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [selectedAlphabets, setSelectedAlphabets] = useState<string[]>([]);
  const [timeframeYears, setTimeframeYears] = useState<number>(1);
  const [selectedTimeframes, setSelectedTimeframes] = useState<{ "15Min": boolean; "1H": boolean; "4H": boolean; "1D": boolean }>({
    "15Min": true,
    "1H": true,
    "4H": true,
    "1D": true,
  });
  const toggleTimeframe = (key: keyof typeof selectedTimeframes) => {
    setSelectedTimeframes(prev => ({ ...prev, [key]: !prev[key] }));
  };
  const [isSelectAll, setIsSelectAll] = useState(false);
  const [alphabetDataMap, setAlphabetDataMap] = useState<{ [letter: string]: Array<{ instrumentKey: string; companyName: string }> }>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<number>(-1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [currentCompany, setCurrentCompany] = useState<string>("");
  const [processedCount, setProcessedCount] = useState<number>(0);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [currentAlphabet, setCurrentAlphabet] = useState<string>("");
  const [processedAlphabets, setProcessedAlphabets] = useState<string[]>([]);
  const [savedCount, setSavedCount] = useState<number>(0);
  const [totalToSave, setTotalToSave] = useState<number>(0);
  const [currentAlphabetCount, setCurrentAlphabetCount] = useState<number>(0);
  const [currentAlphabetProcessed, setCurrentAlphabetProcessed] = useState<number>(0);
  const [batchProgress, setBatchProgress] = useState<string>("");
  
  // Search functionality states
  const [keyMapping, setKeyMapping] = useState<{ [companyName: string]: string }>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [selectedInstrumentKey, setSelectedInstrumentKey] = useState<string>('');

  const processingSteps = [
    "Fetching company data from KeyMapping",
    "Organizing companies by alphabets",
    "Processing companies alphabet by alphabet",
    "Calculating swing points and highs/lows",
    `Saving processed data to backend ${batchProgress}`,
    "Process completed successfully"
  ];

  // Fetch key mapping on component mount
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

  // Update suggestions as user types
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

  // Handle single company processing
  const handleProcessSingleCompany = async () => {
    // Ensure at least one timeframe selected
    if (!Object.values(selectedTimeframes).some(Boolean)) {
      alert('Please select at least one timeframe to calculate swings');
      return;
    }

    if (!selectedCompany || !selectedInstrumentKey) {
      alert("Please select a company from the search dropdown");
      return;
    }
    if (!timeframeYears) {
      alert("Please select a timeframe");
      return;
    }

    // Initialize processing state
    initializeProcessingState(1, false);

    try {
      // Step 1: Set up single company processing
      setCurrentStep(1);
      setCompletedSteps([0]);

      // Step 2: Process the single company
      setCurrentStep(2);
      setCompletedSteps([0, 1]);
      setCurrentCompany(selectedCompany);

      const { fromDate, toDate } = calculateDateRangeDynamic(timeframeYears);

      // Fetch only the selected timeframes
      const { dailyDataReversed, hourly4DataReversed, hourly1DataReversed, fifteenMinuteDataReversed } = 
        await fetchAllTimeframeData(selectedInstrumentKey, fromDate, toDate, selectedTimeframes);

      // Step 3: Calculate swing points
      setCurrentStep(3);
      setCompletedSteps([0, 1, 2]);

      // Ensure at least one selected timeframe returned data
      const hasAnyData = [dailyDataReversed, hourly4DataReversed, hourly1DataReversed, fifteenMinuteDataReversed].some(arr => Array.isArray(arr) && arr.length > 0);

      if (hasAnyData) {
        // Calculate swing points only for selected frames
        const { swingPointsDay, swingPoints4H, swingPoints1H, swingPoints15Min } = 
          calculateAllSwingPoints(dailyDataReversed, hourly4DataReversed, hourly1DataReversed, fifteenMinuteDataReversed, selectedTimeframes);

        // Create processed company object using utility function
        const processedCompany = createProcessedCompanyObject(
          selectedInstrumentKey,
          selectedCompany,
          timeframeYears,
          swingPointsDay,
          swingPoints4H,
          swingPoints1H,
          swingPoints15Min
        );

        // Step 4: Save to backend
        setCurrentStep(4);
        setCompletedSteps([0, 1, 2, 3]);

        await saveToBackend([processedCompany]);
        setSavedCount(1);

        // Step 5: Complete
        setCurrentStep(5);
        setCompletedSteps([0, 1, 2, 3, 4, 5]);
        setProcessedCount(1);

      
      } else {
        alert(`No historical data found for ${selectedCompany}`);
      }

    } catch (error) {
      console.error("Error during single company processing:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Processing failed: ${errorMessage}`);
    } finally {
      resetProcessingState();
    }
  };

  const handleSelectAll = () => {
    if (isSelectAll) {
      setSelectedAlphabets([]);
      setIsSelectAll(false);
    } else {
      setSelectedAlphabets([...alphabets]);
      setIsSelectAll(true);
    }
  };

  const handleAlphabetToggle = (alphabet: string) => {
    setSelectedAlphabets(prev => {
      const newSelection = prev.includes(alphabet)
        ? prev.filter(a => a !== alphabet)
        : [...prev, alphabet];

      // Update select all state
      setIsSelectAll(newSelection.length === alphabets.length);

      return newSelection;
    });
  };


  // Utility function to initialize processing state
  const initializeProcessingState = (totalCount: number = 0, isBulk: boolean = false) => {
    setIsProcessing(true);
    setCurrentStep(0);
    setCompletedSteps([]);
    setProcessedCount(0);
    setTotalCount(totalCount);
    setCurrentCompany("");
    setCurrentAlphabet("");
    setProcessedAlphabets([]);
    setSavedCount(0);
    setTotalToSave(totalCount);
    setBatchProgress("");
    
    if (isBulk) {
      setAlphabetDataMap({});
      setCurrentAlphabetCount(0);
      setCurrentAlphabetProcessed(0);
    }
  };

  // Utility function to reset processing state
  const resetProcessingState = () => {
    setIsProcessing(false);
    setCurrentStep(-1);
    setCurrentCompany("");
    setCurrentAlphabet("");
  };

  // Helper function to save data to backend in batches
  const saveToBackend = async (processedData: any[]) => {
    try {
    
      const backEndBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

      const response = await fetch(`${backEndBaseUrl}/api/chart-historical-data/save-highs-lows`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(processedData),
      });

      if (!response.ok) {
        throw new Error(`Backend save failed: ${response.statusText}`);
      }

      const result = await response.json();
      //console.log(`✅ Batch of ${processedData.length} companies saved to backend:`, result);
      return result;
    } catch (error) {
      //console.error('❌ Error saving batch to backend:', error);
      throw error;
    }
  };

  const handleFetchHighsAndLows = async () => {
    if (selectedAlphabets.length === 0) {
      alert("Please select at least one alphabet");
      return;
    }
    if (!timeframeYears) {
      alert("Please select a timeframe");
      return;
    }
    // Ensure at least one timeframe selected for bulk
    if (!Object.values(selectedTimeframes).some(Boolean)) {
      alert('Please select at least one timeframe to calculate swings');
      return;
    }

    try {
      // Step 1: Fetch KeyMapping data from API
      setCurrentStep(0);
      const alphabetsString = selectedAlphabets.join(''); // e.g., "ABC" or "AFQZ"
      const backEndBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

      const response = await fetch(`${backEndBaseUrl}/api/swing/get-high-lows/${alphabetsString}/${timeframeYears}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch high-lows data: ${response.statusText}`);
      }

      const responseData = await response.json();
      // Extract swingMap from the response
      const keyMapping = responseData.swingMap || {};
      setCompletedSteps([0]);

      // Step 2: Organize companies by alphabet
      setCurrentStep(1);
      const organizedData: { [letter: string]: Array<{ instrumentKey: string; companyName: string }> } = {};

      // Initialize arrays for all letters A-Z
      alphabets.forEach(letter => {
        organizedData[letter] = [];
      });

      // Organize companies by first letter
      Object.entries(keyMapping).forEach(([companyName, instrumentKey]) => {
        const firstLetter = companyName.charAt(0).toUpperCase();
        if (firstLetter >= 'A' && firstLetter <= 'Z') {
          organizedData[firstLetter].push({
            instrumentKey: String(instrumentKey),
            companyName
          });
        }
      });

      // Filter data based on selected alphabets
      const filteredData: { [letter: string]: Array<{ instrumentKey: string; companyName: string }> } = {};
      selectedAlphabets.forEach(letter => {
        filteredData[letter] = organizedData[letter] || [];
      });

      setCompletedSteps([0, 1]);

      // Calculate total companies to process
      const totalCompanies = Object.values(filteredData).reduce((sum, companies) => sum + companies.length, 0);
      
      // Initialize processing state using utility function
      initializeProcessingState(totalCompanies, true);

      // Step 3: Process companies alphabet by alphabet
      setCurrentStep(2);
      const { fromDate, toDate } = calculateDateRangeDynamic(timeframeYears);
  
      let allprocessedDataLength: number = 0;
      let processedCounter = 0;

      // Process each alphabet separately
      for (const [letter, companies] of Object.entries(filteredData)) {
        if (companies.length === 0) continue;
        
        // Set current alphabet and update display
        setCurrentAlphabet(letter);
        setCurrentAlphabetCount(companies.length);
        setCurrentAlphabetProcessed(0);
        setAlphabetDataMap({ [letter]: companies });
        
        //console.log(`🔄 Starting Alphabet ${letter} with ${companies.length} companies`);

         setCompletedSteps([0, 1]);
         setBatchProgress("")

        let alphabetCounter = 0;

        let batchCounter = 0;
        let currentIteration = 0;

        const batchProcessedData: any[] = [];

        for (const company of companies) {
          setCurrentCompany(company.companyName);
          setProcessedCount(processedCounter + 1);
          setCurrentAlphabetProcessed(alphabetCounter + 1);

          try {
            // Fetch all timeframe data using utility function
            const { dailyDataReversed, hourly4DataReversed, hourly1DataReversed, fifteenMinuteDataReversed } = 
              await fetchAllTimeframeData(company.instrumentKey, fromDate, toDate, selectedTimeframes);

            // Check if we have data from at least one timeframe
            if (
              (dailyDataReversed && dailyDataReversed.length > 0) ||
              (hourly4DataReversed && hourly4DataReversed.length > 0) ||
              (hourly1DataReversed && hourly1DataReversed.length > 0) ||
              (fifteenMinuteDataReversed && fifteenMinuteDataReversed.length > 0)
            ) {

              // Calculate swing points using utility function
              const { swingPointsDay, swingPoints4H, swingPoints1H, swingPoints15Min } = 
                calculateAllSwingPoints(dailyDataReversed, hourly4DataReversed, hourly1DataReversed, fifteenMinuteDataReversed, selectedTimeframes);

              setCompletedSteps([0, 1, 2, 3]);
              
              // Create processed company object using utility function
              const processedCompany = createProcessedCompanyObject(
                company.instrumentKey,
                company.companyName,
                timeframeYears,
                swingPointsDay,
                swingPoints4H,
                swingPoints1H,
                swingPoints15Min
              );
               batchProcessedData.push(processedCompany);
               batchCounter++;


              if (batchCounter >= 10 || batchCounter + (currentIteration * 10) === companies.length) {
                  currentIteration++;

                // Step 5: Save batch with progress tracking
                try {
                  // Update batch progress before saving
                  const currentSaved = (currentIteration - 1) * 10 + batchProcessedData.length;
                  setBatchProgress(`(${currentSaved}/${companies.length})`);
                  debugger
                  await saveToBackend(batchProcessedData);
            
                  setSavedCount(prev => prev + batchProcessedData.length);
                  allprocessedDataLength += batchProcessedData.length;
                  //console.log(`✅ Successfully saved batch of ${batchProcessedData.length} companies to backend`);
                } catch (error) {
                  //console.error(`❌ Error saving batch to backend:`, error);
                } finally {
                    batchCounter = 0;
                    batchProcessedData.length = 0;
                }
              } 
            } else {
              //console.warn(`⚠️ No historical data found for ${company.companyName}`);
            }

            // Small delay to prevent API rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));

          } catch (error) {
            //console.error(`❌ Error processing ${company.companyName}:`, error);
            // Continue with next company even if one fails
          }

          processedCounter++;
          alphabetCounter++;
        }
        
        // Mark this alphabet as completed ONLY after all companies are processed
        setProcessedAlphabets(prev => [...prev, letter]);
        //console.log(`✅ Completed processing Alphabet ${letter} - processed ${alphabetCounter} companies`);
        
        // Update step completion after each alphabet
        if (!completedSteps.includes(3)) {
          setCompletedSteps([0, 1, 2, 3]); // Mark calculation step complete after first alphabet
        }
        if (!completedSteps.includes(4)) {
          setCompletedSteps([0, 1, 2, 3, 4]); // Mark saving step complete after first alphabet
        }
      }

      // Step 6: Final completion - only after ALL alphabets are processed
      setCurrentStep(5);
      setCurrentAlphabet(""); // Clear current alphabet during final completion
      setTotalToSave(allprocessedDataLength);
      setSavedCount(allprocessedDataLength); // All data is already saved
      setCompletedSteps([0, 1, 2, 3, 4, 5]);

      //console.log(`🎉 Processing complete! Processed ${allprocessedDataLength} companies successfully.`);
      //console.log(`Successfully processed ${allprocessedDataLength} companies with highs, lows, and swing points!`);

    } catch (error) {
      console.error("Error during processing:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Processing failed: ${errorMessage}`);
    } finally {
      resetProcessingState();
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gray-800 border-gray-700 p-6 min-h-[300px]">
        <h3 className="text-xl font-semibold text-grey-900 mb-4">High's & Low's Data Fetcher</h3>
       


      <div className="flex items-center gap-4 mb-6">
        <span className="text-gray-800 font-medium">Bulk</span>

        <Switch.Root
          className="w-10 h-6 bg-gray-600 rounded-full relative data-[state=checked]:bg-green-500 outline-none cursor-pointer"
          id="bulk-mode"
          checked={isBulkMode}
          onCheckedChange={setIsBulkMode}
        >
          <Switch.Thumb className="block w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 translate-x-1 data-[state=checked]:translate-x-5" />
        </Switch.Root>
      </div>

      {/* Single Company Search - only show when bulk mode is disabled */}
      {!isBulkMode && (
        <div className="space-y-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="w-64 relative">
              <input
                type="text"
                value={searchTerm}
                onChange={e => {
                  setSearchTerm(e.target.value);
                  setSelectedCompany('');
                  setSelectedInstrumentKey('');
                }}
                placeholder="Search for a company..."
                className="p-2 border border-gray-600 bg-white-700 text-gray-900 rounded-md w-full placeholder-gray-400"
              />
              {/* Only show suggestions if not selected */}
              {suggestions.length > 0 && !selectedCompany && (
                <ul className="absolute z-50 w-full mt-1 border border-gray-600 rounded-md max-h-60 overflow-auto bg-gray-800 shadow-lg">
                  {suggestions.map((name) => (
                    <button
                      key={name}
                      onClick={() => handleSelectCompany(name)}
                      className="p-2 cursor-pointer hover:bg-gray-700 w-full text-left text-white"
                    >
                      {name}
                    </button>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Label className="text-gray-300">Timeframe:</Label>
              <Select value={timeframeYears.toString()} onValueChange={(value) => setTimeframeYears(Number(value))}>
                <SelectTrigger className="w-32 bg-gray-700 border-gray-600 text-white">
                  <SelectValue placeholder="Years" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  <SelectItem value="1">1 Year</SelectItem>
                  <SelectItem value="2">2 Years</SelectItem>
                  <SelectItem value="3">3 Years</SelectItem>
                  <SelectItem value="5">5 Years</SelectItem>
                  <SelectItem value="10">10 Years</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Timeframe selection checkboxes for single processing */}
            <div className="flex items-center gap-3">
              {(['15Min', '1H', '4H', '1D'] as (keyof typeof selectedTimeframes)[]).map(tf => (
                <label key={tf} className="inline-flex items-center gap-2 text-sm text-gray-900">
                  <input
                    type="checkbox"
                    checked={selectedTimeframes[tf]}
                    onChange={() => toggleTimeframe(tf)}
                    className="h-4 w-4 text-blue-600 bg-gray-700 border-gray-600 rounded"
                  />
                  {tf}
                </label>
              ))}
            </div>

            <Button
              onClick={handleProcessSingleCompany}
              disabled={isProcessing || !selectedCompany}
              className="bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-500 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  Processing...
                </>
              ) : (
                "Process Company"
              )}
            </Button>
          </div>

          {/* Selected Company Display */}
          {selectedCompany && (
            <div className="p-3 bg-gray-700 border border-gray-600 rounded-md">
              <span className="text-gray-300 text-sm">Selected Company: </span>
              <span className="text-white font-medium">{selectedCompany}</span>
            </div>
          )}
        </div>
      )}

        {/* Select All and Timeframe Controls */}
       {isBulkMode && ( <div className="flex flex-wrap items-center gap-4 mt-5 mb-6">
          <Button
            onClick={handleSelectAll}
            variant={isSelectAll ? "default" : "outline"}
            className={isSelectAll ? "bg-green-600 hover:bg-green-700" : "border-gray-600 text-gray-300 hover:bg-gray-700"}
          >
            {isSelectAll ? "Deselect All" : "Select All"}
          </Button>

          <div className="flex items-center gap-2">
            <Label className="text-gray-300">Timeframe:</Label>
            <Select value={timeframeYears.toString()} onValueChange={(value) => setTimeframeYears(Number(value))}>
              <SelectTrigger className="w-32 bg-gray-700 border-gray-600 text-white">
                <SelectValue placeholder="Years" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-600">
                <SelectItem value="1">1 Year</SelectItem>
                <SelectItem value="2">2 Years</SelectItem>
                <SelectItem value="3">3 Years</SelectItem>
                <SelectItem value="5">5 Years</SelectItem>
                <SelectItem value="10">10 Years</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Timeframe selection checkboxes for bulk processing */}
          <div className="flex items-center gap-3">
            {(['15Min', '1H', '4H', '1D'] as (keyof typeof selectedTimeframes)[]).map(tf => (
              <label key={tf} className="inline-flex items-center gap-2 text-sm text-gray-900">
                <input
                  type="checkbox"
                  checked={selectedTimeframes[tf]}
                  onChange={() => toggleTimeframe(tf)}
                  className="h-4 w-4 text-blue-600 bg-gray-700 border-gray-600 rounded"
                />
                {tf}
              </label>
            ))}
          </div>

          <Button
            onClick={handleFetchHighsAndLows}
            disabled={isProcessing}
            className="bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-500 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                Processing...
              </>
            ) : (
              "Fetch High's & Low's"
            )}
          </Button>
        </div>)}

        {/* Selected Count */}
        {isBulkMode && (
          <div className="mb-4">
            <span className="text-gray-400 text-sm">
              Selected: {selectedAlphabets.length} of {alphabets.length} alphabets
            </span>
          </div>
        )}

        {/* Alphabet Grid */}
      { isBulkMode && ( <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-13 gap-3">
          {alphabets.map((alphabet) => (
            <div key={alphabet} className="flex items-center space-x-1">
              <input
                type="checkbox"
                id={`alphabet-${alphabet}`}
                checked={selectedAlphabets.includes(alphabet)}
                onChange={() => handleAlphabetToggle(alphabet)}
                className="h-4 w-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
              />
              <Label
                htmlFor={`alphabet-${alphabet}`}
                className="text-grey-900 text-sm font-medium cursor-pointer select-none"
              >
                {alphabet}
              </Label>
            </div>
          ))}
        </div>
      )}
      </Card>

      {/* Selected Alphabets Display */}
      {isBulkMode && (selectedAlphabets.length > 0 && (
        <Card className="bg-gray-800 border-gray-700 p-4">
          <h4 className="text-lg font-semibold text-grey-900 mb-2">Selected Alphabets</h4>
          <div className="flex flex-wrap gap-2">
            {selectedAlphabets.map((alphabet) => (
              <span
                key={alphabet}
                className="px-2 py-1 bg-blue-600 text-white text-sm rounded"
              >
                {alphabet}
              </span>
            ))}
          </div>
        </Card>
      ))}

      {/* Progress Tracking Card */}
      {(isProcessing || completedSteps.length > 0) && (
        <Card className="bg-white border-gray-200 p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">
            {isBulkMode ? "Bulk Processing Steps" : "Single Company Processing Steps"}
          </h4>

          {/* Overall Progress */}
          {totalCount > 0 && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-blue-900">
                  Overall Progress: {processedCount} / {totalCount}
                </span>
                <span className="text-sm text-blue-700">
                  {Math.round((processedCount / totalCount) * 100)}%
                </span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(processedCount / totalCount) * 100}%` }}
                ></div>
              </div>
              {currentAlphabet && currentAlphabetCount > 0 && (
                <div className="mt-3 p-2 bg-green-50 rounded border border-green-200">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-green-900">
                      Alphabet {currentAlphabet}: {currentAlphabetProcessed} / {currentAlphabetCount}
                    </span>
                    <span className="text-sm text-green-700">
                      {Math.round((currentAlphabetProcessed / currentAlphabetCount) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-green-200 rounded-full h-1.5">
                    <div
                      className="bg-green-600 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${(currentAlphabetProcessed / currentAlphabetCount) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}
              {currentCompany && (
                <div className="mt-2 text-sm text-blue-800">
                  Currently processing: <span className="font-medium">{currentCompany}</span>
                </div>
              )}
              {currentStep === 4 && totalToSave > 0 && (
                <div className="mt-2 text-sm text-green-800">
                  Saved to backend: <span className="font-medium">{savedCount} / {totalToSave}</span>
                </div>
              )}
              {processedAlphabets.length > 0 && (
                <div className="mt-2 text-sm text-green-800">
                  Completed alphabets: <span className="font-medium">{processedAlphabets.join(', ')}</span>
                  {processedAlphabets.length > 0 && (
                    <span className="ml-2 text-xs text-green-600">({processedAlphabets.length} complete)</span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step Progress */}
          <div className="space-y-3">
            {processingSteps.map((step, index) => {
              const isCompleted = completedSteps.includes(index);
              const isCurrent = currentStep === index;

              let statusIcon;
              if (isCompleted) {
                statusIcon = (
                  <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                    <div className="text-white text-xs flex items-center justify-center">✓</div>
                  </div>
                );
              } else if (isCurrent) {
                statusIcon = (
                  <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                    <div className="w-3 h-3 text-white animate-spin rounded-full border border-white border-t-transparent"></div>
                  </div>
                );
              } else {
                statusIcon = <div className="w-5 h-5 rounded-full bg-gray-300"></div>;
              }

              let textStyle;
              if (isCompleted) {
                textStyle = 'text-green-700 font-medium';
              } else if (isCurrent) {
                textStyle = 'text-blue-700 font-medium';
              } else {
                textStyle = 'text-gray-500';
              }

              return (
                <div key={step} className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    {statusIcon}
                  </div>
                  <span className={`text-sm ${textStyle}`}>
                    {step}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Fetched Data Display */}
      {isBulkMode && (Object.keys(alphabetDataMap).length > 0 && (
        <Card className="bg-white border-gray-200 p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Fetched Companies Data</h4>
          <div className="space-y-4">
            {Object.entries(alphabetDataMap).map(([letter, companies]) => (
              <div key={letter} className="border border-gray-200 rounded-lg p-4">
                <h5 className="text-md font-semibold text-gray-800 mb-2">
                  Alphabet {letter} ({companies.length} companies)
                </h5>
                {companies.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
                    {companies.map((company, index) => (
                      <div key={`${letter}-${index}`} className="bg-gray-50 p-2 rounded border">
                        <div className="font-medium text-gray-900">{company.companyName}</div>
                        <div className="text-gray-600 text-xs">{company.instrumentKey}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No companies found for alphabet {letter}</p>
                )}
              </div>
            ))}
          </div>
        </Card>
      ))}
  
    </div>
  );
}

export default function AdminActionsPage() {
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [isRedeploying, setIsRedeploying] = useState<boolean>(false);
  const [isRedeployed, setIsRedeployed] = useState<boolean>(false);

  const handleSidebarItemClick = (section: string) => {
    setActiveSection(section);
  };

  // Reset redeploy states on component mount (page reload)
  useEffect(() => {
    setIsRedeploying(false);
    setIsRedeployed(false);
  }, []);

  // Health check function
  const checkHealthStatus = async (): Promise<boolean> => {
    try {
      const response = await axios.get('https://algo-horizon.store/api/admin/health-check/check', {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 200) {
        const result = await response.data;
        return result.trim() === 'Health Check Done';
      }
      return false;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  };

  // Polling function to check health status
  const pollHealthCheck = async () => {
    const maxAttempts = 60; // Maximum 5 minutes (60 attempts * 5 seconds)
    let attempts = 0;

    const poll = async () => {
      attempts++;
      
      try {
        const isHealthy = await checkHealthStatus();
        
        if (isHealthy) {
          setIsRedeploying(false);
          setIsRedeployed(true);
          toast.success('Server redeployed successfully and is healthy!');
          return;
        }
        
        if (attempts >= maxAttempts) {
          setIsRedeploying(false);
          toast.error('Health check timeout. Please verify server status manually.');
          return;
        }
        
        // Continue polling every 5 seconds
        setTimeout(poll, 5000);
        
      } catch (error) {
        console.error('Health check polling error:', error);
        if (attempts >= maxAttempts) {
          setIsRedeploying(false);
          toast.error('Health check failed. Please verify server status manually.');
        } else {
          setTimeout(poll, 5000);
        }
      }
    };

    // Start polling after initial delay to allow server to start redeploying
    setTimeout(poll, 10000); // Wait 10 seconds before first health check
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'highs-lows':
        return <HighsAndLowsInterface />;
      case 'highs-lows-import':
        return (
          <Card className="bg-gray-800 border-gray-700 p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">High's & Low's Import</h3>
            <p className="text-gray-400">Import functionality will be implemented here. You can upload a CSV or configure remote import settings.</p>
          </Card>
        );
      case 'recalculate':
        return (
          <Card className="bg-gray-800 border-gray-700 p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Recalculate Data</h3>
            <p className="text-gray-400">Recalculation functionality will be implemented here.</p>
          </Card>
        );
      case 'crucial-actions':
        return (
          <Card className="bg-gray-800 border-gray-700 p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Crucial Actions</h3>
            <p className="text-gray-400 mb-4">Dangerous operations. Use with caution.</p>
            
            {/* Status indicator */}
            {isRedeploying && (
              <div className="mb-4 p-3 bg-yellow-100 border border-yellow-300 rounded-md">
                <div className="flex items-center">
                  <span className="inline-block mr-2 h-4 w-4 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin"></span>
                  <span className="text-yellow-800 text-sm font-medium">
                    Redeploying server and monitoring health status...
                  </span>
                </div>
                <p className="text-yellow-700 text-xs mt-1">
                  This may take a few minutes. The button will change to "Redeployed" once the health check passes.
                </p>
              </div>
            )}
            
            {isRedeployed && (
              <div className="mb-4 p-3 bg-green-100 border border-green-300 rounded-md">
                <div className="flex items-center">
                  <span className="inline-block mr-2 h-4 w-4 text-green-600">✓</span>
                  <span className="text-green-800 text-sm font-medium">
                    Server successfully redeployed and health check passed!
                  </span>
                </div>
                <p className="text-green-700 text-xs mt-1">
                  The server is now running the latest version and responding to health checks.
                </p>
              </div>
            )}
            
            <div className="flex items-center gap-3">
              <button
                className={`px-4 py-2 rounded-md text-white ${
                  (() => {
                    if (isRedeploying) return 'bg-yellow-500 cursor-not-allowed';
                    if (isRedeployed) return 'bg-green-600 cursor-not-allowed';
                    return 'bg-rose-600 hover:bg-rose-700';
                  })()
                }`}
                onClick={async () => {
                  if (isRedeploying || isRedeployed) return;
                  
                  const confirmed = window.confirm('Are you sure you want to redeploy the server? This may cause downtime.');
                  if (!confirmed) return;
                  
                  try {
                    setIsRedeploying(true);
                    setIsRedeployed(false);
                    
                    const res = await axios.post('https://algo-horizon.store/api/admin/redeploy', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                    });
                    
                    if (res.status !== 200) {
                      const text = res.data ? JSON.stringify(res.data) : `Status ${res.status}`;
                      throw new Error(text);
                    }
                    
                    toast.success('Redeploy triggered successfully. Monitoring health status...');
                    
                    // Start health check polling
                    await pollHealthCheck();
                    
                  } catch (err) {
                    console.error('Redeploy failed:', err);
                    toast.error('Failed to trigger redeploy');
                    setIsRedeploying(false);
                  }
                }}
                disabled={isRedeploying || isRedeployed}
              >
                {(() => {
                  if (isRedeploying) {
                    return (
                      <>
                        <span className="inline-block mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        {' '}Redeploying...
                      </>
                    );
                  }
                  if (isRedeployed) {
                    return (
                      <>
                        <span className="inline-block mr-2 h-4 w-4 text-white">✓</span>
                        {' '}Redeployed
                      </>
                    );
                  }
                  return 'Redeploy Server';
                })()}
              </button>
              
              {/* Reset button - only show when redeployed */}
              {isRedeployed && (
                <button
                  className="px-3 py-2 rounded-md text-gray-600 bg-gray-200 hover:bg-gray-300 text-sm"
                  onClick={() => {
                    setIsRedeployed(false);
                    setIsRedeploying(false);
                  }}
                >
                  Reset
                </button>
              )}
            </div>
          </Card>
        );
      case 'add-gmail':
        return (
          <Card className="bg-gray-800 border-gray-700 p-6">
            <h3 className="text-xl font-semibold text-gray-300 mb-4 flex items-center gap-2">
              <Mail className="h-6 w-6" />
              Gmail Integration
            </h3>
            <div className="bg-gray-700 p-4 rounded-lg">
              <h4 className="text-lg font-medium text-white mb-2">Add Gmail Account</h4>
              <p className="text-gray-300 text-sm mb-4">
                Configure Gmail integration for automated notifications and email alerts.
              </p>
              
              <div className="space-y-4">
                <div>
                  <Label className="text-white text-sm">User Name</Label>
                  <input
                    type="text"
                    placeholder="Enter user name"
                    className="w-full mt-1 px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <Label className="text-white text-sm">Email Address</Label>
                  <input
                    type="email"
                    placeholder="Enter email address"
                    className="w-full mt-1 px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="flex gap-3 pt-4">
                  <Button className="bg-green-600 hover:bg-green-700">
                    Save Gmail Account
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        );
      default:
        return (
          <div className="text-center py-20">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Admin Actions Panel</h2>
            <p className="text-gray-400 mb-4">Select an action from the sidebar to get started</p>
            <p className="text-sm text-gray-500">Choose from Recalculations or Data Insertion options</p>
          </div>
        );
    }
  };

  return (
    <SidebarProvider>
      <Toaster position="top-right" />
      <AdminActionsSidebar onItemClick={handleSidebarItemClick} />
      <SidebarInset>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          {/* Header with sidebar trigger */}
          <div className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <div className="h-4 w-px bg-sidebar-border" />
              <h1 className="text-2xl font-bold text-gray-900">Admin Actions</h1>
            </div>
          </div>

          {/* Main content area */}
          <div className="flex flex-1 flex-col gap-4 p-4">
            <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 p-4">
              {renderContent()}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
