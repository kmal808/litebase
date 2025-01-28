import { useState } from 'react'
import axios from 'axios'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Plus, X } from 'lucide-react'

interface Column {
  name: string
  type: string
  length?: number
  nullable?: boolean
  primaryKey?: boolean
  unique?: boolean
  default?: string
}

interface CreateTableDialogProps {
  projectId: number
  onSuccess: () => void
}

export function CreateTableDialog({
  projectId,
  onSuccess,
}: CreateTableDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [tableName, setTableName] = useState('')
  const [columns, setColumns] = useState<Column[]>([
    { name: 'id', type: 'serial', primaryKey: true },
  ])
  const [loading, setLoading] = useState(false)

  const handleAddColumn = () => {
    setColumns([...columns, { name: '', type: 'varchar', length: 255 }])
  }

  const handleRemoveColumn = (index: number) => {
    setColumns(columns.filter((_, i) => i !== index))
  }

  const handleColumnChange = (
    index: number,
    field: keyof Column,
    value: Column[keyof Column]
  ) => {
    const newColumns = [...columns]
    newColumns[index] = { ...newColumns[index], [field]: value }
    setColumns(newColumns)
  }

  const handleSubmit = async () => {
    try {
      setLoading(true)
      await axios.post(`/api/projects/${projectId}/tables`, {
        name: tableName,
        columns,
      })
      setIsOpen(false)
      onSuccess()
    } catch (error) {
      console.error('Failed to create table:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Create Table</Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Table</DialogTitle>
            <DialogDescription>
              Define your table structure below.
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-4'>
            <div>
              <label className='text-sm font-medium'>Table Name</label>
              <Input
                value={tableName}
                onChange={(e) => setTableName(e.target.value)}
                placeholder='Enter table name'
              />
            </div>

            <div className='space-y-2'>
              <label className='text-sm font-medium'>Columns</label>
              {columns.map((column, index) => (
                <div key={index} className='flex gap-2 items-start'>
                  <Input
                    value={column.name}
                    onChange={(e) =>
                      handleColumnChange(index, 'name', e.target.value)
                    }
                    placeholder='Column name'
                  />
                  <select
                    value={column.type}
                    onChange={(e) =>
                      handleColumnChange(index, 'type', e.target.value)
                    }
                    className='px-3 py-2 bg-white border border-gray-300 rounded-md'>
                    <option value='varchar'>VARCHAR</option>
                    <option value='text'>TEXT</option>
                    <option value='integer'>INTEGER</option>
                    <option value='serial'>SERIAL</option>
                    <option value='boolean'>BOOLEAN</option>
                    <option value='timestamp'>TIMESTAMP</option>
                    <option value='jsonb'>JSONB</option>
                  </select>
                  {column.type === 'varchar' && (
                    <Input
                      type='number'
                      value={column.length}
                      onChange={(e) =>
                        handleColumnChange(
                          index,
                          'length',
                          parseInt(e.target.value)
                        )
                      }
                      placeholder='Length'
                      className='w-24'
                    />
                  )}
                  <div className='space-x-2'>
                    <input
                      type='checkbox'
                      checked={column.nullable}
                      onChange={(e) =>
                        handleColumnChange(index, 'nullable', e.target.checked)
                      }
                      id={`nullable-${index}`}
                    />
                    <label htmlFor={`nullable-${index}`}>Nullable</label>
                  </div>
                  <div className='space-x-2'>
                    <input
                      type='checkbox'
                      checked={column.unique}
                      onChange={(e) =>
                        handleColumnChange(index, 'unique', e.target.checked)
                      }
                      id={`unique-${index}`}
                    />
                    <label htmlFor={`unique-${index}`}>Unique</label>
                  </div>
                  {index > 0 && (
                    <Button
                      variant='ghost'
                      size='icon'
                      onClick={() => handleRemoveColumn(index)}>
                      <X className='h-4 w-4' />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={handleAddColumn}
                className='mt-2'>
                <Plus className='h-4 w-4 mr-2' />
                Add Column
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant='outline' onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? 'Creating...' : 'Create Table'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
