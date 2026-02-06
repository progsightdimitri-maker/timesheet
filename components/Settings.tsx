import React from 'react';
import { Save, Globe, Coins } from 'lucide-react';
import { AppSettings } from '../types';
import { Button } from './Button';

interface SettingsProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
}

const CURRENCIES = [
  { code: 'USD', locale: 'en-US', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', locale: 'fr-FR', symbol: '€', name: 'Euro' },
  { code: 'GBP', locale: 'en-GB', symbol: '£', name: 'British Pound' },
  { code: 'CAD', locale: 'en-CA', symbol: 'CA$', name: 'Canadian Dollar' },
  { code: 'JPY', locale: 'ja-JP', symbol: '¥', name: 'Japanese Yen' },
];

export const Settings: React.FC<SettingsProps> = ({ settings, onUpdateSettings }) => {
  
  const handleCurrencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedCode = e.target.value;
    const currencyData = CURRENCIES.find(c => c.code === selectedCode);
    
    if (currencyData) {
      onUpdateSettings({
        ...settings,
        currency: currencyData.code,
        currencyLocale: currencyData.locale
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
        <p className="text-gray-500">Manage your workspace preferences.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        
        {/* Section: Regional & Currency */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Coins className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-medium text-gray-900 mb-1">Currency & Format</h3>
              <p className="text-sm text-gray-500 mb-4">
                Choose the currency used for project rates and reports.
              </p>
              
              <div className="max-w-sm">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Default Currency
                </label>
                <select
                  value={settings.currency}
                  onChange={handleCurrencyChange}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2.5 bg-white"
                >
                  {CURRENCIES.map(c => (
                    <option key={c.code} value={c.code}>
                      {c.code} - {c.name} ({c.symbol})
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-gray-400">
                  Changing this will update the currency symbol across all reports and project settings.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Section: Placeholder for future settings */}
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-gray-50 text-gray-600 rounded-lg">
              <Globe className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-medium text-gray-900 mb-1">Language</h3>
              <p className="text-sm text-gray-500 mb-4">
                The application interface language.
              </p>
               <div className="max-w-sm">
                 <select disabled className="block w-full rounded-md border-gray-300 bg-gray-50 text-gray-500 cursor-not-allowed shadow-sm sm:text-sm border p-2.5">
                   <option>English (Default)</option>
                   <option>Français (Coming soon)</option>
                 </select>
               </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="bg-gray-50 px-6 py-4 flex justify-end">
           {/* Auto-save is implemented, but we can show a button for UX if needed */}
           <span className="text-xs text-gray-400 italic flex items-center">
             <Save className="w-3 h-3 mr-1" /> Preferences are saved automatically
           </span>
        </div>

      </div>
    </div>
  );
};
