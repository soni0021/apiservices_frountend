'use client'

import React, { useState } from 'react'
import axios from 'axios'
import { Play, Copy, Check, AlertCircle, Loader } from 'lucide-react'

interface ApiEndpoint {
  id: string
  name: string
  description: string
  endpoint: string
  method: 'POST' | 'GET'
  fields: Array<{
    name: string
    label: string
    type: 'text' | 'number' | 'date'
    required: boolean
    placeholder?: string
    example?: string
  }>
}

const API_ENDPOINTS: ApiEndpoint[] = [
  {
    id: 'vehicle-rc-verification',
    name: 'Vehicle RC Verification',
    description: 'Verify vehicle registration certificate details',
    endpoint: '/api/v1/services/vehicle-rc-verification',
    method: 'POST',
    fields: [
      {
        name: 'reg_no',
        label: 'Registration Number',
        type: 'text',
        required: true,
        placeholder: 'TR02AC1234',
        example: 'TR02AC1234'
      }
    ]
  },
  {
    id: 'driving-licence',
    name: 'Driving License API',
    description: 'Verify driving licence details',
    endpoint: '/api/v1/services/driving-licence',
    method: 'POST',
    fields: [
      {
        name: 'dl_no',
        label: 'Driving Licence Number',
        type: 'text',
        required: true,
        placeholder: 'GJ0520210012345',
        example: 'GJ0520210012345'
      },
      {
        name: 'dob',
        label: 'Date of Birth',
        type: 'date',
        required: true,
        placeholder: '1996-11-15',
        example: '1996-11-15'
      }
    ]
  },
  {
    id: 'challan-detail',
    name: 'Challan Detail API',
    description: 'Get vehicle challan/violation details',
    endpoint: '/api/v1/services/challan-detail',
    method: 'POST',
    fields: [
      {
        name: 'vehicle_no',
        label: 'Vehicle Number',
        type: 'text',
        required: true,
        placeholder: 'UP44BD0599',
        example: 'UP44BD0599'
      }
    ]
  },
  {
    id: 'rc-to-mobile',
    name: 'RC to Mobile Number',
    description: 'Get mobile number from vehicle registration',
    endpoint: '/api/v1/services/rc-to-mobile',
    method: 'POST',
    fields: [
      {
        name: 'reg_no',
        label: 'Registration Number',
        type: 'text',
        required: true,
        placeholder: 'TR02AC1234',
        example: 'TR02AC1234'
      }
    ]
  },
  {
    id: 'pan-verification',
    name: 'PAN Verification',
    description: 'Verify PAN card details',
    endpoint: '/api/v1/services/pan-verification',
    method: 'POST',
    fields: [
      {
        name: 'pan_number',
        label: 'PAN Number',
        type: 'text',
        required: true,
        placeholder: 'ABCDE1234F',
        example: 'ABCDE1234F'
      }
    ]
  },
  {
    id: 'gst-verification',
    name: 'GST Verification (Advance)',
    description: 'Verify GST details',
    endpoint: '/api/v1/services/gst-verification',
    method: 'POST',
    fields: [
      {
        name: 'gstin',
        label: 'GSTIN',
        type: 'text',
        required: true,
        placeholder: '27ABCDE1234F1Z5',
        example: '27ABCDE1234F1Z5'
      }
    ]
  }
]

interface ApiTesterProps {
  apiKey: string
}

export default function ApiTester({ apiKey }: ApiTesterProps) {
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>(API_ENDPOINTS[0].id)
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [response, setResponse] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const currentEndpoint = API_ENDPOINTS.find(e => e.id === selectedEndpoint)!

  const handleFieldChange = (fieldName: string, value: string) => {
    setFormData({ ...formData, [fieldName]: value })
    setError(null)
    setResponse(null)
  }

  const fillExample = () => {
    const exampleData: Record<string, string> = {}
    currentEndpoint.fields.forEach(field => {
      if (field.example) {
        exampleData[field.name] = field.example
      }
    })
    setFormData(exampleData)
  }

  const handleTest = async () => {
    setLoading(true)
    setError(null)
    setResponse(null)

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const url = `${apiUrl}${currentEndpoint.endpoint}`

      const payload: Record<string, any> = {}
      currentEndpoint.fields.forEach(field => {
        if (formData[field.name]) {
          payload[field.name] = formData[field.name]
        }
      })

      const response = await axios.post(url, payload, {
        headers: {
          'X-API-Key': apiKey,
          'Content-Type': 'application/json'
        }
      })

      setResponse(response.data)
    } catch (err: any) {
      setError(
        err.response?.data?.detail || 
        err.message || 
        'An error occurred while testing the API'
      )
      if (err.response?.data) {
        setResponse(err.response.data)
      }
    } finally {
      setLoading(false)
    }
  }

  const copyResponse = () => {
    if (response) {
      navigator.clipboard.writeText(JSON.stringify(response, null, 2))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const isFormValid = () => {
    return currentEndpoint.fields.every(field => {
      if (field.required) {
        return formData[field.name] && formData[field.name].trim() !== ''
      }
      return true
    })
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b">
        <h2 className="text-xl font-bold mb-2">API Testing</h2>
        <p className="text-sm text-gray-600">
          Test your API endpoints with real requests. Select an endpoint and fill in the required fields.
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* API Key Display */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-900">Using API Key:</p>
              <code className="text-xs text-blue-700 mt-1 block break-all">{apiKey}</code>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(apiKey)
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
              }}
              className="p-2 hover:bg-blue-100 rounded"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <Copy className="w-4 h-4 text-blue-600" />
              )}
            </button>
          </div>
        </div>

        {/* Endpoint Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select API Endpoint
          </label>
          <select
            value={selectedEndpoint}
            onChange={(e) => {
              setSelectedEndpoint(e.target.value)
              setFormData({})
              setResponse(null)
              setError(null)
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
            style={{ color: '#111827' }}
          >
            {API_ENDPOINTS.map(endpoint => (
              <option key={endpoint.id} value={endpoint.id} style={{ color: '#111827' }}>
                {endpoint.name} - {endpoint.description}
              </option>
            ))}
          </select>
        </div>

        {/* Endpoint Info */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-sm font-semibold text-gray-900">{currentEndpoint.name}</p>
              <p className="text-xs text-gray-600 mt-1">{currentEndpoint.description}</p>
            </div>
            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded">
              {currentEndpoint.method}
            </span>
          </div>
          <code className="text-xs text-gray-600">
            {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}{currentEndpoint.endpoint}
          </code>
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700">
              Request Parameters
            </label>
            <button
              onClick={fillExample}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              Fill Example
            </button>
          </div>

          {currentEndpoint.fields.map(field => (
            <div key={field.name}>
              <label htmlFor={field.name} className="block text-sm font-medium text-gray-700 mb-2">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              <input
                id={field.name}
                type={field.type === 'date' ? 'date' : 'text'}
                value={formData[field.name] || ''}
                onChange={(e) => handleFieldChange(field.name, e.target.value)}
                placeholder={field.placeholder}
                required={field.required}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                style={{ color: '#111827' }}
              />
              {field.example && (
                <p className="text-xs text-gray-500 mt-1">
                  Example: {field.example}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Test Button */}
        <button
          onClick={handleTest}
          disabled={loading || !isFormValid()}
          className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader className="w-5 h-5 animate-spin" />
              Testing...
            </>
          ) : (
            <>
              <Play className="w-5 h-5" />
              Test API
            </>
          )}
        </button>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-900">Error</p>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Response Display */}
        {response && (
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 flex items-center justify-between border-b">
              <p className="text-sm font-semibold text-gray-900">Response</p>
              <button
                onClick={copyResponse}
                className="flex items-center gap-2 text-xs text-gray-600 hover:text-gray-900"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-green-600" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy
                  </>
                )}
              </button>
            </div>
            <pre className="p-4 bg-gray-50 text-black text-xs overflow-x-auto max-h-96 overflow-y-auto border border-gray-200">
              {JSON.stringify(response, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}

