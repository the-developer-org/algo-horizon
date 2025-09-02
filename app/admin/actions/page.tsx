"use client";

import React, { useState } from 'react';
import { Calculator, Database } from "lucide-react";
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
import { fetchKeyMapping } from "@/utils/apiUtils";
import { fetchUpstoxCombinedData, fetchUpstoxHistoricalData } from "@/components/utils/upstoxApi";
import { calculateSwingPointsFromCandles, parseTimestampToUnix } from "@/utils/swingPointCalculator";

// Generate all alphabets A-Z
const alphabets = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));

// Admin actions sidebar component with Recalculations and Data Insertion sections
function AdminActionsSidebar({ onItemClick, ...props }: { onItemClick: (section: string) => void } & React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarContent>
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
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

// High's & Low's Component
function HighsAndLowsInterface() {
  const [selectedAlphabets, setSelectedAlphabets] = useState<string[]>([]);
  const [timeframeYears, setTimeframeYears] = useState<number>(1);
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

  const processingSteps = [
    "Fetching company data from KeyMapping",
    "Organizing companies by alphabets",
    "Processing companies alphabet by alphabet",
    "Calculating swing points and highs/lows",
    `Saving processed data to backend ${batchProgress}`,
    "Process completed successfully"
  ];

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

  // Helper function to calculate date range
    const calculateDateRangeDynamic = (yearsBack : number) => {
    const today = new Date();
    const toDate = today.toISOString().split('T')[0]; // Today's date in YYYY-MM-DD format

    const fromDateObj = new Date(today);
    fromDateObj.setFullYear(fromDateObj.getFullYear() - yearsBack); // X years back
    const fromDate = fromDateObj.toISOString().split('T')[0];

    return { fromDate, toDate };
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
      console.log(`✅ Batch of ${processedData.length} companies saved to backend:`, result);
      return result;
    } catch (error) {
      console.error('❌ Error saving batch to backend:', error);
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

    // Start processing
    setIsProcessing(true);
    setCurrentStep(0);
    setCompletedSteps([]);
    setProcessedCount(0);
    setTotalCount(0);
    setCurrentCompany("");
    setCurrentAlphabet("");
    setProcessedAlphabets([]);
    setAlphabetDataMap({});
    setSavedCount(0);
    setTotalToSave(0);
    setCurrentAlphabetCount(0);
    setCurrentAlphabetProcessed(0);
    setBatchProgress("");

    console.log("Starting High's & Low's processing for:", {
      alphabets: selectedAlphabets,
      years: timeframeYears
    });

    try {

      // Step 1: Fetch KeyMapping data from API
      setCurrentStep(0);
      const keyMapping = await fetchKeyMapping();
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
            instrumentKey,
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
      setTotalCount(totalCompanies);
      setTotalToSave(totalCompanies); // Initialize save tracking

      // Step 3: Process companies alphabet by alphabet
      setCurrentStep(2);
      const { fromDate, toDate } = calculateDateRangeDynamic(timeframeYears);
  
      let allprocessedDataLength: number = 0;
      let processedCounter = 0;

      console.log(`📊 Processing ${totalCompanies} companies with date range: ${fromDate} to ${toDate}`);

      // Process each alphabet separately
      for (const [letter, companies] of Object.entries(filteredData)) {
        if (companies.length === 0) continue;
        
        // Set current alphabet and update display
        setCurrentAlphabet(letter);
        setCurrentAlphabetCount(companies.length);
        setCurrentAlphabetProcessed(0);
        setAlphabetDataMap({ [letter]: companies });
        
        console.log(`🔄 Starting Alphabet ${letter} with ${companies.length} companies`);

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
            console.log(`🔄 Processing ${company.companyName} (${company.instrumentKey})`);

            // Fetch data for multiple timeframes sequentially
            // 1 day candles (3 years of daily data) - no limit
            const dailyData = await fetchUpstoxHistoricalData(
              company.instrumentKey,
              'days',
              '1',
              toDate,
              fromDate
            );

            // Helper function to fetch hourly data in 3-month chunks
            const fetchHourlyDataInChunks = async (interval: string) => {
              const chunks = [];
              let currentFromDate = new Date(fromDate);
              const endDate = new Date(toDate);
              
              while (currentFromDate < endDate) {
                // Calculate 3 months from current date
                const chunkToDate = new Date(currentFromDate);
                chunkToDate.setMonth(chunkToDate.getMonth() + 3);
                
                // Don't exceed the original end date
                if (chunkToDate > endDate) {
                  chunkToDate.setTime(endDate.getTime());
                }
                
                const chunkFromStr = currentFromDate.toISOString().split('T')[0];
                const chunkToStr = chunkToDate.toISOString().split('T')[0];
                
                console.log(`🔄 Fetching ${interval}H data for ${company.companyName}: ${chunkFromStr} to ${chunkToStr}`);
                
                try {
                  const chunkData = await fetchUpstoxHistoricalData(
                    company.instrumentKey,
                    'hours',
                    interval,
                    chunkToStr,
                    chunkFromStr
                  );
                  
                  if (chunkData.candles && chunkData.candles.length > 0) {
                    chunks.push(...chunkData.candles);
                  }
                  
                  // Small delay between chunk requests
                  await new Promise(resolve => setTimeout(resolve, 200));
                } catch (error) {
                  console.error(`❌ Error fetching ${interval}H chunk for ${company.companyName}:`, error);
                }
                
                // Move to next chunk (add 1 day to avoid overlap)
                currentFromDate = new Date(chunkToDate);
                currentFromDate.setDate(currentFromDate.getDate() + 1);
              }
              
              return { candles: chunks };
            };

            // 4 hour candles (3 years of 4-hour data in 3-month chunks)
            const hourly4Data = await fetchHourlyDataInChunks('4');

            // 1 hour candles (3 years of 1-hour data in 3-month chunks)
            const hourly1Data = await fetchHourlyDataInChunks('1');

            // Check if we have data from at least one timeframe
            if (
              (dailyData.candles && dailyData.candles.length > 0) ||
              (hourly4Data.candles && hourly4Data.candles.length > 0) ||
              (hourly1Data.candles && hourly1Data.candles.length > 0)
            ) {

              // Step 4: Calculate swing points for each timeframe
              const swingPointsDay = dailyData.candles && dailyData.candles.length > 0
                ? calculateSwingPointsFromCandles(dailyData.candles, 5)
                : [];

              const swingPoints4H = hourly4Data.candles && hourly4Data.candles.length > 0
                ? calculateSwingPointsFromCandles(hourly4Data.candles, 5)
                : [];

              const swingPoints1H = hourly1Data.candles && hourly1Data.candles.length > 0
                ? calculateSwingPointsFromCandles(hourly1Data.candles, 5)
                : [];

                setCompletedSteps([0, 1, 2, 3]);
              const processedCompany = {
                instrumentKey: company.instrumentKey,
                companyName: company.companyName,
                timeframe: timeframeYears,
                // Swing points for different timeframes
                swingPointsDay: swingPointsDay.map(sp => ({
                  timestamp: sp.timestamp,
                  price: sp.price,
                  label: sp.label,
                  time: sp.time
                })),
                swingPoints4H: swingPoints4H.map(sp => ({
                  timestamp: sp.timestamp,
                  price: sp.price,
                  label: sp.label,
                  time: sp.time
                })),
                swingPoints1H: swingPoints1H.map(sp => ({
                  timestamp: sp.timestamp,
                  price: sp.price,
                  label: sp.label,
                  time: sp.time
                })),
              };
               batchProcessedData.push(processedCompany);
               batchCounter++;


              if (batchCounter >= 10 || batchCounter + (currentIteration * 10) === companies.length) {
                  currentIteration++;

                // Step 5: Save batch with progress tracking
                try {
                  // Update batch progress before saving
                  const currentSaved = (currentIteration - 1) * 10 + batchProcessedData.length;
                  setBatchProgress(`(${currentSaved}/${companies.length})`);
                  
                  await saveToBackend(batchProcessedData);
            
                  setSavedCount(prev => prev + batchProcessedData.length);
                  allprocessedDataLength += batchProcessedData.length;
                  console.log(`✅ Successfully saved batch of ${batchProcessedData.length} companies to backend`);
                } catch (error) {
                  console.error(`❌ Error saving batch to backend:`, error);
                } finally {
                    batchCounter = 0;
                    batchProcessedData.length = 0;
                }
              } 
            } else {
              console.warn(`⚠️ No historical data found for ${company.companyName}`);
            }

            // Small delay to prevent API rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));

          } catch (error) {
            console.error(`❌ Error processing ${company.companyName}:`, error);
            // Continue with next company even if one fails
          }

          processedCounter++;
          alphabetCounter++;
        }
        
        // Mark this alphabet as completed ONLY after all companies are processed
        setProcessedAlphabets(prev => [...prev, letter]);
        console.log(`✅ Completed processing Alphabet ${letter} - processed ${alphabetCounter} companies`);
        
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

      console.log(`🎉 Processing complete! Processed ${allprocessedDataLength} companies successfully.`);
      console.log(`Successfully processed ${allprocessedDataLength} companies with highs, lows, and swing points!`);

    } catch (error) {
      console.error("❌ Error during processing:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.log(`Processing failed: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
      setCurrentStep(-1);
      setCurrentCompany("");
      setCurrentAlphabet("");
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gray-800 border-gray-700 p-6">
        <h3 className="text-xl font-semibold text-grey-900 mb-4">High's & Low's Data Fetcher</h3>

        {/* Select All and Timeframe Controls */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
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
        </div>

        {/* Selected Count */}
        <div className="mb-4">
          <span className="text-gray-400 text-sm">
            Selected: {selectedAlphabets.length} of {alphabets.length} alphabets
          </span>
        </div>

        {/* Alphabet Grid */}
        <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-13 gap-3">
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
      </Card>

      {/* Selected Alphabets Display */}
      {selectedAlphabets.length > 0 && (
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
      )}

      {/* Progress Tracking Card */}
      {(isProcessing || completedSteps.length > 0) && (
        <Card className="bg-white border-gray-200 p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Processing Steps</h4>

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
      {Object.keys(alphabetDataMap).length > 0 && (
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
      )}
    </div>
  );
}

export default function AdminActionsPage() {
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const handleSidebarItemClick = (section: string) => {
    setActiveSection(section);
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'highs-lows':
        return <HighsAndLowsInterface />;
      case 'recalculate':
        return (
          <Card className="bg-gray-800 border-gray-700 p-6">
            <h3 className="text-xl font-semibold text-white mb-4">Recalculate Data</h3>
            <p className="text-gray-400">Recalculation functionality will be implemented here.</p>
          </Card>
        );
      default:
        return (
          <div className="text-center py-20">
            <h2 className="text-xl font-semibold text-white mb-4">Admin Actions Panel</h2>
            <p className="text-gray-400 mb-4">Select an action from the sidebar to get started</p>
            <p className="text-sm text-gray-500">Choose from Recalculations or Data Insertion options</p>
          </div>
        );
    }
  };

  return (
    <SidebarProvider>
      <AdminActionsSidebar onItemClick={handleSidebarItemClick} />
      <SidebarInset>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          {/* Header with sidebar trigger */}
          <div className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <div className="h-4 w-px bg-sidebar-border" />
              <h1 className="text-2xl font-bold text-white">Admin Actions</h1>
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
