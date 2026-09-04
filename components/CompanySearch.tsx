import React, { useMemo, useState } from "react";

type CompanySearchProps = Readonly<{
  keyMapping: Record<string, string>;
  label?: string;
  placeholder?: string;
  error?: string;
  className?: string;
  inputClassName?: string;
  onSelect: (companyName: string, instrumentKey: string) => void;
}>;

export default function CompanySearch({
  keyMapping,
  label = "Company Name",
  placeholder = "Search for a company...",
  error,
  className = "",
  inputClassName = "",
  onSelect,
}: CompanySearchProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCompany, setSelectedCompany] = useState("");

  const suggestions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return [];

    return Object.keys(keyMapping)
      .filter((companyName) => companyName.toLowerCase().includes(term))
      .slice(0, 8);
  }, [keyMapping, searchTerm]);

  const handleSelect = (companyName: string) => {
    const instrumentKey = keyMapping[companyName] || "";
    setSelectedCompany(companyName);
    setSearchTerm(companyName);
    onSelect(companyName, instrumentKey);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <label htmlFor="companySearch" className="block text-sm font-medium text-gray-700">
        {label}
      </label>

      <div className="relative">
        <input
          id="companySearch"
          type="text"
          value={searchTerm}
          placeholder={placeholder}
          onChange={(e) => {
            const value = e.target.value;
            setSearchTerm(value);

            if (!value) {
              setSelectedCompany("");
            }
          }}
          className={[
            "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100",
            error ? "border-red-500" : "",
            inputClassName,
          ].join(" ")}
        />

        {suggestions.length > 0 && !selectedCompany && (
          <ul className="absolute z-50 mt-1 w-full overflow-auto rounded-md border border-gray-300 bg-white shadow-lg max-h-60">
            {suggestions.map((name) => (
              <li key={name}>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-100"
                  onClick={() => handleSelect(name)}
                >
                  {name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {selectedCompany && (
        <div className="text-sm text-gray-500">
          Selected: <span className="font-semibold text-gray-700">{selectedCompany}</span>
        </div>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
