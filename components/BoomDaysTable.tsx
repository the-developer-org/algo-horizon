"use client";

import React, { useState } from 'react';
import { BackTest } from './types/backtest';

interface BoomDaysTableProps {
  data: BackTest[];
  stockName: string;
  avgVolume?: number;
}

export const BoomDaysTable: React.FC<BoomDaysTableProps> = ({ data, stockName, avgVolume = 0 }) => {
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Calculate stats
  const totalTrades = data.length;
  const successfulTrades = data.filter(item => item.status === 'SUCCESS').length;
  const failedTrades = totalTrades - successfulTrades;
  const successRate = totalTrades > 0 ? (successfulTrades / totalTrades) * 100 : 0;
  
  // Calculate average profit/loss
  const profits = data
    .filter(item => item.exitPrice && item.entryPrice)
    .map(item => (item.exitPrice - item.entryPrice) / item.entryPrice * 100);
  const averageProfit = profits.length > 0 
    ? profits.reduce((sum, profit) => sum + profit, 0) / profits.length 
    : 0;
    
  // No need to calculate peak volume as it's displayed in the UI directly
  
  // Calculate pagination
  const totalPages = Math.ceil(data.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = data.slice(indexOfFirstItem, indexOfLastItem);
  
  // Handle page changes
  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  // Generate array of page numbers for pagination with ellipsis when there are many pages
  const getPageNumbers = () => {
    const maxPageButtons = 5; // Maximum number of page buttons to show
    
    if (totalPages <= maxPageButtons) {
      // If total pages are less than or equal to max buttons, show all pages
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    
    // Calculate the range to show
    const leftSiblingIndex = Math.max(currentPage - 1, 1);
    const rightSiblingIndex = Math.min(currentPage + 1, totalPages);
    
    // Should show dots for left/right
    const shouldShowLeftDots = leftSiblingIndex > 2;
    const shouldShowRightDots = rightSiblingIndex < totalPages - 1;
    
    // Basic case when current page is close to start
    if (!shouldShowLeftDots && shouldShowRightDots) {
      const leftRange = Array.from({ length: 3 }, (_, i) => i + 1);
      return [...leftRange, 'ellipsis', totalPages];
    }
    
    // Basic case when current page is close to end
    if (shouldShowLeftDots && !shouldShowRightDots) {
      const rightRange = Array.from({ length: 3 }, (_, i) => totalPages - 2 + i);
      return [1, 'ellipsis', ...rightRange];
    }
    
    // Case when current page is somewhere in middle
    if (shouldShowLeftDots && shouldShowRightDots) {
      const middleRange = [leftSiblingIndex, currentPage, rightSiblingIndex];
      return [1, 'ellipsis', ...middleRange, 'ellipsis', totalPages];
    }
    
    // Fallback: show first, last and current page
    return [1, 'ellipsis', currentPage, 'ellipsis', totalPages];
  };
  
  const pageNumbers = getPageNumbers();

  return (
    <div className="w-full shadow-md rounded-lg">
      <div className="mb-6 p-4 bg-gray-100 rounded-lg">
        <h2 className="text-2xl font-bold mb-4 text-center">{stockName} Boom Days Analysis</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white p-3 rounded shadow border-l-4 border-blue-500 text-center">
            <div className="text-gray-500">Total Trades</div>
            <div className="text-xl font-bold">{totalTrades}</div>
          </div>
          <div className="bg-white p-3 rounded shadow border-l-4 border-green-500 text-center">
            <div className="text-gray-500">Success Rate</div>
            <div className="text-xl font-bold">{successRate.toFixed(2)}%</div>
          </div>
          <div className="bg-white p-3 rounded shadow border-l-4 border-yellow-500 text-center">
            <div className="text-gray-500">Avg. Profit/Loss</div>
            <div className={`text-xl font-bold ${averageProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {averageProfit.toFixed(2)}%
            </div>
          </div>
          <div className="bg-white p-3 rounded shadow border-l-4 border-purple-500 text-center">
            <div className="text-gray-500">Successful/Failed</div>
            <div className="text-xl font-bold">
              <span className="text-green-600">{successfulTrades}</span>
              {" / "}
              <span className="text-red-600">{failedTrades}</span>
            </div>
          </div>
          <div className="bg-white p-3 rounded shadow border-l-4 border-orange-500 text-center">
            <div className="text-gray-500">10x Avg Volume</div>
            <div className="text-xl font-bold">
              {(() => {
                if (!avgVolume) return 'N/A';
                const peak = avgVolume * 10;
                return `${(peak / 1000).toFixed(1)}K`;
              })()}
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="overflow-y-auto" style={{ maxHeight: 'unset' }}>
          <table className="min-w-full bg-white rounded-lg overflow-hidden border border-gray-200">
            <thead className="bg-gradient-to-r from-gray-800 to-gray-700 text-white sticky top-0 z-10">
              <tr>
                <th className="py-3 px-4 text-center align-middle border-r border-gray-700">#</th>
                <th className="py-3 px-4 text-center align-middle border-r border-gray-700">Boom Day</th>
                <th className="py-3 px-4 text-center align-middle border-r border-gray-700">Entry Time</th>
                <th className="py-3 px-4 text-center align-middle border-r border-gray-700">Exit Time</th>
                <th className="py-3 px-4 text-center align-middle border-r border-gray-700">Entry Price</th>
                <th className="py-3 px-4 text-center align-middle border-r border-gray-700">Exit Price</th>
                <th className="py-3 px-4 text-center align-middle border-r border-gray-700">Days Taken</th>
                <th className="py-3 px-4 text-center align-middle border-r border-gray-700">Avg. Vol. Crossed</th>
                <th className="py-3 px-4 text-center align-middle border-r border-gray-700">Boom Volume</th>
                <th className="py-3 px-4 text-center align-middle border-r border-gray-700">Status</th>
                <th className="py-3 px-4 text-center align-middle">P/L %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {currentItems.map((item, index) => {
                // Calculate profit/loss percentage
                const profitLoss = item.exitPrice && item.entryPrice 
                  ? ((item.exitPrice - item.entryPrice) / item.entryPrice) * 100
                  : null;
                  
                // Calculate the serial number based on pagination
                const serialNumber = indexOfFirstItem + index + 1;

                return (
                  <tr key={`${item.boomDay}-${item.entryTime}-${index}`} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                    <td className="py-3 px-4 text-center align-middle border-r border-gray-200 font-semibold">{serialNumber}</td>
                    <td className="py-3 px-4 text-center align-middle border-r border-gray-200">{new Date(item.boomDay).toLocaleDateString()}</td>
                    <td className="py-3 px-4 text-center align-middle border-r border-gray-200">{item.entryTime|| 'N/A'}</td>
                    <td className="py-3 px-4 text-center align-middle border-r border-gray-200">{item.exitTime || 'N/A'}</td>
                    <td className="py-3 px-4 text-center align-middle border-r border-gray-200">${item.entryPrice?.toFixed(2) || 'N/A'}</td>
                    <td className="py-3 px-4 text-center align-middle border-r border-gray-200">${item.exitPrice?.toFixed(2) || 'N/A'}</td>
                    <td className="py-3 px-4 text-center align-middle border-r border-gray-200">{item.timeTaken || 'N/A'}</td>
                    <td className="py-3 px-4 text-center align-middle border-r border-gray-200">{item.volumeExceptions?.toFixed(0) || 'N/A'}</td>
                    <td className="py-3 px-4 text-center align-middle border-r border-gray-200">
                      {(() => {
                        if (!item.boomDayVolume) return 'N/A';
                        return `${(item.boomDayVolume / 1000).toFixed(1)}K`;
                      })()}
                    </td>
                    <td className={`py-3 px-4 text-center align-middle border-r border-gray-200 font-semibold ${
                      item.status === 'SUCCESS' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {item.status || 'PENDING'}
                    </td>
                    <td className={`py-3 px-4 text-center align-middle font-semibold ${
                      profitLoss !== null && profitLoss > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {profitLoss !== null ? `${profitLoss.toFixed(2)}%` : 'N/A'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-6">
          <nav className="flex items-center">
            <button 
              onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className={`px-4 py-2 border rounded-l-md ${
                currentPage === 1 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Previous
            </button>
            
            <div className="hidden sm:flex">
              {pageNumbers.map((number, i) => 
                number === 'ellipsis' ? (
                  <span 
                    key={`ellipsis-${i === 0 ? 'left' : 'right'}`}
                    className="px-4 py-2 border-t border-b border-r bg-white text-gray-400"
                  >
                    ...
                  </span>
                ) : (
                  <button
                    key={`page-${number}`}
                    onClick={() => handlePageChange(number as number)}
                    className={`px-4 py-2 border-t border-b border-r ${
                      currentPage === number
                      ? 'bg-blue-500 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {number}
                  </button>
                )
              )}
            </div>
            
            <div className="flex sm:hidden">
              <span className="px-4 py-2 border-t border-b border-r bg-gray-50">
                {currentPage} / {totalPages}
              </span>
            </div>
            
            <button 
              onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className={`px-4 py-2 border border-l-0 rounded-r-md ${
                currentPage === totalPages 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Next
            </button>
          </nav>
        </div>
      )}
      
      {data.length === 0 && (
        <div className="w-full p-8 text-center text-gray-500 border border-gray-200 rounded-lg">
          No boom days data available for this stock
        </div>
      )}
    </div>
  );
};
