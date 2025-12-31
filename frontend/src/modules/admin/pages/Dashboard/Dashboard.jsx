import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminAPI } from '../../services/api'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts'

const Dashboard = () => {
  const navigate = useNavigate()
  const [stats, setStats] = useState({
    students: 0,
    teachers: 0,
    classes: 0,
    subjects: 0,
    courses: 0,
    quizzes: 0,
    subscriptions: 0,
    activeSubscriptions: 0,
    activeStudents: 0,
    activeTeachers: 0,
    activeClasses: 0,
    totalRevenue: 0,
    totalPayments: 0,
    revenueData: [],
    studentData: [],
    recentTransactions: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDashboardStatistics = async () => {
      try {
        setLoading(true)
        const response = await adminAPI.getDashboardStatistics()
        if (response.success && response.data?.statistics) {
          setStats(response.data.statistics)
        }
      } catch (err) {
        console.error('Error fetching dashboard statistics:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardStatistics()
  }, [])

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 sm:px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-bold text-[#1e3a5f]">Dashboard Overview</h1>
          <div className="text-sm text-gray-500 hidden sm:block">
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        </div>
      </header>

      <div className="p-4 sm:p-6 space-y-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 min-h-[60vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1e3a5f]"></div>
            <p className="mt-4 text-gray-600 font-medium">Loading analytics...</p>
          </div>
        ) : (
          <>
            {/* KPI Cards Row 1: Financial & Growth */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Revenue */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Revenue</p>
                    <h3 className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(stats.totalRevenue || 0)}</h3>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="flex items-center text-xs text-green-600 font-medium">
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  <span>{stats.totalPayments} total transactions</span>
                </div>
              </div>

              {/* Active Students */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/admin/students')}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Active Students</p>
                    <h3 className="text-2xl font-bold text-gray-900 mt-1">{stats.activeStudents}</h3>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  <span className="font-medium text-gray-900">{stats.students}</span> registered total
                </div>
              </div>

              {/* Active Subscriptions */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/admin/subscriptions')}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Active Subscriptions</p>
                    <h3 className="text-2xl font-bold text-gray-900 mt-1">{stats.activeSubscriptions}</h3>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-orange-50 flex items-center justify-center text-orange-600">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  Total subscriptions issued: <span className="font-medium text-gray-900">{stats.totalSubscriptions}</span>
                </div>
              </div>

              {/* Active Teachers */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/admin/teachers')}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Teachers</p>
                    <h3 className="text-2xl font-bold text-gray-900 mt-1">{stats.activeTeachers}</h3>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  <span className="font-medium text-gray-900">{stats.teachers}</span> total staff members
                </div>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Revenue Trend Chart */}
              <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-1 h-6 bg-green-500 rounded-full block"></span>
                  Revenue Trend (Last 6 Months)
                </h3>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats.revenueData}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22c55e" stopOpacity={0.1} />
                          <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(value) => `₹${value / 1000}k`} />
                      <Tooltip
                        formatter={(value) => [`₹${value.toLocaleString()}`, 'Revenue']}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Area type="monotone" dataKey="revenue" stroke="#22c55e" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" dot={{ r: 4, fill: '#22c55e', strokeWidth: 2, stroke: '#fff' }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Student Registration Chart */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-1 h-6 bg-blue-500 rounded-full block"></span>
                  Student Growth
                </h3>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.studentData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                      <Tooltip
                        cursor={{ fill: '#f1f5f9' }}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Bar dataKey="students" name="New Students" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={32} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Bottom Row: Recent Transactions & Content Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Recent Transactions List */}
              <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <span className="w-1 h-6 bg-[#1e3a5f] rounded-full block"></span>
                    Recent Transactions
                  </h3>
                  <button
                    onClick={() => navigate('/admin/transactions')}
                    className="text-sm text-blue-600 font-medium hover:text-blue-800 transition-colors"
                  >
                    View All
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                      <tr>
                        <th className="px-5 py-3 font-medium">Student</th>
                        <th className="px-5 py-3 font-medium">Plan</th>
                        <th className="px-5 py-3 font-medium">Date</th>
                        <th className="px-5 py-3 font-medium text-right">Amount</th>
                        <th className="px-5 py-3 font-medium text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {stats.recentTransactions?.length > 0 ? (
                        stats.recentTransactions.map((tx) => (
                          <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-5 py-3">
                              <span className="text-sm font-medium text-gray-900 block">{tx.studentName}</span>
                            </td>
                            <td className="px-5 py-3 text-sm text-gray-600">{tx.planName}</td>
                            <td className="px-5 py-3 text-sm text-gray-500">{formatDate(tx.date)}</td>
                            <td className="px-5 py-3 text-sm font-bold text-gray-900 text-right">{formatCurrency(tx.amount)}</td>
                            <td className="px-5 py-3 text-center">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                {tx.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="5" className="px-5 py-8 text-center text-gray-500 text-sm">
                            No recent transactions found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Content Quick Stats */}
              <div className="space-y-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Content Library</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-100 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                        </div>
                        <span className="font-medium text-gray-700">Courses</span>
                      </div>
                      <span className="text-lg font-bold text-gray-900">{stats.courses}</span>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-100 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-pink-100 text-pink-600 rounded-lg">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                          </svg>
                        </div>
                        <span className="font-medium text-gray-700">Quizzes</span>
                      </div>
                      <span className="text-lg font-bold text-gray-900">{stats.quizzes}</span>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-100 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-teal-100 text-teal-600 rounded-lg">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                        </div>
                        <span className="font-medium text-gray-700">Classes</span>
                      </div>
                      <span className="text-lg font-bold text-gray-900">{stats.classes}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-[#1e3a5f] to-[#2a4a6f] rounded-xl shadow-md p-5 text-white">
                  <h3 className="text-lg font-bold mb-2">Quick Actions</h3>
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <button
                      onClick={() => navigate('/admin/students/add')}
                      className="bg-white/10 hover:bg-white/20 transition-colors py-2 px-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                      Add Student
                    </button>
                    <button
                      onClick={() => navigate('/admin/teachers/add')}
                      className="bg-white/10 hover:bg-white/20 transition-colors py-2 px-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                      Add Teacher
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default Dashboard
