import Link from 'next/link';

export default function TestNavigationPage() {
  const testLinks = [
    {
      name: 'TCS Chart - 1d',
      href: '/chart?instrumentKey=NSE_EQ%7CINE467B01029&timeframe=1d',
      description: 'Navigate to TCS chart with 1-day timeframe'
    },
    {
      name: 'RELIANCE Chart - 1h', 
      href: '/chart?instrumentKey=NSE_EQ%7CINE002A01018&timeframe=1h',
      description: 'Navigate to Reliance chart with 1-hour timeframe'
    },
    {
      name: 'INFY Chart - 5m',
      href: '/chart?instrumentKey=NSE_EQ%7CINE009A01021&timeframe=5m', 
      description: 'Navigate to Infosys chart with 5-minute timeframe'
    },
    {
      name: 'Invalid Instrument Key Test',
      href: '/chart?instrumentKey=INVALID_KEY&timeframe=1d',
      description: 'Test error handling with invalid instrument key'
    },
    {
      name: 'Invalid Timeframe Test',
      href: '/chart?instrumentKey=NSE_EQ%7CINE467B01029&timeframe=invalid',
      description: 'Test error handling with invalid timeframe'
    }
  ];

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center">URL Parameter Test Navigation</h1>
      
      <div className="mb-8">
        <p className="text-gray-600 mb-4">
          Click the links below to test the URL parameter functionality for the OHLC Chart page.
          The chart should automatically load with the specified company and timeframe.
        </p>
      </div>

      <div className="space-y-4">
        {testLinks.map((link, index) => (
          <div key={index} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
            <Link 
              href={link.href}
              className="text-blue-600 hover:text-blue-800 font-semibold text-lg block mb-2"
            >
              {link.name}
            </Link>
            <p className="text-gray-600 text-sm mb-2">{link.description}</p>
            <p className="text-xs text-gray-400 font-mono bg-gray-100 p-2 rounded">
              {link.href}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h2 className="text-lg font-semibold text-blue-800 mb-2">How to Use:</h2>
        <ol className="list-decimal list-inside text-sm text-blue-700 space-y-1">
          <li>Make sure you have configured your Upstox API key first</li>
          <li>Click any of the test links above</li>
          <li>The chart page should auto-load with the specified company and timeframe</li>
          <li>Check the browser URL to see the parameters</li>
          <li>Try changing the company or timeframe - URL should update automatically</li>
        </ol>
      </div>

      <div className="mt-8 text-center">
        <Link 
          href="/chart" 
          className="bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600 transition-colors"
        >
          Go to Chart Page (No Parameters)
        </Link>
      </div>
    </div>
  );
}