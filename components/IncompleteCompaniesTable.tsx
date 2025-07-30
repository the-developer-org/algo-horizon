"use client";

import React from 'react';
import { SupportAndResistance } from './types/support-resistance';

interface IncompleteCompaniesTableProps {
  data: Record<string, SupportAndResistance>;
}

export const IncompleteCompaniesTable: React.FC<IncompleteCompaniesTableProps> = ({ data }) => {
  // Convert the record to an array of entries for easier manipulation
  const companies = Object.entries(data).map(([company, status]) => ({
    company,
    supportPresent: status.supportPresent,
    resistancePresent: status.resistancePresent
  }));
  
  // No need to pre-calculate statistics as we calculate them inline

  return (
    <div className="overflow-x-auto">
      <div className="bg-gray-100 p-3 mb-3 border-b-2 border-gray-700 flex justify-between items-center">
        <h2 className="text-xl font-bold">Incomplete Companies</h2>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-gray-700 text-white rounded-md font-medium">
            Total: {companies.length}
          </span>
          <span className="px-3 py-1 bg-red-600 text-white rounded-md text-sm">
            Missing Support: {companies.filter(item => !item.supportPresent).length}
          </span>
          <span className="px-3 py-1 bg-red-600 text-white rounded-md text-sm">
            Missing Resistance: {companies.filter(item => !item.resistancePresent).length}
          </span>
          <span className="px-3 py-1 bg-orange-600 text-white rounded-md text-sm">
            Missing Both: {companies.filter(item => !item.supportPresent && !item.resistancePresent).length}
          </span>
        </div>
      </div>
      <div className="overflow-y-auto" style={{ height: '700px', maxHeight: '900px' }}>
        <table className="min-w-full bg-white rounded-lg overflow-hidden border-8 border-gray-700 shadow-lg">
          <thead className="bg-gradient-to-r from-gray-800 to-gray-700 text-white sticky top-0 z-10">
            <tr>
              <th className="py-3 px-4 text-center align-middle border-r-2 border-gray-600">Company Name</th>
              <th className="py-3 px-4 text-center align-middle border-r-2 border-gray-600">Support Present</th>
              <th className="py-3 px-4 text-center align-middle">Resistance Present</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-300">
            {companies.map((item, index) => (
              <tr key={item.company} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white hover:bg-gray-100'}>
                <td className="py-3 px-4 text-left align-middle border-r border-gray-600 font-semibold">
                  {item.company}
                </td>
                <td className="py-3 px-4 text-center align-middle border-r border-gray-600">
                  <span className={`inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-medium ${
                    item.supportPresent 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {item.supportPresent ? 'Yes' : 'No'}
                  </span>
                </td>
                <td className="py-3 px-4 text-center align-middle">
                  <span className={`inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-medium ${
                    item.resistancePresent 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {item.resistancePresent ? 'Yes' : 'No'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {companies.length === 0 && (
        <div className="w-full p-8 text-center text-gray-500 border-4 border-gray-600 rounded-lg shadow-md">
          No incomplete companies data available.
        </div>
      )}
    </div>
  );
};
