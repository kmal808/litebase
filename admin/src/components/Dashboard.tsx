import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import * as Toast from '@radix-ui/react-toast'
import { CreateTableDialog } from './tables/create-table-dialog'
import { AddProjectDialog } from './projects/add-project-dialog'

interface Project {
  id: string // Changed from number to string
  name: string
  api_key: string
  created_at: string
  updated_at: string
}

interface Table {
  name: string
}

export function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [tables, setTables] = useState<Table[]>([])
  const [loading, setLoading] = useState(true) // For initial project fetch
  const [tablesLoading, setTablesLoading] = useState(false)
  const [generalError, setGeneralError] = useState<string | null>(null)
  const [visibleApiKeyProjectId, setVisibleApiKeyProjectId] = useState<string | null>(null)
  const [copiedKeyProjectId, setCopiedKeyProjectId] = useState<string | null>(null)

  // Toast state
  const [toastOpen, setToastOpen] = useState(false)
  const [toastTitle, setToastTitle] = useState('')
  const [toastDescription, setToastDescription] = useState('')
  const [toastVariant, setToastVariant] = useState<'default' | 'destructive'>('default')

  const showToast = useCallback((title: string, description: string, variant: 'default' | 'destructive' = 'default') => {
    setToastTitle(title)
    setToastDescription(description)
    setToastVariant(variant)
    setToastOpen(false) // Close any existing toast first
    setTimeout(() => setToastOpen(true), 100) // Then open new one
  }, [])

  const fetchProjects = useCallback(async (isSuccessCallback = false) => {
    setLoading(true)
    setGeneralError(null)
    try {
      console.log('Fetching projects...')
      const response = await axios.get('/api/projects')
      console.log('Projects received:', response.data)
      setProjects(response.data)
      if (isSuccessCallback) { // Assuming isSuccessCallback indicates it was called after a project creation
        showToast('Project Action Successful', 'Projects reloaded.', 'default')
      }
    } catch (error: any) {
      console.error('Failed to fetch projects:', error)
      const errorMessage = error.response?.data?.error || error.message || 'An unknown error occurred.'
      showToast('Error Fetching Projects', errorMessage, 'destructive')
      setGeneralError(`Failed to load projects: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  useEffect(() => {
    if (selectedProject) {
      fetchTables(selectedProject.id)
    } else {
      setTables([]) // Clear tables if no project is selected
    }
  }, [])

  useEffect(() => {
    if (selectedProject) {
      fetchTables(selectedProject.id)
    }
  }, [selectedProject])

  }, [selectedProject, fetchTables])


  const fetchTables = useCallback(async (projectId: string) => {
    setTablesLoading(true)
    try {
      const response = await axios.get(`/api/projects/${projectId}/tables`)
      setTables(response.data)
    } catch (error: any) {
      console.error('Failed to fetch tables:', error)
      const errorMessage = error.response?.data?.error || error.message || 'An unknown error occurred.'
      showToast('Error Fetching Tables', `Could not load tables for project ${selectedProject?.name || projectId}: ${errorMessage}`, 'destructive')
      setTables([]) // Clear tables on error
    } finally {
      setTablesLoading(false)
    }
  }, [showToast, selectedProject?.name])

  const handleProjectSelect = (project: Project) => {
    setSelectedProject(project)
    // fetchTables will be called by useEffect watching selectedProject
  }

  const handleTableCreated = () => {
    if (selectedProject) {
      fetchTables(selectedProject.id).then(() => {
        showToast('Table Created', `Successfully created table in project ${selectedProject.name}.`, 'default')
      })
    }
  }
  
  const handleProjectCreated = () => {
    fetchProjects(true) // Pass true to indicate it's a success callback from creation
  }


  if (loading && projects.length === 0) { // Only show full page loader on initial load
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='text-lg'>Loading projects...</div>
      </div>
    )
  }

  return (
    <Toast.Provider swipeDirection="right">
      <div className='container mx-auto p-4'>
        <h1 className='text-2xl font-bold mb-4'>Dashboard</h1>

        {generalError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{generalError}</span>
          </div>
        )}

        <div className='grid grid-cols-4 gap-4'>
          {/* Projects List */}
          <div className='col-span-1 bg-white p-4 rounded-lg shadow'>
            <div className='flex justify-between items-center mb-4'>
              <h2 className='text-lg font-semibold'>Projects</h2>
              <AddProjectDialog onSuccess={handleProjectCreated} />
            </div>
            {loading && projects.length > 0 && <p className="text-sm text-gray-500">Reloading projects...</p>}
            <div className='space-y-2'>
              {projects.map((project) => (
              <div
                key={project.id}
                className={`p-2 rounded cursor-pointer ${
                  selectedProject?.id === project.id
                    ? 'bg-blue-100'
                    : 'hover:bg-gray-100'
                }`}
                onClick={() => handleProjectSelect(project)}>
                <div className='font-medium'>{project.name}</div>
                <div className='mt-2'>
                  {visibleApiKeyProjectId === project.id ? (
                    <>
                      <div className='text-xs text-gray-700 bg-gray-100 p-1 rounded break-all'>
                        {project.api_key}
                      </div>
                      <div className='flex space-x-1 mt-1'>
                        <button
                          onClick={(e) => {
                            e.stopPropagation() // Prevent project selection
                            navigator.clipboard.writeText(project.api_key)
                            setCopiedKeyProjectId(project.id)
                            setTimeout(() => setCopiedKeyProjectId(null), 2000)
                          }}
                          className='text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded'>
                          {copiedKeyProjectId === project.id ? 'Copied!' : 'Copy'}
                        </button>
                        <button
                          onClick={(e) => {
                             e.stopPropagation()
                             setVisibleApiKeyProjectId(null)
                          }}
                          className='text-xs bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded'>
                          Hide Key
                        </button>
                      </div>
                    </>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation() // Prevent project selection
                        setVisibleApiKeyProjectId(project.id)
                      }}
                      className='text-xs bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded'>
                      View API Key
                    </button>
                  )}
                </div>
              </div>
            ))}
            {projects.length === 0 && (
              <p className='text-gray-500 text-sm'>
                No projects yet. Create one to get started.
              </p>
            )}
          </div>
        </div>

        {/* Tables List */}
        <div className='col-span-3 bg-white p-4 rounded-lg shadow'>
          {selectedProject ? (
            <>
              <div className='flex justify-between items-center mb-4'>
                <h2 className='text-lg font-semibold'>
                  Tables in {selectedProject.name}
                </h2>
                <CreateTableDialog
                  projectId={selectedProject.id}
                  onSuccess={handleTableCreated}
                />
              </div>
              {tablesLoading ? (
                <p className='text-gray-500'>Loading tables...</p>
              ) : (
                <div className='space-y-2'>
                  {tables.map((table) => (
                    <div
                      key={table.name}
                      className='p-2 bg-gray-50 rounded hover:bg-gray-100'>
                      {table.name}
                    </div>
                  ))}
                  {tables.length === 0 && !tablesLoading && (
                    <p className='text-gray-500'>
                      No tables yet. Create one to get started.
                    </p>
                  )}
                </div>
              )}
            </>
          ) : (
            <p className='text-gray-500'>
              Select a project to view its tables.
            </p>
          )}
        </div>
      </div>
      <Toast.Root
        className={`fixed bottom-0 right-0 flex flex-col p-4 space-y-2 w-80 rounded-md shadow-lg
          ${toastVariant === 'destructive' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}
          data-[state=open]:animate-slideIn data-[state=closed]:animate-hide data-[swipe=end]:animate-swipeOut`}
        open={toastOpen}
        onOpenChange={setToastOpen}
      >
        <Toast.Title className="font-medium">{toastTitle}</Toast.Title>
        <Toast.Description>{toastDescription}</Toast.Description>
        <Toast.Close className="absolute top-2 right-2 text-white">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </Toast.Close>
      </Toast.Root>
      <Toast.Viewport className="fixed bottom-0 right-0 flex flex-col p-4 space-y-2 w-80" />
    </Toast.Provider>
  )
}
