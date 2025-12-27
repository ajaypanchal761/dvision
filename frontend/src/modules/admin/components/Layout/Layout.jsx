import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import Sidebar from '../Sidebar/Sidebar'
import { notificationAPI } from '../../services/api'

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed')
    return saved ? JSON.parse(saved) : false
  })
  const [unreadCount, setUnreadCount] = useState(0)
  const navigate = useNavigate()
  const location = useLocation()

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'sidebarCollapsed') {
        setSidebarCollapsed(e.newValue ? JSON.parse(e.newValue) : false)
      }
    }

    // Listen for storage events (from other tabs)
    window.addEventListener('storage', handleStorageChange)

    // Listen for custom event from Sidebar component
    const handleCustomStorageChange = () => {
      const saved = localStorage.getItem('sidebarCollapsed')
      setSidebarCollapsed(saved ? JSON.parse(saved) : false)
    }

    window.addEventListener('sidebarToggle', handleCustomStorageChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('sidebarToggle', handleCustomStorageChange)
    }
  }, [])

  // Fetch unread notification count
  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const response = await notificationAPI.getUnreadCount()
        if (response.success && response.data?.unreadCount !== undefined) {
          setUnreadCount(response.data.unreadCount)
        }
      } catch (err) {
        console.error('Error fetching unread count:', err)
      }
    }

    fetchUnreadCount()
    // Refresh every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('dvision_admin_token')
    localStorage.removeItem('admin_data')
    localStorage.removeItem('isAuthenticated')
    navigate('/admin/login')
  }

  const toggleSidebarCollapse = () => {
    const newState = !sidebarCollapsed
    setSidebarCollapsed(newState)
    localStorage.setItem('sidebarCollapsed', JSON.stringify(newState))
    window.dispatchEvent(new Event('sidebarToggle'))
  }

  return (
    <div className="min-h-screen flex bg-white">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} isCollapsed={sidebarCollapsed} />

      {/* Main Content - Responsive padding adjusts for sidebar */}
      <div className={`flex-1 flex flex-col w-full transition-all duration-300 ease-in-out ${sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-72'
        }`}>
        {/* Top Header */}
        <header className="bg-gradient-to-r from-[#1e3a5f] to-[#2a4a6f] shadow-lg border-b border-white/10 sticky top-0 z-30">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Left Side - Menu Toggle & Title */}
              <div className="flex items-center">
                {/* Mobile Menu Button */}
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden p-2 rounded-lg text-white/90 hover:text-white hover:bg-white/15 transition-all duration-200 active:scale-95"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>

                {/* Desktop Sidebar Toggle Button */}
                <button
                  onClick={toggleSidebarCollapse}
                  className="hidden lg:flex p-2 rounded-lg text-white/90 hover:text-white hover:bg-white/15 transition-all duration-200 active:scale-95"
                  title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                  {sidebarCollapsed ? (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  )}
                </button>

                {/* Desktop Title */}
                <h1 className="hidden lg:block text-xl font-bold text-white ml-4 tracking-tight">
                  D'Vision <span className="text-white">Admin Panel</span>
                </h1>
              </div>

              {/* Right Side Actions */}
              <div className="flex items-center space-x-3 sm:space-x-4">
                {/* Notifications */}
                <button
                  onClick={() => navigate('/admin/my-notifications')}
                  className="p-2 rounded-lg text-white/90 hover:text-white hover:bg-white/15 transition-all duration-200 relative active:scale-95"
                  title="Notifications"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 h-5 w-5 bg-gradient-to-r from-[#FF6B35] to-[#FF8C5A] rounded-full border-2 border-[#1e3a5f] shadow-sm flex items-center justify-center">
                      <span className="text-white text-[10px] font-bold">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    </span>
                  )}
                </button>

                {/* User Menu */}
                <div className="flex items-center space-x-2 sm:space-x-3 pl-2 sm:pl-3 border-l border-white/20">
                  <div className="h-9 w-9 rounded-full bg-gradient-to-br from-orange-500 to-orange-700 border-2 border-white/30 flex items-center justify-center shadow-md hover:shadow-lg transition-shadow">
                    <span className="text-white font-bold text-sm">A</span>
                  </div>
                  <div className="hidden md:block text-right">
                    <p className="text-sm font-semibold text-white">Admin User</p>
                    <p className="text-xs text-white/70">admin@dvision.academy</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 pb-4 sm:pb-6 lg:pb-8">
          {children}
        </main>
      </div>
    </div>
  )
}

export default Layout

