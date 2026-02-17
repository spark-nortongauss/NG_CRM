"use client";

import { useState, useRef, useEffect } from "react";
import { SlidersHorizontal, Plus, Minus, X, ChevronDown, ChevronUp } from "lucide-react";

export interface ColumnConfig {
  key: string;
  label: string;
  width?: string;
  render?: (value: any, row: any) => React.ReactNode;
}

interface ColumnCustomizerProps {
  allColumns: ColumnConfig[];
  defaultColumns: string[];
  visibleColumns: string[];
  onColumnsChange: (columns: string[]) => void;
  storageKey: string;
}

export function ColumnCustomizer({
  allColumns,
  defaultColumns,
  visibleColumns,
  onColumnsChange,
  storageKey,
}: ColumnCustomizerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showAddSection, setShowAddSection] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowAddSection(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset add section when main dropdown closes
  useEffect(() => {
    if (!isOpen) {
      setShowAddSection(false);
    }
  }, [isOpen]);

  const activeColumns = allColumns.filter((col) => visibleColumns.includes(col.key));
  const availableColumns = allColumns.filter((col) => !visibleColumns.includes(col.key));

  const handleAddColumn = (columnKey: string) => {
    const newColumns = [...visibleColumns, columnKey];
    onColumnsChange(newColumns);
    localStorage.setItem(storageKey, JSON.stringify(newColumns));
  };

  const handleRemoveColumn = (columnKey: string) => {
    // Prevent removing all columns - keep at least one
    if (visibleColumns.length <= 1) return;
    
    const newColumns = visibleColumns.filter((key) => key !== columnKey);
    onColumnsChange(newColumns);
    localStorage.setItem(storageKey, JSON.stringify(newColumns));
  };

  const handleResetToDefault = () => {
    onColumnsChange(defaultColumns);
    localStorage.setItem(storageKey, JSON.stringify(defaultColumns));
    setShowAddSection(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
          isOpen
            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
            : "border-gray-300 dark:border-ng-dark-elevated bg-white dark:bg-ng-dark-card text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-ng-dark-hover"
        }`}
      >
        <SlidersHorizontal className="h-4 w-4" />
        Columns
        <span className="rounded-full bg-gray-200 dark:bg-ng-dark-elevated px-2 py-0.5 text-xs">
          {visibleColumns.length}
        </span>
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-2 w-72 rounded-lg border border-gray-300 dark:border-ng-dark-elevated bg-white dark:bg-ng-dark-card shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-300 dark:border-ng-dark-elevated px-4 py-3">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Customize Columns</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-full p-1 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-ng-dark-elevated hover:text-gray-600 dark:hover:text-gray-400"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {/* Visible Columns Section */}
            <div className="p-3">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Visible Columns ({activeColumns.length})
              </span>
              <div className="space-y-1">
                {activeColumns.map((column) => (
                  <div
                    key={column.key}
                    className="flex items-center justify-between rounded-md px-3 py-2 bg-gray-50 dark:bg-ng-dark-bg hover:bg-gray-100 dark:hover:bg-ng-dark-elevated transition-colors"
                  >
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {column.label}
                    </span>
                    <button
                      onClick={() => handleRemoveColumn(column.key)}
                      disabled={visibleColumns.length <= 1}
                      className={`rounded-full p-1.5 transition-colors ${
                        visibleColumns.length <= 1
                          ? "text-gray-300 dark:text-gray-600 cursor-not-allowed"
                          : "text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-700 dark:hover:text-red-300"
                      }`}
                      title={visibleColumns.length <= 1 ? "Cannot remove last column" : "Remove column"}
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Add Columns Button / Section */}
            {availableColumns.length > 0 && (
              <div className="border-t border-gray-300 dark:border-ng-dark-elevated">
                {/* Add Columns Toggle Button */}
                <button
                  onClick={() => setShowAddSection(!showAddSection)}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    <span>Add Columns</span>
                    <span className="rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 text-xs">
                      {availableColumns.length}
                    </span>
                  </div>
                  {showAddSection ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>

                {/* Available Columns (shown when Add Columns is clicked) */}
                {showAddSection && (
                  <div className="px-3 pb-3 space-y-1 border-t border-gray-300 dark:border-ng-dark-elevated bg-blue-50/30 dark:bg-blue-900/20">
                    <span className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 pt-3 pb-1">
                      Available Columns
                    </span>
                    {availableColumns.map((column) => (
                      <button
                        key={column.key}
                        onClick={() => handleAddColumn(column.key)}
                        className="w-full flex items-center justify-between rounded-md px-3 py-2 bg-white dark:bg-ng-dark-card hover:bg-green-50 dark:hover:bg-green-900/20 border border-gray-200 dark:border-ng-dark-elevated hover:border-green-300 dark:hover:border-green-700 transition-colors text-left"
                      >
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {column.label}
                        </span>
                        <div className="rounded-full p-1 text-green-600 dark:text-green-400">
                          <Plus className="h-4 w-4" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-300 dark:border-ng-dark-elevated bg-gray-50 dark:bg-ng-dark-bg px-4 py-2 rounded-b-lg">
            <button
              onClick={handleResetToDefault}
              className="w-full text-center text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:underline py-1"
            >
              Reset to Default
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Hook to manage column visibility with localStorage persistence
export function useColumnVisibility(
  storageKey: string,
  defaultColumns: string[]
): [string[], (columns: string[]) => void] {
  const [visibleColumns, setVisibleColumns] = useState<string[]>(defaultColumns);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setVisibleColumns(parsed);
        }
      } catch (e) {
        // Invalid JSON, use defaults
        console.error("Failed to parse stored columns:", e);
      }
    }
  }, [storageKey]);

  return [visibleColumns, setVisibleColumns];
}
