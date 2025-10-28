import React, { useState, useEffect, useCallback } from 'react'
import toast, { Toaster } from 'react-hot-toast'
import {
  Upload,
  Download,
  Trash2,
  Filter,
  BarChart3,
  Settings,
  FileText,
  Search,
  RefreshCw,
  Info,
  CheckCircle,
  X,
  Eye,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js'
import { Bar, Line, Pie, Scatter } from 'react-chartjs-2'

import Button from './components/Button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './components/Card'
import Input from './components/Input'
import TargetCursor from './components/TargetCursor'
import * as api from './lib/api'
import { storage, formatNumber, formatFileSize } from './lib/utils'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
)

function App() {
  const [currentDatasetId, setCurrentDatasetId] = useState(null)
  const [datasetInfo, setDatasetInfo] = useState(null)
  const [dataPreview, setDataPreview] = useState({ data: [], columns: [] })
  const [activeTab, setActiveTab] = useState('upload')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [statistics, setStatistics] = useState(null)
  const [correlation, setCorrelation] = useState(null)

  // NL Query state
  const [nlQuery, setNlQuery] = useState('')
  const [nlResult, setNlResult] = useState(null)
  const [queryHistory, setQueryHistory] = useState([])

  // Row review state
  const [reviewMode, setReviewMode] = useState(false)
  const [currentRowIndex, setCurrentRowIndex] = useState(0)
  const [rowsToDelete, setRowsToDelete] = useState([])

  // Filter state
  const [showOnlyEmptyRows, setShowOnlyEmptyRows] = useState(false)

  // Transform state
  const [filterColumn, setFilterColumn] = useState('')
  const [filterOperator, setFilterOperator] = useState('equals')
  const [filterValue, setFilterValue] = useState('')
  const [sortColumn, setSortColumn] = useState('')
  const [sortOrder, setSortOrder] = useState('asc')
  const [groupByColumn, setGroupByColumn] = useState('')
  const [aggColumn, setAggColumn] = useState('')
  const [aggFunction, setAggFunction] = useState('sum')
  const [oldColumnName, setOldColumnName] = useState('')
  const [newColumnName, setNewColumnName] = useState('')
  const [pivotIndex, setPivotIndex] = useState('')
  const [pivotColumns, setPivotColumns] = useState('')
  const [pivotValues, setPivotValues] = useState('')
  const [pivotAggfunc, setPivotAggfunc] = useState('sum')

  // Action history
  const [actionHistory, setActionHistory] = useState([])

  // Pagination for transform preview
  const [transformPage, setTransformPage] = useState(1)
  const rowsPerPage = 20

  // Load dataset from localStorage on mount
  useEffect(() => {
    const savedDatasetId = storage.get('currentDatasetId')
    if (savedDatasetId) {
      setCurrentDatasetId(savedDatasetId)
      loadDataset(savedDatasetId)
    }
  }, [])

  // Save current dataset ID to localStorage
  useEffect(() => {
    if (currentDatasetId) {
      storage.set('currentDatasetId', currentDatasetId)
    }
  }, [currentDatasetId])

  // Animations disabled for light theme

  const loadDataset = async (datasetId) => {
    try {
      setLoading(true)
      const [info, preview] = await Promise.all([
        api.getDatasetInfo(datasetId),
        api.getDataset(datasetId, 100, 0)
      ])
      setDatasetInfo(info)
      setDataPreview({ data: preview.data, columns: preview.columns })
      setError(null)
    } catch (err) {
      setError(err.message)
      toast.error('Failed to load dataset')
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    try {
      setLoading(true)
      const result = await api.uploadFile(file)
      setCurrentDatasetId(result.dataset_id)
      await loadDataset(result.dataset_id)
      setActiveTab('data')
      toast.success('File uploaded successfully!', { icon: '📁' })
    } catch (err) {
      setError(err.message)
      toast.error(`Upload failed: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleMissingValues = async (strategy) => {
    try {
      setLoading(true)
      await api.handleMissingValues(currentDatasetId, strategy)
      await loadDataset(currentDatasetId)
      setActiveTab('data')
      setError(null)
      toast.success(`Applied ${strategy} strategy to handle missing values`, {
        icon: '✨',
      })
    } catch (err) {
      setError(err.response?.data?.detail || err.message)
      toast.error('Failed to handle missing values')
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveDuplicates = async () => {
    try {
      setLoading(true)
      const result = await api.removeDuplicates(currentDatasetId, 'first')
      await loadDataset(currentDatasetId)
      setActiveTab('data')

      if (result.removed > 0) {
        setError(null)
        toast.success(`Removed ${result.removed} duplicate rows`, {
          description: `${result.remaining_rows} rows remaining`,
          icon: '🧹',
        })
      } else {
        setError(null)
        toast('No duplicates found in the dataset', {
          icon: '✓',
        })
      }
    } catch (err) {
      setError(err.response?.data?.detail || err.message)
      toast.error('Failed to remove duplicates')
    } finally {
      setLoading(false)
    }
  }

  const addToHistory = (action) => {
    const historyEntry = {
      timestamp: new Date().toLocaleTimeString(),
      action: action
    }
    setActionHistory([...actionHistory, historyEntry])
  }

  const handleFilter = async () => {
    if (!currentDatasetId || !filterColumn || !filterValue) {
      toast.error('Please select a column and enter a value to filter')
      return
    }

    try {
      setLoading(true)
      const result = await api.filterData(currentDatasetId, [{
        column: filterColumn,
        operator: filterOperator,
        value: filterValue
      }])
      await loadDataset(currentDatasetId)
      setTransformPage(1)
      addToHistory(`Filtered ${filterColumn} ${filterOperator} ${filterValue}`)
      setError(null)
      toast.success('Filter applied successfully!', {
        description: `${result.rows} rows remaining`,
        icon: '🎯',
      })
      setFilterColumn('')
      setFilterValue('')
    } catch (err) {
      setError(err.response?.data?.detail || err.message)
      toast.error(`Error applying filter: ${err.response?.data?.detail || err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSort = async () => {
    if (!currentDatasetId || !sortColumn) {
      toast.error('Please select a column to sort')
      return
    }

    try {
      setLoading(true)
      await api.transformColumns(currentDatasetId, 'sort', {
        column: sortColumn,
        ascending: sortOrder === 'asc'
      })
      await loadDataset(currentDatasetId)
      setTransformPage(1)
      addToHistory(`Sorted by ${sortColumn} (${sortOrder})`)
      toast.success(`Data sorted by ${sortColumn}`, {
        description: `Order: ${sortOrder}`,
        icon: '📊',
      })
      setError(null)
    } catch (err) {
      setError(err.response?.data?.detail || err.message)
      toast.error(err.response?.data?.detail || err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAggregate = async () => {
    if (!groupByColumn || !aggColumn) {
      toast.error('Please select group by column and aggregation column')
      return
    }

    try {
      setLoading(true)
      await api.aggregateData(currentDatasetId, [groupByColumn], {
        [aggColumn]: [aggFunction]
      })
      await loadDataset(currentDatasetId)
      setTransformPage(1)
      addToHistory(`Aggregated ${aggColumn} by ${groupByColumn} using ${aggFunction}`)
      toast.success('Data aggregated successfully!', { icon: '📈' })
      setError(null)
    } catch (err) {
      setError(err.response?.data?.detail || err.message)
      toast.error(err.response?.data?.detail || err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRenameColumn = async () => {
    if (!oldColumnName || !newColumnName) {
      toast.error('Please enter both old and new column names')
      return
    }

    try {
      setLoading(true)
      await api.transformColumns(currentDatasetId, 'rename', {
        columns: { [oldColumnName]: newColumnName }
      })
      await loadDataset(currentDatasetId)
      addToHistory(`Renamed ${oldColumnName} to ${newColumnName}`)
      toast.success('Column renamed successfully!', { icon: '✏️' })
      setOldColumnName('')
      setNewColumnName('')
      setError(null)
    } catch (err) {
      setError(err.response?.data?.detail || err.message)
      toast.error(err.response?.data?.detail || err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteColumn = async (columnName) => {
    const confirmed = window.confirm(`Are you sure you want to delete column "${columnName}"?`)
    if (!confirmed) return

    try {
      setLoading(true)
      await api.transformColumns(currentDatasetId, 'drop', {
        columns: [columnName]
      })
      await loadDataset(currentDatasetId)
      addToHistory(`Deleted column ${columnName}`)
      toast.success(`Column "${columnName}" deleted`, { icon: '🗑️' })
      setError(null)
    } catch (err) {
      setError(err.response?.data?.detail || err.message)
      toast.error(err.response?.data?.detail || err.message)
    } finally {
      setLoading(false)
    }
  }

  const handlePivot = async () => {
    if (!pivotIndex || !pivotColumns || !pivotValues) {
      toast.error('Please select index, columns, and values for pivot table')
      return
    }

    try {
      setLoading(true)
      await api.pivotData(currentDatasetId, pivotIndex, pivotColumns, pivotValues, pivotAggfunc)
      await loadDataset(currentDatasetId)
      setTransformPage(1)
      addToHistory(`Created pivot table`)
      toast.success('Pivot table created successfully!', { icon: '🔄' })
      setError(null)
    } catch (err) {
      setError(err.response?.data?.detail || err.message)
      toast.error(err.response?.data?.detail || err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async (format) => {
    try {
      setLoading(true)
      const blob = await api.exportData(currentDatasetId, format)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `dataset.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success(`Exported as ${format.toUpperCase()}`, { icon: '📥' })
    } catch (err) {
      toast.error('Export failed')
    } finally {
      setLoading(false)
    }
  }

  const handleNLQuery = async () => {
    if (!currentDatasetId || !nlQuery.trim()) return

    try {
      setLoading(true)
      const result = await api.executeNLQuery(currentDatasetId, nlQuery)
      setNlResult(result)

      if (result.success) {
        await loadDataset(currentDatasetId)

        const historyEntry = {
          query: nlQuery,
          timestamp: new Date().toLocaleTimeString(),
          interpretation: result.interpretation,
          rows: result.rows
        }
        setQueryHistory([historyEntry, ...queryHistory])
        setNlQuery('')
      }

      setError(null)
    } catch (err) {
      setError(err.response?.data?.detail || err.message)
      toast.error('Query failed')
    } finally {
      setLoading(false)
    }
  }

  const useExampleQuery = (exampleQuery) => {
    setNlQuery(exampleQuery)
  }

  const reuseQuery = (query) => {
    setNlQuery(query)
  }

  const startReview = () => {
    setReviewMode(true)
    setCurrentRowIndex(0)
    setRowsToDelete([])
  }

  const nextRow = () => {
    if (currentRowIndex < dataPreview.data.length - 1) {
      setCurrentRowIndex(currentRowIndex + 1)
    } else {
      setReviewMode(false)
      if (rowsToDelete.length === 0) {
        toast('Review complete! No rows marked for deletion', { icon: '✓' })
      }
    }
  }

  const markForDeletion = () => {
    setRowsToDelete([...rowsToDelete, currentRowIndex])
    nextRow()
  }

  const confirmDeletions = async () => {
    if (rowsToDelete.length === 0) {
      toast('No rows marked for deletion', { icon: 'ℹ️' })
      return
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete ${rowsToDelete.length} row(s)?`
    )

    if (confirmed) {
      try {
        setLoading(true)
        await api.deleteRows(currentDatasetId, rowsToDelete)
        await loadDataset(currentDatasetId)
        setReviewMode(false)
        setCurrentRowIndex(0)
        setRowsToDelete([])
        setActiveTab('data')
        toast.success(`Deleted ${rowsToDelete.length} row(s) from dataset`, { icon: '🗑️' })
        setError(null)
      } catch (err) {
        setError(err.message)
        toast.error(`Error deleting rows: ${err.message}`)
      } finally {
        setLoading(false)
      }
    }
  }

  const loadStatistics = async () => {
    try {
      setLoading(true)
      const stats = await api.getStatistics(currentDatasetId)
      setStatistics(stats)
    } catch (err) {
      setError(err.message)
      toast.error('Failed to load statistics')
    } finally {
      setLoading(false)
    }
  }

  const renderStatistics = () => {
    if (!statistics) return null
    
    return (
      <div className="space-y-4">
        {Object.entries(statistics).map(([column, stats]) => (
          <Card key={column}>
            <CardHeader>
              <CardTitle className="text-lg">{column}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(stats).map(([key, value]) => (
                  <div key={key}>
                    <div className="text-sm text-muted-foreground">{key}</div>
                    <div className="text-lg font-semibold">{formatNumber(value)}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const renderDataTable = () => {
    if (!dataPreview.data || dataPreview.data.length === 0) {
      return <div className="text-center text-muted-foreground py-8">No data to display</div>
    }

    const filteredData = showOnlyEmptyRows 
      ? dataPreview.data.filter(row => 
          dataPreview.columns.some(col => {
            const value = row[col]
            return value === null || value === undefined || value === '' || 
                   (typeof value === 'string' && value.trim() === '')
          })
        )
      : dataPreview.data

    if (filteredData.length === 0) {
      return <div className="text-center text-muted-foreground py-8">No empty rows found</div>
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground w-16">
                #
              </th>
              {dataPreview.columns.map((col) => (
                <th key={col} className="px-4 py-3 text-left text-sm font-semibold">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredData.map((row, idx) => {
              const originalIdx = dataPreview.data.indexOf(row)
              return (
                <tr key={originalIdx} className="border-b hover:bg-muted/30">
                  <td className="px-4 py-3 text-sm text-muted-foreground font-mono">
                    {originalIdx + 1}
                  </td>
                  {dataPreview.columns.map((col) => {
                    const value = row[col]
                    const isEmpty = value === null || value === undefined || value === '' ||
                                    (typeof value === 'string' && value.trim() === '')

                    return (
                      <td
                        key={col}
                        className={`px-4 py-3 text-sm ${
                          isEmpty
                            ? 'bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 italic'
                            : ''
                        }`}
                        title={isEmpty ? 'Empty or missing value' : ''}
                      >
                        {isEmpty
                          ? '(empty)'
                          : typeof value === 'number'
                          ? formatNumber(value)
                          : String(value)}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  const renderTransformDataTable = () => {
    if (!dataPreview.data || dataPreview.data.length === 0) {
      return <div className="text-center text-muted-foreground py-8">No data to display</div>
    }

    const totalRows = dataPreview.data.length
    const totalPages = Math.ceil(totalRows / rowsPerPage)
    const startIdx = (transformPage - 1) * rowsPerPage
    const endIdx = Math.min(startIdx + rowsPerPage, totalRows)
    const paginatedData = dataPreview.data.slice(startIdx, endIdx)

    return (
      <div className="space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground w-16">#</th>
                {dataPreview.columns.map((col) => (
                  <th key={col} className="px-4 py-3 text-left text-sm font-semibold">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((row, idx) => {
                const actualIdx = startIdx + idx
                return (
                  <tr key={actualIdx} className="border-b hover:bg-muted/30">
                    <td className="px-4 py-3 text-sm text-muted-foreground font-mono">
                      {actualIdx + 1}
                    </td>
                    {dataPreview.columns.map((col) => {
                      const value = row[col]
                      const isEmpty = value === null || value === undefined || value === '' ||
                                      (typeof value === 'string' && value.trim() === '')

                      return (
                        <td
                          key={col}
                          className={`px-4 py-3 text-sm ${
                            isEmpty ? 'bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 italic' : ''
                          }`}
                        >
                          {isEmpty ? '(empty)' : typeof value === 'number' ? formatNumber(value) : String(value)}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t pt-4">
          <div className="text-sm text-muted-foreground">
            Showing {startIdx + 1} to {endIdx} of {totalRows} rows
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTransformPage(Math.max(1, transformPage - 1))}
              disabled={transformPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>
            <div className="text-sm">
              Page {transformPage} of {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTransformPage(Math.min(totalPages, transformPage + 1))}
              disabled={transformPage === totalPages}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: '#f9fafb' }}>
      <TargetCursor targetSelector=".tab-button" spinDuration={100000} hideDefaultCursor={true} />

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'var(--bg-elevated)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: 'var(--success)',
              secondary: '#fff',
            },
          },
          error: {
            duration: 4000,
            iconTheme: {
              primary: 'var(--error)',
              secondary: '#fff',
            },
          },
        }}
      />
      {/* Header */}
      <header style={{ background: '#ffffff', borderBottom: '1px solid #e5e7eb', boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)' }}>
        <div className="container mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#111827', marginBottom: '4px' }}>Data Analyzer</h1>
              <p style={{ fontSize: '14px', color: '#6b7280' }}>
                Advanced Data Manipulation & Analysis Tool
              </p>
            </div>
            {currentDatasetId && (
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => handleExport('csv')}>
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
                <Button variant="outline" onClick={() => handleExport('xlsx')}>
                  <Download className="w-4 h-4 mr-2" />
                  Export Excel
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content container mx-auto px-4 py-6" style={{ position: 'relative', zIndex: 1 }}>
        {/* Tabs */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <TabButton
            active={activeTab === 'upload'}
            onClick={() => setActiveTab('upload')}
            icon={<Upload className="w-4 h-4" />}
          >
            Upload
          </TabButton>
          <TabButton
            active={activeTab === 'data'}
            onClick={() => setActiveTab('data')}
            disabled={!currentDatasetId}
            icon={<FileText className="w-4 h-4" />}
          >
            Data
          </TabButton>
          <TabButton
            active={activeTab === 'clean'}
            onClick={() => setActiveTab('clean')}
            disabled={!currentDatasetId}
            icon={<Settings className="w-4 h-4" />}
          >
            Clean
          </TabButton>
          <TabButton
            active={activeTab === 'transform'}
            onClick={() => setActiveTab('transform')}
            disabled={!currentDatasetId}
            icon={<Filter className="w-4 h-4" />}
          >
            Transform
          </TabButton>
          <TabButton
            active={activeTab === 'analyze'}
            onClick={() => setActiveTab('analyze')}
            disabled={!currentDatasetId}
            icon={<BarChart3 className="w-4 h-4" />}
          >
            Analyze
          </TabButton>
          <TabButton
            active={activeTab === 'query'}
            onClick={() => setActiveTab('query')}
            disabled={!currentDatasetId}
            icon={<Search className="w-4 h-4" />}
          >
            NL Query
          </TabButton>
          <TabButton
            active={activeTab === 'review'}
            onClick={() => setActiveTab('review')}
            disabled={!currentDatasetId}
            icon={<Eye className="w-4 h-4" />}
          >
            Review Rows
          </TabButton>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-destructive/10 border border-destructive text-destructive rounded-lg">
            {error}
          </div>
        )}

        {/* Tab Content */}
        <div className="space-y-6">
          {/* Upload Tab */}
          {activeTab === 'upload' && (
            <Card className="upload-card">
              <CardHeader>
                <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Upload Dataset
                </CardTitle>
                <CardDescription className="text-base">
                  Drag and drop your file here, or click to browse
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  className="upload-dropzone relative flex flex-col items-center justify-center p-12 border-3 border-dashed rounded-2xl transition-all duration-300 hover:border-blue-500 hover:bg-blue-50/50 cursor-pointer group"
                  style={{
                    borderColor: '#cbd5e1',
                    minHeight: '320px',
                    background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)'
                  }}
                  onDragOver={(e) => {
                    e.preventDefault()
                    e.currentTarget.style.borderColor = '#3b82f6'
                    e.currentTarget.style.background = 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)'
                  }}
                  onDragLeave={(e) => {
                    e.currentTarget.style.borderColor = '#cbd5e1'
                    e.currentTarget.style.background = 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)'
                  }}
                  onDrop={(e) => {
                    e.preventDefault()
                    e.currentTarget.style.borderColor = '#cbd5e1'
                    e.currentTarget.style.background = 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)'
                    if (e.dataTransfer.files.length > 0) {
                      handleFileUpload({ target: { files: [e.dataTransfer.files[0]] } })
                    }
                  }}
                  onClick={() => document.getElementById('file-upload-input').click()}
                >
                  <div className="upload-icon-wrapper mb-6 p-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 group-hover:scale-110 transition-transform duration-300">
                    <Upload className="w-16 h-16 text-white animate-float" />
                  </div>

                  <input
                    id="file-upload-input"
                    type="file"
                    accept=".csv,.xlsx,.xls,.json,.parquet"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={loading}
                  />

                  <h3 className="text-xl font-semibold mb-2 text-gray-800">
                    {loading ? 'Uploading...' : 'Drop your file here'}
                  </h3>
                  <p className="text-sm text-gray-600 mb-6">
                    or click to browse from your computer
                  </p>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                    {[
                      { ext: 'CSV', color: 'from-green-400 to-green-600', icon: '📊' },
                      { ext: 'Excel', color: 'from-emerald-400 to-emerald-600', icon: '📈' },
                      { ext: 'JSON', color: 'from-yellow-400 to-yellow-600', icon: '📋' },
                      { ext: 'Parquet', color: 'from-orange-400 to-orange-600', icon: '📦' }
                    ].map((format) => (
                      <div
                        key={format.ext}
                        className="flex flex-col items-center p-3 rounded-lg bg-white shadow-sm border border-gray-200 group-hover:shadow-md transition-shadow"
                      >
                        <div className={`text-2xl mb-1 bg-gradient-to-br ${format.color} w-10 h-10 rounded-lg flex items-center justify-center`}>
                          {format.icon}
                        </div>
                        <span className="text-xs font-medium text-gray-700">{format.ext}</span>
                      </div>
                    ))}
                  </div>

                  {loading && (
                    <div className="absolute inset-0 bg-white/90 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                      <div className="flex flex-col items-center">
                        <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mb-4"></div>
                        <p className="text-lg font-semibold text-gray-700">Processing your file...</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-blue-900 mb-1">File Requirements</h4>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>• Maximum file size: 50 MB</li>
                        <li>• Supported formats: CSV, Excel (.xlsx, .xls), JSON, Parquet</li>
                        <li>• First row should contain column headers</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Data Tab */}
          {activeTab === 'data' && currentDatasetId && (
            <>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Dataset Information</CardTitle>
                    <Button variant="outline" size="sm" onClick={() => loadDataset(currentDatasetId)}>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refresh
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {datasetInfo && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-sm font-semibold mb-3">Overview</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <InfoItem label="Rows" value={datasetInfo.shape[0]} />
                          <InfoItem label="Columns" value={datasetInfo.shape[1]} />
                          <InfoItem label="Duplicates" value={datasetInfo.duplicate_rows || 0} />
                          <InfoItem label="Memory" value={formatFileSize(datasetInfo.memory_usage || 0)} />
                        </div>
                      </div>

                      {datasetInfo.missing_values && Object.keys(datasetInfo.missing_values).length > 0 && (
                        <div>
                          <h3 className="text-sm font-semibold mb-3">Missing Values by Column</h3>
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {Object.entries(datasetInfo.missing_values).map(([col, count]) => {
                              const percentage = datasetInfo.shape[0] > 0
                                ? ((count / datasetInfo.shape[0]) * 100).toFixed(1)
                                : 0
                              const hasIssue = count > 0

                              return (
                                <div key={col} className={`p-3 rounded-lg border ${
                                  hasIssue
                                    ? 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20'
                                    : 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/20'
                                }`}>
                                  <div className="text-xs font-medium truncate" title={col}>{col}</div>
                                  <div className={`text-lg font-bold mt-1 ${
                                    hasIssue ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                                  }`}>
                                    {count}
                                    {hasIssue && <span className="text-xs ml-1">({percentage}%)</span>}
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {hasIssue ? 'missing' : 'complete'}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {datasetInfo.dtypes && Object.keys(datasetInfo.dtypes).length > 0 && (
                        <div>
                          <h3 className="text-sm font-semibold mb-3">Column Data Types</h3>
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                            {Object.entries(datasetInfo.dtypes).map(([col, dtype]) => (
                              <div key={col} className="flex items-center justify-between p-2 rounded border text-xs">
                                <span className="font-medium truncate mr-2" title={col}>{col}</span>
                                <span className="text-muted-foreground bg-muted px-2 py-1 rounded">{dtype}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Data Preview</CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowOnlyEmptyRows(!showOnlyEmptyRows)}
                    >
                      {showOnlyEmptyRows ? 'Show All' : 'Show Empty Rows'}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {renderDataTable()}
                </CardContent>
              </Card>
            </>
          )}

          {/* Clean Tab */}
          {activeTab === 'clean' && currentDatasetId && (
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Handle Missing Values</CardTitle>
                  <CardDescription>Choose a strategy to handle missing data</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button onClick={() => handleMissingValues('mean')} disabled={loading} className="w-full">
                    Fill with Mean
                  </Button>
                  <Button onClick={() => handleMissingValues('median')} disabled={loading} className="w-full">
                    Fill with Median
                  </Button>
                  <Button onClick={() => handleMissingValues('mode')} disabled={loading} className="w-full">
                    Fill with Mode
                  </Button>
                  <Button onClick={() => handleMissingValues('ffill')} disabled={loading} className="w-full">
                    Forward Fill
                  </Button>
                  <Button onClick={() => handleMissingValues('bfill')} disabled={loading} className="w-full">
                    Backward Fill
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Remove Duplicates</CardTitle>
                  <CardDescription>Remove duplicate rows from dataset</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={handleRemoveDuplicates} disabled={loading} className="w-full">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remove Duplicates
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Transform Tab */}
          {activeTab === 'transform' && currentDatasetId && (
            <div className="space-y-6">
              {actionHistory.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Action History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {actionHistory.map((item, idx) => (
                        <div key={idx} className="text-sm p-2 bg-muted rounded">
                          <span className="font-mono text-xs text-muted-foreground mr-2">
                            {item.timestamp}
                          </span>
                          {item.action}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Filter Data</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium">Column</label>
                      <select
                        className="w-full mt-1 p-2 border rounded"
                        value={filterColumn}
                        onChange={(e) => setFilterColumn(e.target.value)}
                      >
                        <option value="">Select column</option>
                        {dataPreview.columns.map(col => (
                          <option key={col} value={col}>{col}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Operator</label>
                      <select
                        className="w-full mt-1 p-2 border rounded"
                        value={filterOperator}
                        onChange={(e) => setFilterOperator(e.target.value)}
                      >
                        <option value="equals">Equals</option>
                        <option value="not_equals">Not Equals</option>
                        <option value="greater_than">Greater Than</option>
                        <option value="less_than">Less Than</option>
                        <option value="contains">Contains</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Value</label>
                      <Input
                        value={filterValue}
                        onChange={(e) => setFilterValue(e.target.value)}
                        placeholder="Enter value"
                      />
                    </div>
                  </div>
                  <Button onClick={handleFilter} disabled={loading}>
                    Apply Filter
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Sort Data</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Column</label>
                      <select
                        className="w-full mt-1 p-2 border rounded"
                        value={sortColumn}
                        onChange={(e) => setSortColumn(e.target.value)}
                      >
                        <option value="">Select column</option>
                        {dataPreview.columns.map(col => (
                          <option key={col} value={col}>{col}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Order</label>
                      <select
                        className="w-full mt-1 p-2 border rounded"
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value)}
                      >
                        <option value="asc">Ascending</option>
                        <option value="desc">Descending</option>
                      </select>
                    </div>
                  </div>
                  <Button onClick={handleSort} disabled={loading}>
                    Sort Data
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Group By & Aggregate</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium">Group By</label>
                      <select
                        className="w-full mt-1 p-2 border rounded"
                        value={groupByColumn}
                        onChange={(e) => setGroupByColumn(e.target.value)}
                      >
                        <option value="">Select column</option>
                        {dataPreview.columns.map(col => (
                          <option key={col} value={col}>{col}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Aggregate Column</label>
                      <select
                        className="w-full mt-1 p-2 border rounded"
                        value={aggColumn}
                        onChange={(e) => setAggColumn(e.target.value)}
                      >
                        <option value="">Select column</option>
                        {dataPreview.columns.map(col => (
                          <option key={col} value={col}>{col}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Function</label>
                      <select
                        className="w-full mt-1 p-2 border rounded"
                        value={aggFunction}
                        onChange={(e) => setAggFunction(e.target.value)}
                      >
                        <option value="sum">Sum</option>
                        <option value="mean">Mean</option>
                        <option value="count">Count</option>
                        <option value="min">Min</option>
                        <option value="max">Max</option>
                      </select>
                    </div>
                  </div>
                  <Button onClick={handleAggregate} disabled={loading}>
                    Aggregate Data
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Column Management</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold mb-2">Rename Column</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <select
                        className="w-full p-2 border rounded"
                        value={oldColumnName}
                        onChange={(e) => setOldColumnName(e.target.value)}
                      >
                        <option value="">Select column</option>
                        {dataPreview.columns.map(col => (
                          <option key={col} value={col}>{col}</option>
                        ))}
                      </select>
                      <Input
                        placeholder="New name"
                        value={newColumnName}
                        onChange={(e) => setNewColumnName(e.target.value)}
                      />
                    </div>
                    <Button onClick={handleRenameColumn} disabled={loading} className="mt-2">
                      Rename
                    </Button>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold mb-2">Delete Column</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {dataPreview.columns.map(col => (
                        <Button
                          key={col}
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteColumn(col)}
                        >
                          <X className="w-4 h-4 mr-1" />
                          {col}
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Create Pivot Table</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium">Index</label>
                      <select
                        className="w-full mt-1 p-2 border rounded"
                        value={pivotIndex}
                        onChange={(e) => setPivotIndex(e.target.value)}
                      >
                        <option value="">Select column</option>
                        {dataPreview.columns.map(col => (
                          <option key={col} value={col}>{col}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Columns</label>
                      <select
                        className="w-full mt-1 p-2 border rounded"
                        value={pivotColumns}
                        onChange={(e) => setPivotColumns(e.target.value)}
                      >
                        <option value="">Select column</option>
                        {dataPreview.columns.map(col => (
                          <option key={col} value={col}>{col}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Values</label>
                      <select
                        className="w-full mt-1 p-2 border rounded"
                        value={pivotValues}
                        onChange={(e) => setPivotValues(e.target.value)}
                      >
                        <option value="">Select column</option>
                        {dataPreview.columns.map(col => (
                          <option key={col} value={col}>{col}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <Button onClick={handlePivot} disabled={loading}>
                    Create Pivot Table
                  </Button>
                </CardContent>
              </Card>

              {dataPreview.data.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Data Preview</CardTitle>
                    <CardDescription>Current dataset after transformations</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {renderTransformDataTable()}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Analyze Tab */}
          {activeTab === 'analyze' && currentDatasetId && (
            <>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Statistical Analysis</CardTitle>
                    <Button
                      onClick={loadStatistics}
                      disabled={loading}
                      size="sm"
                    >
                      Generate Statistics
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {statistics ? renderStatistics() : (
                    <div className="text-center text-muted-foreground py-8">
                      Click "Generate Statistics" to see descriptive statistics
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {/* NL Query Tab */}
          {activeTab === 'query' && currentDatasetId && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Natural Language Query</CardTitle>
                  <CardDescription>
                    Ask questions in plain English or use the examples below
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter your query..."
                      value={nlQuery}
                      onChange={(e) => setNlQuery(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleNLQuery()}
                      disabled={loading}
                    />
                    <Button onClick={handleNLQuery} disabled={loading || !nlQuery.trim()}>
                      <Search className="w-4 h-4 mr-2" />
                      Execute
                    </Button>
                  </div>

                  {nlResult && (
                    <div className={`p-4 rounded-lg ${nlResult.success ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'}`}>
                      {nlResult.success ? (
                        <>
                          <div className="font-medium text-green-900 dark:text-green-100 mb-2">
                            Query successful!
                          </div>
                          <div className="text-sm text-green-800 dark:text-green-200">
                            {nlResult.interpretation}
                          </div>
                          {nlResult.rows !== undefined && (
                            <div className="text-sm text-green-700 dark:text-green-300 mt-1">
                              Returned {nlResult.rows} rows
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-red-900 dark:text-red-100">
                          {nlResult.error}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Example Queries</CardTitle>
                  <CardDescription>
                    Click on any example to use it
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      { label: 'Filter by condition', query: 'filter where age > 30' },
                      { label: 'Sort ascending', query: 'sort by salary asc' },
                      { label: 'Sort descending', query: 'sort by age desc' },
                      { label: 'Get top rows', query: 'top 10 rows' },
                      { label: 'Get bottom rows', query: 'bottom 5 rows' },
                      { label: 'Select columns', query: 'select name, age, salary' },
                      { label: 'Group by column', query: 'group by department' },
                      { label: 'Filter text', query: 'filter where city contains New' },
                      { label: 'Multiple conditions', query: 'filter where age > 25 and salary < 80000' },
                      { label: 'Show all rows', query: 'show all' }
                    ].map((example, idx) => (
                      <Button
                        key={idx}
                        variant="outline"
                        className="justify-start h-auto py-3 px-4"
                        onClick={() => useExampleQuery(example.query)}
                      >
                        <div className="text-left">
                          <div className="font-medium text-sm">{example.label}</div>
                          <div className="text-xs text-muted-foreground mt-1 font-mono">
                            {example.query}
                          </div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {queryHistory.length > 0 && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Query History</CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setQueryHistory([])}
                      >
                        Clear History
                      </Button>
                    </div>
                    <CardDescription>
                      Click on any query to reuse it
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {queryHistory.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-lg border bg-card hover:bg-accent/50 cursor-pointer transition-colors"
                          onClick={() => reuseQuery(item.query)}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="font-mono text-sm font-medium break-all">
                                {item.query}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {item.interpretation}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {item.rows !== undefined && `${item.rows} rows • `}
                                {item.timestamp}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                reuseQuery(item.query)
                              }}
                            >
                              <Search className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Review Rows Tab */}
          {activeTab === 'review' && currentDatasetId && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Review Rows</CardTitle>
                    <CardDescription>
                      Review each row individually and decide whether to keep or delete it
                    </CardDescription>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Row {currentRowIndex + 1} of {dataPreview.data.length}
                    {rowsToDelete.length > 0 && (
                      <span className="ml-2 text-destructive font-medium">
                        ({rowsToDelete.length} marked for deletion)
                      </span>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {!reviewMode ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">
                      Start reviewing rows to mark them for deletion
                    </p>
                    <Button onClick={startReview}>
                      Start Review
                    </Button>
                  </div>
                ) : currentRowIndex < dataPreview.data.length ? (
                  <div className="space-y-4">
                    <div className="p-4 border rounded-lg">
                      {dataPreview.columns.map(col => (
                        <div key={col} className="grid grid-cols-2 gap-4 py-2 border-b last:border-0">
                          <div className="font-medium">{col}</div>
                          <div>{String(dataPreview.data[currentRowIndex][col] || '(empty)')}</div>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2 justify-center">
                      <Button variant="outline" onClick={nextRow}>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Keep
                      </Button>
                      <Button variant="destructive" onClick={markForDeletion}>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                    {rowsToDelete.length > 0 && (
                      <div className="flex justify-center pt-4">
                        <Button onClick={confirmDeletions}>
                          Confirm Deletions ({rowsToDelete.length} rows)
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">
                      Review complete!
                    </p>
                    {rowsToDelete.length > 0 && (
                      <Button onClick={confirmDeletions}>
                        Confirm Deletions ({rowsToDelete.length} rows)
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}

function TabButton({ active, onClick, disabled, icon, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`tab-button flex items-center gap-2 px-4 py-2 font-medium transition-colors border-b-2 whitespace-nowrap ${
        active
          ? 'border-primary text-primary'
          : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      style={{
        color: active ? 'var(--accent-primary)' : 'var(--text-tertiary)',
        borderColor: active ? 'var(--accent-primary)' : 'transparent'
      }}
    >
      {icon}
      {children}
    </button>
  )
}

function InfoItem({ label, value }) {
  return (
    <div className="space-y-1">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  )
}

export default App
