import React from 'react'
import Link from 'next/link'
import { CheckCircle, Zap, Shield, Clock } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <header className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <nav className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="text-2xl font-bold text-blue-600">
            API Services
          </div>
          <div className="flex gap-6 items-center">
            <Link href="/pricing" className="text-gray-700 hover:text-blue-600">
              Pricing
            </Link>
            <Link href="/docs" className="text-gray-700 hover:text-blue-600">
              Docs
            </Link>
            <Link 
              href="/login" 
              className="px-4 py-2 text-blue-600 hover:text-blue-700"
            >
              Login
            </Link>
            <Link 
              href="/register" 
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Get Started
            </Link>
          </div>
        </nav>
      </header>

      <section className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          Powerful Verification APIs
          <br />
          <span className="text-blue-600">For Modern Applications</span>
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Instant access to Vehicle RC, Driving Licence, and Challan data with 
          lightning-fast response times and 99.9% uptime guarantee.
        </p>
        <div className="flex gap-4 justify-center">
          <Link 
            href="/register"
            className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-lg font-semibold"
          >
            Start Building Free
          </Link>
          <Link 
            href="/docs"
            className="px-8 py-3 border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 text-lg font-semibold"
          >
            View Documentation
          </Link>
        </div>
        
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto">
          <div>
            <div className="text-4xl font-bold text-blue-600">&lt; 500ms</div>
            <div className="text-gray-600 mt-2">Response Time</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-blue-600">99.9%</div>
            <div className="text-gray-600 mt-2">Uptime SLA</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-blue-600">3 APIs</div>
            <div className="text-gray-600 mt-2">Fallback Sources</div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center mb-12">
          Why Choose Our Platform?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            {
              icon: React.createElement(Zap, { className: "w-8 h-8" }),
              title: 'Lightning Fast',
              description: 'Average response time under 500ms with parallel API fallback system'
            },
            {
              icon: React.createElement(Shield, { className: "w-8 h-8" }),
              title: 'Highly Reliable',
              description: '99.9% uptime with redundant data sources and automatic failover'
            },
            {
              icon: React.createElement(Clock, { className: "w-8 h-8" }),
              title: 'Always Fresh',
              description: 'Configurable data freshness rules ensure you get the latest information'
            },
            {
              icon: React.createElement(CheckCircle, { className: "w-8 h-8" }),
              title: 'Easy Integration',
              description: 'Simple REST API with comprehensive documentation and SDKs'
            }
          ].map((feature, index) => (
            <div key={index} className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition">
              <div className="text-blue-600 mb-4">{feature.icon}</div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-gray-50 py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">
            Available APIs
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                title: 'RC Verification',
                description: '40+ data points including owner details, insurance, permits, and compliance status',
                endpoint: 'POST /api/v1/rc'
              },
              {
                title: 'Licence Verification',
                description: 'Complete driving licence information with photo, validity, and vehicle class coverage',
                endpoint: 'POST /api/v1/licence'
              },
              {
                title: 'Challan Details',
                description: 'Comprehensive challan records including paid, pending, and court challans with offences',
                endpoint: 'POST /api/v1/challan'
              }
            ].map((api, index) => (
              <div key={index} className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold mb-3">{api.title}</h3>
                <p className="text-gray-600 mb-4">{api.description}</p>
                <code className="text-sm bg-gray-100 px-2 py-1 rounded">{api.endpoint}</code>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-3xl font-bold mb-6">
          Ready to Get Started?
        </h2>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Start building with our APIs today. No credit card required for the first 50k calls.
        </p>
        <Link 
          href="/register"
          className="inline-block px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-lg font-semibold"
        >
          Create Free Account
        </Link>
      </section>

      <footer className="border-t bg-gray-50 py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="text-xl font-bold text-blue-600 mb-4">API Services</div>
              <p className="text-gray-600 text-sm">
                Enterprise-grade verification APIs for modern applications
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Products</h4>
              <ul className="space-y-2 text-gray-600 text-sm">
                <li>RC Verification API</li>
                <li>Licence Verification API</li>
                <li>Challan Details API</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-gray-600 text-sm">
                <li><Link href="/docs">Documentation</Link></li>
                <li><Link href="/pricing">Pricing</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-600 text-sm">
                <li>About Us</li>
                <li>Privacy Policy</li>
                <li>Terms of Service</li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t text-center text-gray-600 text-sm">
            © 2024 API Services Platform. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
