import React from 'react'
import Link from 'next/link'
import { Code, Key, Zap } from 'lucide-react'

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <nav className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-blue-600">
            API Services
          </Link>
          <div className="flex gap-6 items-center">
            <Link href="/pricing" className="text-gray-700 hover:text-blue-600">
              Pricing
            </Link>
            <Link href="/login" className="px-4 py-2 text-blue-600">
              Login
            </Link>
          </div>
        </nav>
      </header>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow p-8 mb-8">
            <h1 className="text-3xl font-bold mb-4">API Documentation</h1>
            <p className="text-gray-600 mb-6">
              Welcome to API Services Platform documentation. Our APIs provide instant access to Vehicle RC, 
              Driving Licence, and Challan verification data with industry-leading performance.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-4 bg-blue-50 rounded">
                {React.createElement(Zap, { className: "w-6 h-6 text-blue-600" })}
                <div>
                  <div className="font-semibold">&lt; 500ms</div>
                  <div className="text-sm text-gray-600">Response Time</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-green-50 rounded">
                {React.createElement(Code, { className: "w-6 h-6 text-green-600" })}
                <div>
                  <div className="font-semibold">REST API</div>
                  <div className="text-sm text-gray-600">JSON Format</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-purple-50 rounded">
                {React.createElement(Key, { className: "w-6 h-6 text-purple-600" })}
                <div>
                  <div className="font-semibold">API Key</div>
                  <div className="text-sm text-gray-600">Simple Auth</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-8 mb-8">
            <h2 className="text-2xl font-bold mb-4">Authentication</h2>
            <p className="text-gray-600 mb-4">
              All API requests require an API key. Include your API key in the <code className="bg-gray-100 px-2 py-1 rounded">X-API-Key</code> header.
            </p>
            <pre className="bg-gray-900 text-gray-100 p-4 rounded overflow-x-auto">
              <code>{`curl -X POST https://api.apiservices.com/api/v1/rc \\
  -H "X-API-Key: your_api_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{"reg_no": "TR02ACXXXX"}'`}</code>
            </pre>
          </div>

          <div className="bg-white rounded-lg shadow p-8 mb-8">
            <h2 className="text-2xl font-bold mb-4">RC Verification API</h2>
            <p className="text-gray-600 mb-4">
              Verify vehicle registration certificate details including owner information, insurance, permits, and compliance status.
            </p>
            
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Endpoint</h3>
              <code className="bg-gray-100 px-3 py-1 rounded">POST /api/v1/rc</code>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Request Body</h3>
              <pre className="bg-gray-900 text-gray-100 p-4 rounded overflow-x-auto">
                <code>{JSON.stringify({ reg_no: "TR02ACXXXX" }, null, 2)}</code>
              </pre>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Response (40+ fields)</h3>
              <pre className="bg-gray-900 text-gray-100 p-4 rounded overflow-x-auto text-sm">
                <code>{`{
  "success": true,
  "status": 1,
  "data": {
    "regNo": "TR02ACXXXX",
    "status": "ACTIVE",
    "ownerName": "Owner Name",
    "vehicleClass": "Goods Carrier(MGV)",
    "maker": "TATA MOTORS LTD",
    "fuelType": "DIESEL",
    "insCompany": "New India Assurance",
    "insUpto": "2024-01-20",
    // ... 30+ more fields
  },
  "message": "Vehicle data fetched successfully"
}`}</code>
              </pre>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-8 mb-8">
            <h2 className="text-2xl font-bold mb-4">Licence Verification API</h2>
            <p className="text-gray-600 mb-4">
              Verify driving licence details including personal information, photo, validity, and vehicle class coverage.
            </p>
            
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Endpoint</h3>
              <code className="bg-gray-100 px-3 py-1 rounded">POST /api/v1/licence</code>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Request Body</h3>
              <pre className="bg-gray-900 text-gray-100 p-4 rounded overflow-x-auto">
                <code>{JSON.stringify({ dl_no: "GJ0520210012345", dob: "1996-11-15" }, null, 2)}</code>
              </pre>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Response</h3>
              <pre className="bg-gray-900 text-gray-100 p-4 rounded overflow-x-auto text-sm">
                <code>{`{
  "errorcd": 1,
  "bioObj": {
    "bioFullName": "Full Name",
    "bioDob": "15-Nov-1996",
    "bioGenderDesc": "Male",
    "bioBloodGroupname": "B+",
    // ... more bio fields
  },
  "dlobj": {
    "dlStatus": "Active",
    "dlIssuedt": "17-Jul-2015",
    "dlNtValdtoDt": "16-Jul-2035",
    // ... more DL fields
  },
  "dlcovs": [
    {
      "covdesc": "Motor Cycle with Gear",
      "covabbrv": "MCWG",
      "dcCovStatus": "A"
    }
  ]
}`}</code>
              </pre>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-8 mb-8">
            <h2 className="text-2xl font-bold mb-4">Challan Details API</h2>
            <p className="text-gray-600 mb-4">
              Get comprehensive challan/violation records including paid, pending, and court challans with offense details.
            </p>
            
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Endpoint</h3>
              <code className="bg-gray-100 px-3 py-1 rounded">POST /api/v1/challan</code>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Request Body</h3>
              <pre className="bg-gray-900 text-gray-100 p-4 rounded overflow-x-auto">
                <code>{JSON.stringify({ vehicle_no: "UP44BD0599" }, null, 2)}</code>
              </pre>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Response</h3>
              <pre className="bg-gray-900 text-gray-100 p-4 rounded overflow-x-auto text-sm">
                <code>{`{
  "success": true,
  "status": 1,
  "data": {
    "paidChallans": { "count": 2, "data": [...] },
    "pendingChallans": { "count": 1, "data": [...] },
    "physicalCourtChallans": { "count": 0, "data": [] },
    "virtualCourtChallans": { "count": 0, "data": [] }
  }
}`}</code>
              </pre>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-8">
            <h2 className="text-2xl font-bold mb-4">Rate Limits</h2>
            <p className="text-gray-600 mb-4">
              Default rate limit is 100 requests per minute per API key. Enterprise plans can request custom rate limits.
            </p>
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <p className="text-sm">
                <strong>Note:</strong> If you exceed your rate limit, you&apos;ll receive a <code className="bg-yellow-100 px-1 rounded">429 Too Many Requests</code> response.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
