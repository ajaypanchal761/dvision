import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { agentAPI } from '../../services/api'

const Agents = () => {
  const navigate = useNavigate()
  const [agents, setAgents] = useState([])
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [deleteAgentId, setDeleteAgentId] = useState(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingAgent, setEditingAgent] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    isActive: true
  })
  const [viewAgentModal, setViewAgentModal] = useState(false)
  const [viewingAgent, setViewingAgent] = useState(null)
  
  // Pagination state
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 1,
    total: 0,
    count: 0
  })
  
  // Statistics state
  const [statistics, setStatistics] = useState({
    totalAgents: 0,
    activeAgents: 0,
    inactiveAgents: 0
  })

  // Fetch agent statistics (independent of search/filters)
  const fetchStatistics = async () => {
    try {
      const response = await agentAPI.getStatistics()
      if (response.success && response.data?.statistics) {
        setStatistics({
          totalAgents: response.data.statistics.totalAgents || 0,
          activeAgents: response.data.statistics.activeAgents || 0,
          inactiveAgents: response.data.statistics.inactiveAgents || 0
        })
      }
    } catch (err) {
      console.error('Error fetching statistics:', err)
    }
  }

  // Fetch agents from backend
  const fetchAgents = async (page = 1) => {
    try {
      setIsLoading(true)
      setError('')
      const params = {
        page,
        limit: 10
      }
      if (searchTerm) params.search = searchTerm

      const response = await agentAPI.getAll(params)
      if (response.success && response.data?.agents) {
        setAgents(response.data.agents)
        
        // Update pagination
        setPagination({
          page: response.page || 1,
          pages: response.pages || 1,
          total: response.total || 0,
          count: response.count || 0
        })
      } else {
        setError('Failed to load agents')
      }
    } catch (err) {
      setError(err.message || 'Failed to load agents')
      console.error('Error fetching agents:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchStatistics() // Fetch statistics once on mount
    fetchAgents(1)
  }, [])

  // Debounced search - reset to page 1 when search changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm !== undefined) {
        fetchAgents(1)
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [searchTerm])
  
  // Handle page change
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      fetchAgents(newPage)
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    try {
      setError('')
      const response = await agentAPI.create({
        name: formData.name,
        phone: formData.phone,
        email: formData.email
      })
      if (response.success) {
        setSuccess('Agent created successfully!')
        setIsCreateModalOpen(false)
        setFormData({ 
          name: '', 
          phone: '', 
          email: '', 
          isActive: true
        })
        await fetchStatistics()
        await fetchAgents(1)
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(response.message || 'Failed to create agent')
      }
    } catch (err) {
      setError(err.message || 'Failed to create agent')
    }
  }

  const handleEdit = async (e) => {
    e.preventDefault()
    try {
      setError('')
      const response = await agentAPI.update(editingAgent._id, {
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        isActive: formData.isActive
      })
      if (response.success) {
        setSuccess('Agent updated successfully!')
        setIsEditModalOpen(false)
        setEditingAgent(null)
        setFormData({ 
          name: '', 
          phone: '', 
          email: '', 
          isActive: true
        })
        await fetchStatistics()
        await fetchAgents(pagination.page)
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(response.message || 'Failed to update agent')
      }
    } catch (err) {
      setError(err.message || 'Failed to update agent')
    }
  }

  const handleDeleteClick = (id) => {
    setDeleteAgentId(id)
    setIsDeleteModalOpen(true)
  }

  const handleDeleteConfirm = async () => {
    try {
      const response = await agentAPI.delete(deleteAgentId)
      if (response.success) {
        // Refresh statistics and agents list
        await fetchStatistics()
        await fetchAgents(pagination.page)
        setIsDeleteModalOpen(false)
        setDeleteAgentId(null)
        setSuccess('Agent deactivated successfully!')
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError('Failed to delete agent')
      }
    } catch (err) {
      setError(err.message || 'Failed to delete agent')
    }
  }

  const handleEditClick = (agent) => {
    setEditingAgent(agent)
    setFormData({
      name: agent.name || '',
      phone: agent.phone || '',
      email: agent.email || '',
      isActive: agent.isActive !== undefined ? agent.isActive : true
    })
    setIsEditModalOpen(true)
  }

  const handleViewClick = async (agent) => {
    try {
      const response = await agentAPI.getById(agent._id)
      if (response.success && response.data?.agent) {
        setViewingAgent(response.data.agent)
        setViewAgentModal(true)
      }
    } catch (err) {
      setError(err.message || 'Failed to load agent details')
    }
  }

  // No client-side filtering needed - backend handles search
  const filteredAgents = agents

  const getInitials = (name) => {
    if (!name) return 'AG'
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0)
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="px-4 sm:px-6 lg:px-8 pt-3 sm:pt-4 md:pt-5 lg:pt-6">
        {/* Header */}
        <div className="pb-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div>
              <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-white">Manage Agents</h1>
            </div>
            <button
              onClick={() => {
                setFormData({ 
                  name: '', 
                  phone: '', 
                  email: '', 
                  isActive: true
                })
                setIsCreateModalOpen(true)
              }}
              className="px-3 sm:px-4 md:px-5 lg:px-6 py-2 sm:py-2.5 md:py-3 bg-gradient-to-r from-[#1e3a5f] to-[#2a4a6f] hover:from-[#2a4a6f] hover:to-[#1e3a5f] text-white rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm md:text-base transition-all duration-200 flex items-center justify-center space-x-2 shadow-md hover:shadow-lg"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Create Agent</span>
            </button>
          </div>
        </div>

        {/* Success Message */}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-lg text-xs sm:text-sm mt-2 sm:mt-3">
            {success}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs sm:text-sm mt-2 sm:mt-3">
            {error}
          </div>
        )}

        {/* Stats Cards */}
        <div className="mt-3 sm:mt-4 md:mt-5 lg:mt-6">
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4 lg:gap-6">
            <div className="bg-white rounded-lg shadow-md p-2.5 sm:p-3 md:p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-gray-500 text-xs sm:text-sm font-medium">Total Agents</p>
                  <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 mt-0.5 sm:mt-1">{statistics.totalAgents}</p>
                </div>
                <div className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0 ml-2">
                  <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2v11a2 2 0 002 2zM12 10V4a2 2 0 00-2-2H6a2 2 0 00-2 2v16a2 2 0 002 2h6a2 2 0 002-2v-6a2 2 0 00-2-2z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-2.5 sm:p-3 md:p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-gray-500 text-xs sm:text-sm font-medium">Active Agents</p>
                  <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 mt-0.5 sm:mt-1">{statistics.activeAgents}</p>
                </div>
                <div className="h-7 w-7 sm:h-8 sm:w-8 md:h-10 md:w-10 lg:h-12 lg:w-12 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0 ml-2">
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-2.5 sm:p-3 md:p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-gray-500 text-xs sm:text-sm font-medium">Inactive Agents</p>
                  <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 mt-0.5 sm:mt-1">{statistics.inactiveAgents}</p>
                </div>
                <div className="h-7 w-7 sm:h-8 sm:w-8 md:h-10 md:w-10 lg:h-12 lg:w-12 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0 ml-2">
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-2.5 sm:p-3 md:p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-gray-500 text-xs sm:text-sm font-medium">Total Referrals</p>
                  <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 mt-0.5 sm:mt-1">
                    {agents.reduce((sum, a) => sum + (a.stats?.totalReferrals || 0), 0)}
                  </p>
                </div>
                <div className="h-7 w-7 sm:h-8 sm:w-8 md:h-10 md:w-10 lg:h-12 lg:w-12 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0 ml-2">
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Table Card */}
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden mt-3 sm:mt-4 md:mt-5 lg:mt-6">
          {/* Search Bar */}
          <div className="p-3 sm:p-4 border-b border-gray-200">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-4 w-4 sm:h-5 sm:w-5 text-[#1e3a5f]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search agents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 sm:pl-10 pr-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] outline-none transition-all duration-200 text-xs sm:text-sm text-gray-700 placeholder-gray-400"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="p-6 sm:p-8 md:p-10 text-center">
                <div className="inline-block animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-[#1e3a5f]"></div>
                <p className="mt-2 sm:mt-3 text-gray-500 text-xs sm:text-sm">Loading agents...</p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 sm:px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-2 sm:px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden sm:table-cell">
                      Email
                    </th>
                    <th className="px-2 sm:px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden md:table-cell">
                      Phone
                    </th>
                    <th className="px-2 sm:px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-2 sm:px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden lg:table-cell">
                      Referrals
                    </th>
                    <th className="px-2 sm:px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden lg:table-cell">
                      Subscriptions
                    </th>
                    <th className="px-2 sm:px-3 py-2 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {filteredAgents.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-3 sm:px-4 py-6 sm:py-8 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-gray-100 flex items-center justify-center mb-2 sm:mb-3">
                            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2v11a2 2 0 002 2zM12 10V4a2 2 0 00-2-2H6a2 2 0 00-2 2v16a2 2 0 002 2h6a2 2 0 002-2v-6a2 2 0 00-2-2z" />
                            </svg>
                          </div>
                          <p className="text-gray-500 font-medium text-xs sm:text-sm">{searchTerm ? 'No agents found matching your search.' : 'No agents found.'}</p>
                          <p className="text-gray-400 text-[10px] sm:text-xs mt-1">{searchTerm ? 'Try adjusting your search criteria.' : 'Click "Create Agent" to create one.'}</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredAgents.map((agent) => (
                      <tr key={agent._id} className="hover:bg-gray-50 transition-all duration-200">
                        <td className="px-2 sm:px-3 py-2 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-gradient-to-br from-[#1e3a5f] to-[#2a4a6f] flex items-center justify-center ring-2 ring-gray-200">
                              <span className="text-white font-semibold text-[10px] sm:text-xs">
                                {getInitials(agent.name)}
                              </span>
                            </div>
                            <div className="ml-2 sm:ml-3">
                              <div className="text-xs font-semibold text-gray-900">{agent.name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-2 sm:px-3 py-2 whitespace-nowrap hidden sm:table-cell">
                          <div className="text-xs text-gray-600 truncate max-w-[150px]">{agent.email || 'N/A'}</div>
                        </td>
                        <td className="px-2 sm:px-3 py-2 whitespace-nowrap hidden md:table-cell">
                          <div className="text-xs text-gray-600">{agent.phone}</div>
                        </td>
                        <td className="px-2 sm:px-3 py-2 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${agent.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                            }`}>
                            {agent.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-2 sm:px-3 py-2 whitespace-nowrap hidden lg:table-cell">
                          <div className="text-xs text-gray-600">{agent.stats?.totalReferrals || 0}</div>
                        </td>
                        <td className="px-2 sm:px-3 py-2 whitespace-nowrap hidden lg:table-cell">
                          <div className="text-xs text-gray-600">{agent.stats?.successfulSubscriptions || 0}</div>
                        </td>
                        <td className="px-2 sm:px-3 py-2 whitespace-nowrap text-right text-xs font-medium">
                          <div className="flex items-center justify-end space-x-1 sm:space-x-2">
                            <button
                              onClick={() => handleViewClick(agent)}
                              className="p-1.5 sm:p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                              title="View Details"
                            >
                              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => navigate(`/admin/agents/${agent._id}/referrals`)}
                              className="p-1.5 sm:p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-all duration-200"
                              title="View Referrals"
                            >
                              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleEditClick(agent)}
                              className="p-1.5 sm:p-2 text-[#1e3a5f] hover:bg-blue-50 rounded-lg transition-all duration-200"
                              title="Edit"
                            >
                              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeleteClick(agent._id)}
                              className="p-1.5 sm:p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                              title="Delete"
                            >
                              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
          
          {/* Pagination Controls */}
          {!isLoading && pagination.pages > 1 && (
            <div className="px-3 sm:px-4 py-3 sm:py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs sm:text-sm text-gray-600">
                Showing <span className="font-semibold">{((pagination.page - 1) * 10) + 1}</span> to{' '}
                <span className="font-semibold">
                  {Math.min(pagination.page * 10, pagination.total)}
                </span>{' '}
                of <span className="font-semibold">{pagination.total}</span> agents
              </div>
              <div className="flex items-center gap-1 sm:gap-2">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className={`px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg transition-all ${
                    pagination.page === 1
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-[#1e3a5f] text-white hover:bg-[#2a4a6f]'
                  }`}
                >
                  Previous
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                    let pageNum;
                    if (pagination.pages <= 5) {
                      pageNum = i + 1;
                    } else if (pagination.page <= 3) {
                      pageNum = i + 1;
                    } else if (pagination.page >= pagination.pages - 2) {
                      pageNum = pagination.pages - 4 + i;
                    } else {
                      pageNum = pagination.page - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg transition-all ${
                          pagination.page === pageNum
                            ? 'bg-[#1e3a5f] text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.pages}
                  className={`px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg transition-all ${
                    pagination.page === pagination.pages
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-[#1e3a5f] text-white hover:bg-[#2a4a6f]'
                  }`}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Agent Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-lg sm:rounded-xl md:rounded-2xl shadow-2xl max-w-md w-full transform transition-all">
            <div className="p-4 sm:p-6 md:p-8">
              <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Create Agent</h3>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] outline-none"
                    placeholder="Enter agent name"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Phone *</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] outline-none"
                    placeholder="Enter phone number with country code"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] outline-none"
                    placeholder="Enter email (optional)"
                  />
                </div>
                <div className="flex items-center justify-end space-x-3 sm:space-x-4 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreateModalOpen(false)
                      setFormData({ 
                        name: '', 
                        phone: '', 
                        email: '', 
                        isActive: true,
                        bankDetails: {
                          accountHolderName: '',
                          accountNumber: '',
                          ifscCode: '',
                          bankName: '',
                          branchName: ''
                        },
                        upiId: ''
                      })
                    }}
                    className="px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 md:py-3 border-2 border-gray-300 text-gray-700 rounded-lg sm:rounded-xl font-semibold text-sm sm:text-base hover:bg-gray-50 transition-all duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 md:py-3 bg-[#1e3a5f] hover:bg-[#2a4a6f] text-white rounded-lg sm:rounded-xl font-semibold text-sm sm:text-base transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Agent Modal */}
      {isEditModalOpen && editingAgent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-lg sm:rounded-xl md:rounded-2xl shadow-2xl max-w-md w-full transform transition-all">
            <div className="p-4 sm:p-6 md:p-8">
              <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Edit Agent</h3>
              <form onSubmit={handleEdit} className="space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Phone *</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] outline-none"
                  />
                </div>
                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="w-4 h-4 text-[#1e3a5f] border-gray-300 rounded focus:ring-[#1e3a5f]"
                    />
                    <span className="text-xs sm:text-sm font-medium text-gray-700">Active</span>
                  </label>
                </div>
                <div className="flex items-center justify-end space-x-3 sm:space-x-4 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditModalOpen(false)
                      setEditingAgent(null)
                      setFormData({ 
                        name: '', 
                        phone: '', 
                        email: '', 
                        isActive: true,
                        bankDetails: {
                          accountHolderName: '',
                          accountNumber: '',
                          ifscCode: '',
                          bankName: '',
                          branchName: ''
                        },
                        upiId: ''
                      })
                    }}
                    className="px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 md:py-3 border-2 border-gray-300 text-gray-700 rounded-lg sm:rounded-xl font-semibold text-sm sm:text-base hover:bg-gray-50 transition-all duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 md:py-3 bg-[#1e3a5f] hover:bg-[#2a4a6f] text-white rounded-lg sm:rounded-xl font-semibold text-sm sm:text-base transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    Update
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-lg sm:rounded-xl md:rounded-2xl shadow-2xl max-w-md w-full transform transition-all">
            <div className="p-4 sm:p-6 md:p-8">
              <div className="flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 mx-auto bg-red-100 rounded-xl sm:rounded-2xl mb-4 sm:mb-5 md:mb-6">
                <svg className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 text-center mb-2">
                Deactivate Agent
              </h3>
              <p className="text-sm sm:text-base text-gray-600 text-center mb-6 sm:mb-8">
                Are you sure you want to deactivate this agent? The agent will not be able to login.
              </p>
              <div className="flex items-center justify-center space-x-3 sm:space-x-4">
                <button
                  onClick={() => {
                    setIsDeleteModalOpen(false)
                    setDeleteAgentId(null)
                  }}
                  className="px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 md:py-3 border-2 border-gray-300 text-gray-700 rounded-lg sm:rounded-xl font-semibold text-sm sm:text-base hover:bg-gray-50 transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 md:py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg sm:rounded-xl font-semibold text-sm sm:text-base transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Deactivate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Agent Details Modal */}
      {viewAgentModal && viewingAgent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-lg sm:rounded-xl md:rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto transform transition-all">
            <div className="p-4 sm:p-6 md:p-8">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">Agent Details</h3>
                <button
                  onClick={() => {
                    setViewAgentModal(false)
                    setViewingAgent(null)
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4 sm:space-y-5">
                {/* Basic Information */}
                <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                  <h4 className="text-xs sm:text-sm font-semibold text-gray-700 mb-3">Basic Information</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] sm:text-xs text-gray-500 mb-1">Name</p>
                      <p className="text-xs sm:text-sm font-medium text-gray-900">{viewingAgent.name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] sm:text-xs text-gray-500 mb-1">Phone</p>
                      <p className="text-xs sm:text-sm font-medium text-gray-900">{viewingAgent.phone || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] sm:text-xs text-gray-500 mb-1">Email</p>
                      <p className="text-xs sm:text-sm font-medium text-gray-900">{viewingAgent.email || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] sm:text-xs text-gray-500 mb-1">Status</p>
                      <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${viewingAgent.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                        }`}>
                        {viewingAgent.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bank Details */}
                {viewingAgent.bankDetails && (viewingAgent.bankDetails.accountHolderName || viewingAgent.bankDetails.accountNumber) && (
                  <div className="bg-blue-50 rounded-lg p-3 sm:p-4">
                    <h4 className="text-xs sm:text-sm font-semibold text-gray-700 mb-3">Bank Details</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {viewingAgent.bankDetails.accountHolderName && (
                        <div>
                          <p className="text-[10px] sm:text-xs text-gray-500 mb-1">Account Holder Name</p>
                          <p className="text-xs sm:text-sm font-medium text-gray-900">{viewingAgent.bankDetails.accountHolderName}</p>
                        </div>
                      )}
                      {viewingAgent.bankDetails.accountNumber && (
                        <div>
                          <p className="text-[10px] sm:text-xs text-gray-500 mb-1">Account Number</p>
                          <p className="text-xs sm:text-sm font-medium text-gray-900">{viewingAgent.bankDetails.accountNumber}</p>
                        </div>
                      )}
                      {viewingAgent.bankDetails.ifscCode && (
                        <div>
                          <p className="text-[10px] sm:text-xs text-gray-500 mb-1">IFSC Code</p>
                          <p className="text-xs sm:text-sm font-medium text-gray-900">{viewingAgent.bankDetails.ifscCode}</p>
                        </div>
                      )}
                      {viewingAgent.bankDetails.bankName && (
                        <div>
                          <p className="text-[10px] sm:text-xs text-gray-500 mb-1">Bank Name</p>
                          <p className="text-xs sm:text-sm font-medium text-gray-900">{viewingAgent.bankDetails.bankName}</p>
                        </div>
                      )}
                      {viewingAgent.bankDetails.branchName && (
                        <div>
                          <p className="text-[10px] sm:text-xs text-gray-500 mb-1">Branch Name</p>
                          <p className="text-xs sm:text-sm font-medium text-gray-900">{viewingAgent.bankDetails.branchName}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* UPI ID */}
                {viewingAgent.upiId && (
                  <div className="bg-green-50 rounded-lg p-3 sm:p-4">
                    <h4 className="text-xs sm:text-sm font-semibold text-gray-700 mb-3">Payment Information</h4>
                    <div>
                      <p className="text-[10px] sm:text-xs text-gray-500 mb-1">UPI ID</p>
                      <p className="text-xs sm:text-sm font-medium text-gray-900">{viewingAgent.upiId}</p>
                    </div>
                  </div>
                )}

                {/* Statistics */}
                {viewingAgent.statistics && (
                  <div className="bg-purple-50 rounded-lg p-3 sm:p-4">
                    <h4 className="text-xs sm:text-sm font-semibold text-gray-700 mb-3">Statistics</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <p className="text-[10px] sm:text-xs text-gray-500 mb-1">Total Referrals</p>
                        <p className="text-xs sm:text-sm font-bold text-gray-900">{viewingAgent.statistics.totalReferrals || 0}</p>
                      </div>
                      <div>
                        <p className="text-[10px] sm:text-xs text-gray-500 mb-1">Subscriptions</p>
                        <p className="text-xs sm:text-sm font-bold text-gray-900">{viewingAgent.statistics.successfulSubscriptions || 0}</p>
                      </div>
                      <div>
                        <p className="text-[10px] sm:text-xs text-gray-500 mb-1">Paid</p>
                        <p className="text-xs sm:text-sm font-bold text-gray-900">{viewingAgent.statistics.paidReferrals || 0}</p>
                      </div>
                      <div>
                        <p className="text-[10px] sm:text-xs text-gray-500 mb-1">Total Amount</p>
                        <p className="text-xs sm:text-sm font-bold text-gray-900">₹{viewingAgent.statistics.totalAmount || 0}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end space-x-3 sm:space-x-4 mt-6">
                <button
                  onClick={() => {
                    setViewAgentModal(false)
                    setViewingAgent(null)
                  }}
                  className="px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 md:py-3 bg-[#1e3a5f] hover:bg-[#2a4a6f] text-white rounded-lg sm:rounded-xl font-semibold text-sm sm:text-base transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Agents

