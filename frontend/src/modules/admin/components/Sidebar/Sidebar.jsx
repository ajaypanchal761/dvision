import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

const Sidebar = ({ isOpen, setIsOpen, isCollapsed }) => {
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = () => {
    localStorage.removeItem('dvision_admin_token')
    localStorage.removeItem('admin_data')
    localStorage.removeItem('isAuthenticated')
    navigate('/admin/login')
  }

  const menuSections = [
    {
      title: 'DASHBOARD',
      items: [
        {
          name: 'Overview',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          ),
          path: '/admin/dashboard',
        },
      ],
    },
    {
      title: 'PEOPLE',
      items: [
        {
          name: 'Students',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ),
          path: '/admin/students',
        },
        {
          name: 'Teachers',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          ),
          path: '/admin/teachers',
        },
        {
          name: 'Subscriptions',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          ),
          path: '/admin/subscriptions',
        },
        {
          name: 'Transactions',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          path: '/admin/transactions',
        },
      ],
    },
    {
      title: 'ACADEMY',
      items: [
        {
          name: 'Classes',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          ),
          path: '/admin/classes',
        },
        {
          name: 'Subjects',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          ),
          path: '/admin/subjects',
        },
        {
          name: 'Courses',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          ),
          path: '/admin/courses',
        },
        {
          name: 'Quizzes',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          ),
          path: '/admin/quizzes',
        },
      ],
    },
    {
      title: 'ATTENDANCE',
      items: [
        {
          name: 'Attendance',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          ),
          path: '/admin/attendance',
        },
      ],
    },
    {
      title: 'MANAGEMENT',
      items: [
        {
          name: 'Banners',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          ),
          path: '/admin/banners',
        },
        {
          name: 'Time Table',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          path: '/admin/timetable',
        },
        {
          name: 'Doubts',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          ),
          path: '/admin/doubts',
        },
        {
          name: 'Content',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          ),
          path: '/admin/content',
        },
        {
          name: 'Referrals',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          ),
          path: '/admin/referrals',
        },
        {
          name: 'Teacher Class',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          ),
          path: '/admin/teacher-class',
        },
        {
          name: 'Recorded Session',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          ),
          path: '/admin/recorded-session',
        },
        {
          name: 'Notifications',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          ),
          path: '/admin/notifications',
        },
      ],
    },
    {
      title: 'ACCOUNT',
      items: [
        {
          name: 'Logout',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          ),
          path: '/logout',
          onClick: handleLogout,
        },
      ],
    },
  ]

  // Flatten menu items for collapsed sidebar
  const allMenuItems = menuSections.flatMap(section => section.items)

  const isActive = (path) => {
    if (path === '/admin/attendance') {
      // For attendance, check if current path starts with /admin/attendance
      return location.pathname.startsWith('/admin/attendance')
    }
    if (path === '/admin/subscriptions') {
      return location.pathname.startsWith('/admin/subscriptions')
    }
    if (path === '/admin/banners') {
      return location.pathname.startsWith('/admin/banners')
    }
    if (path === '/admin/timetable') {
      return location.pathname.startsWith('/admin/timetable')
    }
    if (path === '/admin/doubts') {
      return location.pathname.startsWith('/admin/doubts')
    }
    if (path === '/admin/content') {
      return location.pathname.startsWith('/admin/content')
    }
    if (path === '/admin/referrals') {
      return location.pathname.startsWith('/admin/referrals')
    }
    if (path === '/admin/teacher-class') {
      return location.pathname.startsWith('/admin/teacher-class')
    }
    if (path === '/admin/recorded-session') {
      return location.pathname.startsWith('/admin/recorded-session')
    }
    if (path === '/admin/notifications') {
      return location.pathname.startsWith('/admin/notifications')
    }
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  return (
    <>
      {/* Custom Scrollbar and Tooltip Styles */}
      <style>{`
        /* Scrollbar styling for navigation menus */
        nav::-webkit-scrollbar,
        .overflow-y-auto::-webkit-scrollbar {
          width: 6px;
        }
        /* Scrollbar track for blue sidebar */
        aside nav::-webkit-scrollbar-track,
        aside.bg-\\[\\#1e3a5f\\] .overflow-y-auto::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 3px;
        }
        /* Scrollbar thumb for blue sidebar */
        aside nav::-webkit-scrollbar-thumb,
        aside.bg-\\[\\#1e3a5f\\] .overflow-y-auto::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 3px;
        }
        aside nav::-webkit-scrollbar-thumb:hover,
        aside.bg-\\[\\#1e3a5f\\] .overflow-y-auto::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
        /* Tooltip for collapsed sidebar items */
        .sidebar-tooltip {
          position: relative;
        }
        .sidebar-tooltip:hover::after {
          content: attr(data-tooltip);
          position: absolute;
          left: 100%;
          top: 50%;
          transform: translateY(-50%);
          margin-left: 8px;
          padding: 6px 12px;
          background-color: #1f2937;
          color: white;
          border-radius: 6px;
          font-size: 14px;
          white-space: nowrap;
          z-index: 1000;
          pointer-events: none;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .sidebar-tooltip:hover::before {
          content: '';
          position: absolute;
          left: 100%;
          top: 50%;
          transform: translateY(-50%);
          margin-left: 4px;
          border: 6px solid transparent;
          border-right-color: #1f2937;
          z-index: 1001;
          pointer-events: none;
        }
      `}</style>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

       {/* Collapsed Sidebar - Blue Icon Bar */}
       {isCollapsed && (
         <aside
           className={`fixed top-0 left-0 z-50 h-screen bg-[#1e3a5f] shadow-xl transform transition-all duration-300 ease-in-out flex flex-col ${
             isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
           } w-20`}
         >
           {/* Logo at top */}
           <div className="flex items-center justify-center h-20 border-b border-white/20 flex-shrink-0 px-2 py-3">
             <div className="h-14 w-14 rounded-lg flex items-center justify-center">
               <img 
                 src="/logo.png" 
                 alt="D'Vision Academy Logo" 
                 className="h-12 w-12 object-contain"
               />
             </div>
           </div>

           {/* Icon Menu */}
           <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 min-h-0 bg-[#1e3a5f]">
             <ul className="space-y-2 px-3">
               {allMenuItems.map((item, index) => (
                 <li key={`${item.path}-${index}`}>
                   {item.onClick ? (
                     <button
                       onClick={() => {
                         setIsOpen(false)
                         item.onClick()
                       }}
                       className={`flex items-center justify-center p-3 rounded-xl transition-all duration-200 sidebar-tooltip w-full ${
                         isActive(item.path)
                           ? 'bg-white/20 text-white shadow-sm'
                           : 'text-white/70 hover:bg-white/10 hover:text-white'
                       }`}
                       data-tooltip={item.name}
                       title={item.name}
                     >
                       {item.icon}
                     </button>
                   ) : (
                     <button
                       onClick={() => {
                         if (isCollapsed) {
                           setIsOpen(true)
                         }
                         navigate(item.path)
                       }}
                       className={`flex items-center justify-center p-3 rounded-xl transition-all duration-200 sidebar-tooltip w-full ${
                         isActive(item.path)
                           ? 'bg-white/20 text-white shadow-sm'
                           : 'text-white/70 hover:bg-white/10 hover:text-white'
                       }`}
                       data-tooltip={item.name}
                       title={item.name}
                     >
                       {item.icon}
                     </button>
                   )}
                 </li>
               ))}
             </ul>
           </nav>

         </aside>
       )}

       {/* Expanded Sidebar - Single Combined Sidebar */}
       {!isCollapsed && (
         <aside className={`fixed top-0 left-0 z-50 h-screen bg-[#1e3a5f] shadow-xl transform transition-all duration-300 ease-in-out flex flex-col ${
           isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
         } w-72`}>
           {/* Header - Blue Background */}
           <div className="flex items-center justify-between h-16 px-6 border-b border-white/20 flex-shrink-0 shadow-lg relative z-10 bg-[#1e3a5f]">
             <div className="flex items-center gap-3">
               <div className="h-10 w-10 rounded-lg flex items-center justify-center">
                 <img 
                   src="/logo.png" 
                   alt="D'Vision Academy Logo" 
                   className="h-8 w-8 object-contain"
                 />
               </div>
               <span className="text-lg font-bold text-white">D'Vision Academy</span>
             </div>
             <button
               onClick={() => setIsOpen(false)}
               className="text-white/70 hover:text-white transition-colors lg:hidden"
             >
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
               </svg>
             </button>
           </div>

           {/* Content Sections */}
           <div className="flex-1 overflow-y-auto overflow-x-hidden py-6 px-4 min-h-0 bg-[#1e3a5f]">
             {menuSections.map((section, sectionIndex) => (
               <div key={section.title} className={sectionIndex > 0 ? 'mt-8' : ''}>
                 <h3 className="text-xs font-bold text-white/60 uppercase tracking-wider mb-4 px-2">
                   {section.title}
                 </h3>
                 <ul className="space-y-1">
                   {section.items.map((item, itemIndex) => (
                     <li key={`${item.path}-${itemIndex}`}>
                       {item.onClick ? (
                         <button
                           onClick={() => {
                             setIsOpen(false)
                             item.onClick()
                           }}
                           className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 w-full text-left ${
                             isActive(item.path)
                               ? 'bg-white/20 text-white shadow-sm'
                               : 'text-white/70 hover:bg-white/10 hover:text-white'
                           }`}
                         >
                           <span className={`flex-shrink-0 ${isActive(item.path) ? 'text-white' : 'text-white/60'}`}>
                             {item.icon}
                           </span>
                           <span className="text-sm flex-1">{item.name}</span>
                         </button>
                       ) : (
                         <Link
                           to={item.path}
                           onClick={() => setIsOpen(false)}
                           className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                             isActive(item.path)
                               ? 'bg-white/20 text-white shadow-sm'
                               : 'text-white/70 hover:bg-white/10 hover:text-white'
                           }`}
                         >
                           <span className={`flex-shrink-0 ${isActive(item.path) ? 'text-white' : 'text-white/60'}`}>
                             {item.icon}
                           </span>
                           <span className="text-sm flex-1">{item.name}</span>
                         </Link>
                       )}
                     </li>
                   ))}
                 </ul>
               </div>
             ))}
           </div>

         </aside>
       )}
     </>
   )
 }
 
 export default Sidebar
