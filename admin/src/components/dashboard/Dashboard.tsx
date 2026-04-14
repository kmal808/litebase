import { useState, useEffect } from 'react'
import axios from 'axios'
import { CreateTableDialog } from '../tables/create-table-dialog'
import { AddProjectDialog } from '../projects/add-project-dialog'

interface Project {
  id: string
  name: string
  created_at: string
  updated_at: string
  config: {
    apiKey: string
  }
}

type Table = string | { name: string }

interface ColumnDefinition {
  name: string
  type: string
  length?: number
  nullable?: boolean
  primaryKey?: boolean
  unique?: boolean
  default?: string
}

interface TableDefinition {
  name: string
  columns: ColumnDefinition[]
}

export function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [tables, setTables] = useState<Table[]>([])
  const [selectedTableName, setSelectedTableName] = useState<string | null>(null)
  const [tableDefinition, setTableDefinition] = useState<TableDefinition | null>(null)
  const [tableRows, setTableRows] = useState<Record<string, any>[]>([])
  const [tableDetailsLoading, setTableDetailsLoading] = useState(false)
  const [tableDetailsError, setTableDetailsError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProjects()
  }, [])

  useEffect(() => {
    if (selectedProject) {
      fetchTables(selectedProject.id, selectedProject.config.apiKey)
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

  const fetchTables = async (projectId: string, apiKey: string) => {
    try {
      const response = await axios.get(`/api/projects/${projectId}/tables`, {
        headers: {
          'x-api-key': apiKey,
        },
      })
      setTables(response.data)
      if (selectedTableName) {
        const tableNames = response.data.map((table: Table) =>
          typeof table === 'string' ? table : table.name
        )
        if (!tableNames.includes(selectedTableName)) {
          setSelectedTableName(null)
          setTableDefinition(null)
          setTableRows([])
        }
      }
    } catch (error) {
      console.error('Failed to fetch tables:', error)
    }
  }

  const fetchTableDetails = async (
    projectId: string,
    apiKey: string,
    tableName: string
  ) => {
    try {
      setTableDetailsLoading(true)
      setTableDetailsError(null)
      setSelectedTableName(tableName)

      const [definitionResponse, rowsResponse] = await Promise.all([
        axios.get(`/api/projects/${projectId}/tables/${tableName}`, {
          headers: {
            'x-api-key': apiKey,
          },
        }),
        axios.post(
          `/api/projects/${projectId}/tables/${tableName}/query`,
          { limit: 50, offset: 0 },
          {
            headers: {
              'x-api-key': apiKey,
            },
          }
        ),
      ])

      setTableDefinition(definitionResponse.data)
      setTableRows(rowsResponse.data)
    } catch (error: any) {
      console.error('Failed to fetch table details:', error)
      const errorMessage =
        error.response?.data?.error || error.message || 'An unknown error occurred.'
      setTableDetailsError(errorMessage)
      setTableDefinition(null)
      setTableRows([])
    } finally {
      setTableDetailsLoading(false)
    }
  }

  const handleProjectSelect = (project: Project) => {
    setSelectedProject(project)
    setSelectedTableName(null)
    setTableDefinition(null)
    setTableRows([])
  }

  const handleTableCreated = () => {
    if (selectedProject) {
      fetchTables(selectedProject.id, selectedProject.config.apiKey)
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
                  API Key: {project.config.apiKey}
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
                  apiKey={selectedProject.config.apiKey}
                  onSuccess={handleTableCreated}
                />
              </div>
              <div className='grid grid-cols-3 gap-4'>
                <div className='col-span-1'>
                  <div className='space-y-2'>
                    {tables.map((table) => {
                      const tableName = typeof table === 'string' ? table : table.name
                      return (
                        <button
                          key={tableName}
                          type='button'
                          onClick={() =>
                            fetchTableDetails(
                              selectedProject.id,
                              selectedProject.config.apiKey,
                              tableName
                            )
                          }
                          className={`w-full text-left p-2 rounded border ${
                            selectedTableName === tableName
                              ? 'border-blue-300 bg-blue-50'
                              : 'border-transparent bg-gray-50 hover:bg-gray-100'
                          }`}
                        >
                          {tableName}
                        </button>
                      )
                    })}
                    {tables.length === 0 && (
                      <p className='text-gray-500'>
                        No tables yet. Create one to get started.
                      </p>
                    )}
                  </div>
                </div>

                <div className='col-span-2 space-y-4'>
                  <div className='rounded border border-gray-200 p-3'>
                    <div className='text-sm font-semibold mb-2'>Schema</div>
                    {!selectedTableName && (
                      <p className='text-gray-500 text-sm'>
                        Select a table to view its schema.
                      </p>
                    )}
                    {selectedTableName && tableDetailsLoading && (
                      <p className='text-gray-500 text-sm'>Loading schema...</p>
                    )}
                    {selectedTableName && tableDetailsError && (
                      <p className='text-red-500 text-sm'>{tableDetailsError}</p>
                    )}
                    {selectedTableName && tableDefinition && !tableDetailsLoading && (
                      <div className='space-y-2'>
                        {tableDefinition.columns.map((column) => (
                          <div
                            key={column.name}
                            className='flex items-center justify-between text-sm'
                          >
                            <div className='font-medium'>{column.name}</div>
                            <div className='text-gray-500'>
                              {column.type}
                              {column.length ? `(${column.length})` : ''}
                              {column.primaryKey ? ' · PK' : ''}
                              {column.unique ? ' · UNIQUE' : ''}
                              {column.nullable === false ? ' · NOT NULL' : ''}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className='rounded border border-gray-200 p-3'>
                    <div className='text-sm font-semibold mb-2'>Data</div>
                    {!selectedTableName && (
                      <p className='text-gray-500 text-sm'>
                        Select a table to preview its data.
                      </p>
                    )}
                    {selectedTableName && tableDetailsLoading && (
                      <p className='text-gray-500 text-sm'>Loading rows...</p>
                    )}
                    {selectedTableName && !tableDetailsLoading && tableRows.length === 0 && (
                      <p className='text-gray-500 text-sm'>No rows yet.</p>
                    )}
                    {selectedTableName && !tableDetailsLoading && tableRows.length > 0 && (
                      <div className='overflow-x-auto'>
                        <table className='min-w-full text-sm'>
                          <thead>
                            <tr className='border-b'>
                              {Object.keys(tableRows[0]).map((key) => (
                                <th key={key} className='text-left py-2 pr-4 font-medium'>
                                  {key}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {tableRows.map((row, rowIndex) => (
                              <tr key={rowIndex} className='border-b last:border-b-0'>
                                {Object.keys(tableRows[0]).map((key) => (
                                  <td key={key} className='py-2 pr-4 text-gray-700'>
                                    {String(row[key] ?? '')}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
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
