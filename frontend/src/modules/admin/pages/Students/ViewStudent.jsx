import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { studentAPI } from '../../services/api'

const ViewStudent = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [student, setStudent] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchStudent = async () => {
      try {
        setIsLoading(true)
        const response = await studentAPI.getById(id)
        if (response.success && response.data?.student) {
          setStudent(response.data.student)
        } else {
          setError('Failed to load student details')
        }
      } catch (err) {
        setError(err.message || 'Failed to load student details')
        console.error('Error fetching student:', err)
      } finally {
        setIsLoading(false)
      }
    }

    if (id) {
      fetchStudent()
    }
  }, [id])

  const getInitials = (name) => {
    if (!name) return 'ST'
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = date.toLocaleString('default', { month: 'long' });
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  }

  const getActivePlans = (stu) => {
    const now = new Date();
    let plans = [];

    // Check activeSubscriptions array
    if (stu.activeSubscriptions && stu.activeSubscriptions.length > 0) {
      const activeSubs = stu.activeSubscriptions.filter(sub => new Date(sub.endDate) > now);
      plans = activeSubs.map(sub => {
        // Safe access to nested properties
        const planName = sub.planId?.name;
        // Determine class info to show: either from the plan-specific classId or the student's current class
        // Determine class info to show based on the provided API response structure
        // 1. Direct class/board on subscription object (e.g. regular plans have 'class' and 'board' directly)
        // 2. ClassId object (e.g. preparation plans have 'classId' object)
        // 3. Fallback to student's profile class/board
        let classInfo = '';

        if (sub.class) {
          classInfo = `${sub.class}${sub.board ? ` (${sub.board})` : ''}`;
        } else if (sub.classId) {
          // If classId is an object (populated), use its fields if available, or just name
          if (typeof sub.classId === 'object') {
            // For prep plans, classId often has 'name' like "JEE Preparation" or "NDA Special Classes"
            // Check if it has class/board props, otherwise use name
            if (sub.classId.class) {
              classInfo = `${sub.classId.class}${sub.classId.board ? ` (${sub.classId.board})` : ''}`;
            } else if (sub.classId.name) {
              classInfo = sub.classId.name;
            }
          } else {
            // If not populated (rare given backend change), fallback
            classInfo = 'N/A';
          }
        } else {
          // Fallback to student info
          classInfo = `${stu.class}${stu.board ? ` (${stu.board})` : ''}`;
        }

        let displayName = planName || (sub.type === 'regular' ? `Regular Plan` : 'Prep Plan');

        return {
          name: displayName,
          type: sub.type,
          classInfo: classInfo,
          start: formatDate(sub.startDate),
          end: formatDate(sub.endDate),
          duration: sub.planId?.duration || 'N/A'
        };
      });
    }

    // Fallback to legacy subscription object if no activeSubscriptions found
    if (plans.length === 0 && stu.subscription?.status === 'active' && new Date(stu.subscription.endDate) > now) {
      const sub = stu.subscription;
      plans.push({
        name: sub.planId?.name || 'Regular Plan',
        type: 'regular',
        classInfo: `${stu.class}${stu.board ? ` (${stu.board})` : ''}`,
        start: formatDate(sub.startDate),
        end: formatDate(sub.endDate),
        duration: sub.planId?.duration || 'N/A'
      });
    }

    return plans;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1e3a5f]"></div>
          <p className="mt-4 text-gray-600">Loading student details...</p>
        </div>
      </div>
    )
  }

  if (error || !student) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Error Loading Student</h3>
          <p className="text-gray-600 mb-6">{error || 'Student not found'}</p>
          <button
            onClick={() => navigate('/admin/students')}
            className="px-6 py-2 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#2a4a6f] transition-colors"
          >
            Back to Students
          </button>
        </div>
      </div>
    )
  }

  const activePlans = getActivePlans(student);

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="w-full">
        {/* Navigation Breadcrumb */}
        <button
          onClick={() => navigate('/admin/students')}
          className="flex items-center text-gray-600 hover:text-[#1e3a5f] mb-6 transition-colors group"
        >
          <svg className="w-5 h-5 mr-2 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Students List
        </button>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2a4a6f] p-8 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <svg className="w-64 h-64" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 14l9-5-9-5-9 5 9 5z" />
                <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
              </svg>
            </div>

            <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6">
              <div className="flex-shrink-0">
                <div className="h-24 w-24 md:h-32 md:w-32 rounded-full border-4 border-white/30 bg-white p-1 shadow-2xl">
                  {student.profileImage ? (
                    <img
                      src={student.profileImage}
                      alt={student.name}
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full rounded-full bg-gray-100 flex items-center justify-center text-[#1e3a5f]">
                      <span className="text-3xl font-bold">{getInitials(student.name)}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-1 text-center md:text-left">
                <h1 className="text-3xl font-bold mb-2">{student.name}</h1>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${student.isActive
                    ? 'bg-green-500/20 text-green-50 border border-green-400/30'
                    : 'bg-red-500/20 text-red-50 border border-red-400/30'
                    }`}>
                    {student.isActive ? 'Active Student' : 'Inactive Student'}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-medium">
                    Class {student.class} ({student.board || 'All Boards'})
                  </span>
                </div>
                <div className="flex flex-col gap-3 text-sm text-blue-100">
                  <div className="flex flex-col sm:flex-row items-center justify-center md:justify-start gap-4">
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      {student.email || 'No email provided'}
                    </span>
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      {student.phone}
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-center md:justify-start gap-4 text-xs opacity-90 border-t border-blue-400/30 pt-3 mt-1">
                    <span className="flex items-center" title="Joined On">
                      <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Joined: {new Date(student.createdAt).toLocaleDateString()}
                    </span>

                    {student.referralAgentId && (
                      <span className="flex items-center bg-blue-500/20 px-2 py-0.5 rounded" title="Referred By">
                        <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Ref By: {student.referralAgentId?.name || student.referralAgentId}
                      </span>
                    )}

                    {student.referredAt && (
                      <span className="flex items-center" title="Referred Date">
                        <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Ref Date: {new Date(student.referredAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex-shrink-0">
                <button
                  onClick={() => navigate(`/admin/students/edit/${student._id}`)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-sm font-medium transition-colors flex items-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  Edit Profile
                </button>
              </div>
            </div>
          </div>

          {/* Content Grid */}
          <div className="p-6 lg:p-8">
            <div className="w-full">
              {/* Active Plans Card (Full Width) */}
              <div className="space-y-6">
                {/* Active Plans Card */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                      <svg className="w-5 h-5 text-[#1e3a5f]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Active Subscriptions
                    </h3>
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold">
                      {activePlans.length} Active
                    </span>
                  </div>

                  <div className="p-6">
                    {activePlans.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-gray-200">
                              <th className="pb-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Plan Name</th>
                              <th className="pb-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Class</th>
                              <th className="pb-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                              <th className="pb-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Start Date</th>
                              <th className="pb-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Expiry Date</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {activePlans.map((plan, idx) => (
                              <tr key={idx} className="group hover:bg-gray-50/50 transition-colors">
                                <td className="py-4 pr-4">
                                  <div className="font-medium text-gray-900">{plan.name}</div>
                                  <div className="text-xs text-gray-500 capitalize">{plan.duration}</div>
                                </td>
                                <td className="py-4 px-2 text-sm text-gray-700">
                                  {plan.classInfo}
                                </td>
                                <td className="py-4 px-2">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                                                 ${plan.type === 'regular' ? 'bg-purple-100 text-purple-800' : 'bg-orange-100 text-orange-800'}
                                               `}>
                                    {plan.type}
                                  </span>
                                </td>
                                <td className="py-4 px-2 text-sm text-gray-600">
                                  {plan.start}
                                </td>
                                <td className="py-4 pl-4 text-right">
                                  <div className="font-medium text-orange-600">{plan.end}</div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                        <svg className="w-12 h-12 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                        </svg>
                        <p className="text-gray-500 font-medium">No active subscription plans.</p>
                        <p className="text-sm text-gray-400 mt-1">Assign a plan to give this student access.</p>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
            {/* Stats cards removed as requested */}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ViewStudent
