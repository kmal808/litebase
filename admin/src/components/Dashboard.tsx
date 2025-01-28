import { useState, useEffect } from 'react'
import axios from 'axios'
import { CreateTableDialog } from './tables/create-table-dialog'
import { AddProjectDialog } from './projects/add-project-dialog'

interface Project {
  id: number
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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProjects()
  }, [])

  useEffect(() => {
    if (selectedProject) {
      fetchTables(selectedProject.id)
    }
  }, [selectedProject])

  const fetchProjects = async () => {
    try {
      console.log('Fetching projects...')
      const response = await axios.get('/api/projects')
      console.log('Projects received:', response.data)
      setProjects(response.data)
      setLoading(false)
    } catch (error) {
      console.error('Failed to fetch projects:', error)
      setLoading(false)
    }
  }

  const fetchTables = async (projectId: number) => {
    try {
      const response = await axios.get(`/api/projects/${projectId}/tables`)
      setTables(response.data)
    } catch (error) {
      console.error('Failed to fetch tables:', error)
    }
  }

  const handleProjectSelect = (project: Project) => {
    setSelectedProject(project)
  }

  const handleTableCreated = () => {
    if (selectedProject) {
      fetchTables(selectedProject.id)
    }
  }

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='text-lg'>Loading projects...</div>
      </div>
    )
  }

  return (
    <div className='container mx-auto p-4'>
      <h1 className='text-2xl font-bold mb-4'>Dashboard</h1>

      <div className='grid grid-cols-4 gap-4'>
        {/* Projects List */}
        <div className='col-span-1 bg-white p-4 rounded-lg shadow'>
          <div className='flex justify-between items-center mb-4'>
            <h2 className='text-lg font-semibold'>Projects</h2>
            <AddProjectDialog onSuccess={fetchProjects} />
          </div>
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
                <div className='text-xs text-gray-500 mt-1'>
                  API Key: {project.api_key}
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
              <div className='space-y-2'>
                {tables.map((table) => (
                  <div
                    key={table.name}
                    className='p-2 bg-gray-50 rounded hover:bg-gray-100'>
                    {table.name}
                  </div>
                ))}
                {tables.length === 0 && (
                  <p className='text-gray-500'>
                    No tables yet. Create one to get started.
                  </p>
                )}
              </div>
            </>
          ) : (
            <p className='text-gray-500'>
              Select a project to view its tables.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
