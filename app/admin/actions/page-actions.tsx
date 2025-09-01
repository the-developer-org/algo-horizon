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
  const [timeframeYears, setTimeframeYears] = useState<string>("");
  const [isSelectAll, setIsSelectAll] = useState(false);

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

  const handleFetchHighsAndLows = () => {
    if (selectedAlphabets.length === 0) {
      alert("Please select at least one alphabet");
      return;
    }
    if (!timeframeYears) {
      alert("Please select a timeframe");
      return;
    }
    
    console.log("Fetching High's & Low's for:", {
      alphabets: selectedAlphabets,
      years: timeframeYears
    });
    
    // Implement your fetch logic here - API call to fetch high's and low's data
    alert(`Fetching High's & Low's for ${selectedAlphabets.length} alphabet(s) over ${timeframeYears} year(s)`);
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
            <Select value={timeframeYears} onValueChange={setTimeframeYears}>
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
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Fetch High's & Low's
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
