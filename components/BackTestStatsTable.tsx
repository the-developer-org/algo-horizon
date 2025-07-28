"use client";

import React, { useState } from 'react';
import { BackTestStats } from './types/backtest-stats';

interface BackTestStatsTableProps {
  stats: BackTestStats[];
}

export const BackTestStatsTable: React.FC<BackTestStatsTableProps> = ({ stats }) => {
  // Sort stats by total boom days in descending order
  const sortedStats = [...stats].sort((a, b) => b.totalBoomDaysFound - a.totalBoomDaysFound);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  
  // Calculate totals for summary
  const totalCompanies = sortedStats.length;
  const totalBoomDays = sortedStats.reduce((sum, stat) => sum + stat.totalBoomDaysFound, 0);
  const totalProfits = sortedStats.reduce((sum, stat) => sum + stat.profitCount, 0);
  const totalLosses = sortedStats.reduce((sum, stat) => sum + stat.lossCount, 0);
  const successRate = totalProfits + totalLosses > 0 
    ? (totalProfits / (totalProfits + totalLosses) * 100).toFixed(2) 
    : '0.00';
    
  // Calculate pagination
  const totalPages = Math.ceil(sortedStats.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedStats.slice(indexOfFirstItem, indexOfLastItem);
  
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
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="mb-6 p-4 bg-gray-100 rounded-lg">
        <h2 className="text-xl font-bold mb-4 text-center">Backtest Statistics Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white p-3 rounded shadow border-l-4 border-blue-500 text-center">
            <div className="text-gray-500">Total Companies</div>
            <div className="text-xl font-bold">{totalCompanies}</div>
          </div>
          <div className="bg-white p-3 rounded shadow border-l-4 border-green-500 text-center">
            <div className="text-gray-500">Total Boom Days</div>
            <div className="text-xl font-bold">{totalBoomDays}</div>
          </div>
          <div className="bg-white p-3 rounded shadow border-l-4 border-yellow-500 text-center">
            <div className="text-gray-500">Total Profits</div>
            <div className="text-xl font-bold text-green-600">{totalProfits}</div>
          </div>
          <div className="bg-white p-3 rounded shadow border-l-4 border-red-500 text-center">
            <div className="text-gray-500">Total Losses</div>
            <div className="text-xl font-bold text-red-600">{totalLosses}</div>
          </div>
          <div className="bg-white p-3 rounded shadow border-l-4 border-purple-500 text-center">
            <div className="text-gray-500">Success Rate</div>
            <div className="text-xl font-bold">{successRate}%</div>
          </div>
        </div>
      </div>

      {/* Detailed stats table */}
      <div className="overflow-x-auto shadow-md rounded-lg">
        <div className="max-h-[65vh] overflow-y-auto">
          <table className="min-w-full bg-white rounded-lg overflow-hidden border border-gray-200">
            <thead className="bg-gradient-to-r from-gray-800 to-gray-700 text-white sticky top-0 z-10">
              <tr>
                <th className="py-3 px-4 text-center align-middle border-r border-gray-700">Company Name</th>
                <th className="py-3 px-4 text-center align-middle border-r border-gray-700">Total Boom Days</th>
                <th className="py-3 px-4 text-center align-middle border-r border-gray-700">Profit Count</th>
                <th className="py-3 px-4 text-center align-middle border-r border-gray-700">Loss Count</th>
                <th className="py-3 px-4 text-center align-middle border-r border-gray-700">Volume Exceptions</th>
                <th className="py-3 px-4 text-center align-middle border-r border-gray-700">Down Trend</th>
                <th className="py-3 px-4 text-center align-middle border-r border-gray-700">% Candles Missing</th>
                <th className="py-3 px-4 text-center align-middle">Avg Days for Profit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {currentItems.map((stat, index) => (
                <tr 
                  key={stat.companyName} 
                  className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}
                >
                  <td className="py-3 px-4 text-center align-middle border-r border-gray-200 font-medium">{stat.companyName}</td>
                  <td className="py-3 px-4 text-center align-middle border-r border-gray-200">{stat.totalBoomDaysFound}</td>
                  <td className="py-3 px-4 text-center align-middle border-r border-gray-200 text-green-600 font-semibold">{stat.profitCount}</td>
                  <td className="py-3 px-4 text-center align-middle border-r border-gray-200 text-red-600 font-semibold">{stat.lossCount}</td>
                  <td className="py-3 px-4 text-center align-middle border-r border-gray-200">{stat.volumeExceptionsCount}</td>
                  <td className="py-3 px-4 text-center align-middle border-r border-gray-200">{stat.isInDownTrend ? 'Yes' : 'No'}</td>
                  <td className="py-3 px-4 text-center align-middle border-r border-gray-200">{stat.percCandleMissing}%</td>
                  <td className="py-3 px-4 text-center align-middle">
                    {stat.avgTimeTakenForProfit > 0 ? `${stat.avgTimeTakenForProfit.toFixed(1)} days` : 'N/A'}
                  </td>
                </tr>
              ))}
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
      
      {sortedStats.length === 0 && (
        <div className="w-full p-8 text-center text-gray-500 border border-gray-200 rounded-lg">
          No backtest statistics available
        </div>
      )}
    </div>
  );
};
