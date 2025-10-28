import React, { useState, useEffect } from 'react'
import toast, { Toaster } from 'react-hot-toast'
import {
  Upload,
  Download,
  Trash2,
  Filter,
  BarChart3,
  FileText,
  Search,
  RefreshCw,
  Info,
  Database,
  Zap,
  Sparkles
} from 'lucide-react'

import { Button } from './components/Button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './components/Card'
import Input from './components/Input'
import NeonCursor from './components/NeonCursor'
import * as api from './lib/api'
import { storage, formatNumber } from './lib/utils'

function App() {
  const [currentDatasetId, setCurrentDatasetId] = useState(null)
  const [datasetInfo, setDatasetInfo] = useState(null)
  const [dataPreview, setDataPreview] = useState({ data: [], columns: [] })
  const [activeTab, setActiveTab] = useState('upload')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // NL Query state
  const [nlQuery, setNlQuery] = useState('')
  const [nlResult, setNlResult] = useState(null)

  // Transform state
  const [filterColumn, setFilterColumn] = useState('')
  const [filterOperator, setFilterOperator] = useState('equals')
  const [filterValue, setFilterValue] = useState('')

  // Missing values state
  const [missingStrategy, setMissingStrategy] = useState('mean')
  const [constantValue, setConstantValue] = useState('')
  const [selectedColumns, setSelectedColumns] = useState([])

  // Column type conversion state
  const [typeChangeColumn, setTypeChangeColumn] = useState(null)

  // Load dataset from localStorage on mount
  useEffect(() => {
    const savedDatasetId = storage.get('currentDatasetId')
    if (savedDatasetId) {
      setCurrentDatasetId(savedDatasetId)
      loadDataset(savedDatasetId)
    }
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (typeChangeColumn && !e.target.closest('.relative')) {
        setTypeChangeColumn(null)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [typeChangeColumn])

  // Save current dataset ID to localStorage
  useEffect(() => {
    if (currentDatasetId) {
      storage.set('currentDatasetId', currentDatasetId)
    }
  }, [currentDatasetId])

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
      toast.success('File uploaded successfully!', { icon: '✨' })
    } catch (err) {
      setError(err.message)
      toast.error(`Upload failed: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleMissingValues = async (strategy, columns = null, constantVal = null) => {
    try {
      setLoading(true)
      await api.handleMissingValues(currentDatasetId, strategy, columns, constantVal)
      await loadDataset(currentDatasetId)
      setActiveTab('data')
      const columnInfo = columns && columns.length > 0 ? ` on ${columns.length} column(s)` : ''
      toast.success(`Applied ${strategy} strategy${columnInfo}`, { icon: '⚡' })
      // Reset selections
      setSelectedColumns([])
      setConstantValue('')
    } catch (err) {
      setError(err.message)
      toast.error('Failed to handle missing values')
    } finally {
      setLoading(false)
    }
  }

  const handleApplyMissingStrategy = () => {
    const cols = selectedColumns.length > 0 ? selectedColumns : null
    const val = missingStrategy === 'constant' && constantValue ? constantValue : null
    handleMissingValues(missingStrategy, cols, val)
  }

  const handleChangeColumnType = async (column, targetType) => {
    try {
      setLoading(true)
      setTypeChangeColumn(null)

      // Map user-friendly type to pandas dtype
      const typeMapping = {
        'text': 'string',
        'integer': 'int',
        'float': 'float',
        'numeric': 'float',
        'boolean': 'bool',
        'datetime': 'datetime'
      }

      const pandasType = typeMapping[targetType] || targetType

      await api.transformColumns(currentDatasetId, 'cast', {
        column: column,
        dtype: pandasType
      })

      await loadDataset(currentDatasetId)
      toast.success(`Converted ${column} to ${targetType}`, { icon: '✨' })
    } catch (err) {
      setError(err.message)
      toast.error(`Type conversion failed: ${err.message}`)
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
        toast.success(`Removed ${result.removed} duplicate rows`, { icon: '🧹' })
      } else {
        toast('No duplicates found', { icon: '✓' })
      }
    } catch (err) {
      setError(err.message)
      toast.error('Failed to remove duplicates')
    } finally {
      setLoading(false)
    }
  }

  const handleFilter = async () => {
    if (!currentDatasetId || !filterColumn || !filterValue) {
      toast.error('Please select a column and enter a value')
      return
    }

    try {
      setLoading(true)
      await api.filterData(currentDatasetId, [{
        column: filterColumn,
        operator: filterOperator,
        value: filterValue
      }])
      await loadDataset(currentDatasetId)
      toast.success('Filter applied successfully!', { icon: '🎯' })
      setFilterColumn('')
      setFilterValue('')
    } catch (err) {
      setError(err.message)
      toast.error(`Error applying filter: ${err.message}`)
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
        setNlQuery('')
      }

      toast.success('Query executed successfully!', { icon: '🚀' })
    } catch (err) {
      setError(err.message)
      toast.error('Query failed')
    } finally {
      setLoading(false)
    }
  }

  const renderDataTable = () => {
    if (!dataPreview.data || dataPreview.data.length === 0) {
      return (
        <div className="text-center text-muted-foreground py-16">
          <Database className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p>No data to display</p>
        </div>
      )
    }

    return (
      <div className="overflow-x-auto rounded-lg">
        <table className="w-full data-grid">
          <thead>
            <tr>
              <th className="px-4 py-3 text-left">#</th>
              {dataPreview.columns.map((col) => (
                <th key={col} className="px-4 py-3 text-left">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataPreview.data.slice(0, 50).map((row, idx) => (
              <tr key={idx}>
                <td className="px-4 py-3 text-muted-foreground">{idx + 1}</td>
                {dataPreview.columns.map((col) => (
                  <td key={col} className="px-4 py-3">
                    {row[col] !== null && row[col] !== undefined
                      ? typeof row[col] === 'number'
                        ? formatNumber(row[col])
                        : String(row[col])
                      : <span className="italic text-muted-foreground">(empty)</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  const tabs = [
    { id: 'upload', label: 'Upload', icon: Upload },
    { id: 'data', label: 'Data', icon: Database },
    { id: 'clean', label: 'Clean', icon: Sparkles },
    { id: 'query', label: 'Query', icon: Zap },
    { id: 'export', label: 'Export', icon: Download },
  ]

  return (
    <div className="min-h-screen relative">
      <NeonCursor targetSelector=".cursor-target" />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(10px)',
            color: 'hsl(0, 0%, 98%)',
            border: '1px solid rgba(0, 240, 255, 0.2)',
          },
        }}
      />

      {/* Animated Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-neon opacity-50"></div>
        <div className="relative px-8 py-12">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-5xl font-bold text-gradient mb-3 animate-float">
              DATA ANALYZER
            </h1>
            <p className="text-muted-foreground text-lg">
              Ultra-professional data manipulation platform
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Tabs Navigation */}
        <div className="flex gap-3 mb-8 overflow-x-auto pb-2">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`cursor-target flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all duration-300 whitespace-nowrap ${
                activeTab === id
                  ? 'neon-border bg-primary/10 text-primary'
                  : 'bg-card hover:bg-muted text-foreground'
              }`}
            >
              <Icon className="w-5 h-5" />
              {label}
            </button>
          ))}
        </div>

        {/* Dataset Info Bar */}
        {datasetInfo && (
          <Card className="mb-8" glow>
            <CardContent className="!p-4">
              <div className="flex items-center gap-8">
                <div className="flex items-center gap-2">
                  <Info className="w-5 h-5 text-primary" />
                  <span className="text-sm font-medium">{datasetInfo.rows} rows</span>
                </div>
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-secondary" />
                  <span className="text-sm font-medium">{datasetInfo.columns} columns</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-accent" />
                  <span className="text-sm font-medium">{datasetInfo.file_type}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tab Content */}
        {activeTab === 'upload' && (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle neon>Upload Dataset</CardTitle>
              <CardDescription>Upload your data file to begin analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className="relative flex flex-col items-center justify-center p-16 neon-border rounded-xl transition-all duration-300 hover:scale-[1.02] cursor-pointer bg-gradient-neon"
                onClick={() => document.getElementById('file-upload').click()}
              >
                <Upload className="w-20 h-20 text-primary mb-6 animate-float" />
                <input
                  id="file-upload"
                  type="file"
                  accept=".csv,.xlsx,.xls,.json,.parquet"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={loading}
                />
                <h3 className="text-2xl font-semibold mb-2 text-gradient">
                  {loading ? 'Uploading...' : 'Drop your file here'}
                </h3>
                <p className="text-muted-foreground">
                  Supports CSV, Excel, JSON, Parquet
                </p>

                {loading && (
                  <div className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-xl flex items-center justify-center">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                      <p className="text-lg font-semibold text-primary">Processing...</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'data' && (
          <div className="space-y-6">
            {/* Data Info Panel */}
            {datasetInfo && dataPreview.columns.length > 0 && (
              <Card className="glass-card" glow>
                <CardHeader>
                  <CardTitle neon>Dataset Information</CardTitle>
                  <CardDescription>Comprehensive overview of your data</CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Statistics Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="p-4 rounded-lg neon-border bg-primary/5">
                      <div className="flex items-center gap-2 mb-2">
                        <Database className="w-5 h-5 text-primary" />
                        <span className="text-sm font-medium text-muted-foreground">Total Rows</span>
                      </div>
                      <p className="text-2xl font-bold text-primary">{formatNumber(datasetInfo.rows)}</p>
                    </div>
                    <div className="p-4 rounded-lg neon-border-purple bg-secondary/5">
                      <div className="flex items-center gap-2 mb-2">
                        <BarChart3 className="w-5 h-5 text-secondary" />
                        <span className="text-sm font-medium text-muted-foreground">Columns</span>
                      </div>
                      <p className="text-2xl font-bold text-secondary">{datasetInfo.columns}</p>
                    </div>
                    <div className="p-4 rounded-lg neon-border-pink bg-accent/5">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-5 h-5 text-accent" />
                        <span className="text-sm font-medium text-muted-foreground">File Type</span>
                      </div>
                      <p className="text-xl font-bold text-accent uppercase">{datasetInfo.file_type}</p>
                    </div>
                    <div className="p-4 rounded-lg neon-border bg-primary/5">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-5 h-5 text-primary" />
                        <span className="text-sm font-medium text-muted-foreground">Memory</span>
                      </div>
                      <p className="text-2xl font-bold text-primary">
                        {formatNumber(datasetInfo.rows * datasetInfo.columns)} cells
                      </p>
                    </div>
                  </div>

                  {/* Columns Details */}
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold text-gradient mb-4">Column Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {dataPreview.columns.map((col, idx) => {
                        // Calculate some stats for each column
                        const sampleValues = dataPreview.data
                          .slice(0, 10)
                          .map(row => row[col])
                          .filter(val => val !== null && val !== undefined && val !== '');
                        const hasNumbers = sampleValues.some(val => typeof val === 'number');
                        const type = hasNumbers ? 'numeric' : 'text';
                        const emptyCount = dataPreview.data
                          .slice(0, 50)
                          .filter(row => {
                            const val = row[col];
                            return val === null || val === undefined || val === '' ||
                                   (typeof val === 'string' && val.trim() === '');
                          }).length;

                        const currentDtype = datasetInfo?.dtypes?.[col] || 'object'
                        const displayType = currentDtype.includes('int') || currentDtype.includes('float')
                          ? 'numeric'
                          : currentDtype.includes('datetime')
                          ? 'datetime'
                          : currentDtype.includes('bool')
                          ? 'boolean'
                          : 'text'

                        return (
                          <div
                            key={col}
                            className="p-4 rounded-lg border border-border bg-card/50 hover:bg-card transition-colors"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-semibold text-foreground truncate flex-1">{col}</h4>
                              <div className="relative">
                                <button
                                  onClick={() => setTypeChangeColumn(typeChangeColumn === col ? null : col)}
                                  className={`cursor-target text-xs px-3 py-1.5 rounded-full transition-all hover:scale-105 ${
                                    displayType === 'numeric'
                                      ? 'bg-primary/20 text-primary hover:bg-primary/30'
                                      : displayType === 'datetime'
                                      ? 'bg-accent/20 text-accent hover:bg-accent/30'
                                      : displayType === 'boolean'
                                      ? 'bg-success/20 text-success hover:bg-success/30'
                                      : 'bg-secondary/20 text-secondary hover:bg-secondary/30'
                                  }`}
                                  title="Click to change data type"
                                >
                                  {displayType}
                                </button>

                                {typeChangeColumn === col && (
                                  <div className="fixed top-20 left-1/2 -translate-x-1/2 w-64 rounded-lg border-2 border-accent bg-background shadow-2xl z-[9999] p-4 animate-in fade-in zoom-in-95 duration-200">
                                    <div className="flex items-center justify-between mb-4">
                                      <p className="text-sm font-bold text-accent uppercase tracking-wide">Convert {col} to:</p>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setTypeChangeColumn(null)
                                        }}
                                        className="cursor-target text-muted-foreground hover:text-accent transition-colors"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                    <div className="space-y-2">
                                      {['text', 'integer', 'float', 'boolean', 'datetime'].map(targetType => (
                                        <button
                                          key={targetType}
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            handleChangeColumnType(col, targetType)
                                          }}
                                          className="cursor-target w-full text-left px-4 py-3 text-sm font-medium rounded-md hover:bg-accent/20 hover:text-accent transition-all border border-border hover:border-accent"
                                        >
                                          {targetType.charAt(0).toUpperCase() + targetType.slice(1)}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="space-y-1 text-sm text-muted-foreground">
                              <div className="flex justify-between">
                                <span>Empty:</span>
                                <span className={emptyCount > 0 ? 'text-destructive' : 'text-success'}>
                                  {emptyCount}/{Math.min(50, dataPreview.data.length)}
                                </span>
                              </div>
                              {sampleValues.length > 0 && (
                                <div className="mt-2 p-2 bg-muted/30 rounded text-xs">
                                  <span className="text-muted-foreground">Sample: </span>
                                  <span className="text-foreground">
                                    {String(sampleValues[0]).slice(0, 30)}
                                    {String(sampleValues[0]).length > 30 ? '...' : ''}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Data Table */}
            <Card className="glass-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle neon>Data Preview</CardTitle>
                    <CardDescription>
                      Showing first {Math.min(50, dataPreview.data.length)} rows
                    </CardDescription>
                  </div>
                  <Button
                    onClick={() => loadDataset(currentDatasetId)}
                    disabled={loading}
                    variant="ghost"
                    className="cursor-target"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {renderDataTable()}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'clean' && (
          <div className="space-y-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle neon>Data Cleaning</CardTitle>
                <CardDescription>Clean and prepare your data</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Missing Values Section */}
                  <div className="p-6 rounded-xl neon-border-purple bg-secondary/5">
                    <h3 className="text-xl font-bold text-gradient mb-4 flex items-center gap-2">
                      <Info className="w-6 h-6 text-secondary" />
                      Missing Values Handler
                    </h3>

                    {/* Missing Values Summary */}
                    {datasetInfo && datasetInfo.missing_values && (
                      <div className="mb-6 p-4 rounded-lg bg-muted/20 border border-border">
                        <h4 className="text-sm font-semibold text-muted-foreground mb-3">Missing Values Summary</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                          {Object.entries(datasetInfo.missing_values)
                            .filter(([_, count]) => count > 0)
                            .map(([col, count]) => (
                              <div key={col} className="p-2 rounded bg-destructive/10 border border-destructive/30">
                                <div className="text-xs text-muted-foreground truncate">{col}</div>
                                <div className="text-sm font-bold text-destructive">{count} missing</div>
                              </div>
                            ))}
                          {Object.values(datasetInfo.missing_values).every(count => count === 0) && (
                            <div className="col-span-full text-center text-success py-2">
                              No missing values found
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Strategy Selection */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Select Strategy
                        </label>
                        <select
                          value={missingStrategy}
                          onChange={(e) => setMissingStrategy(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-lg bg-input border border-border text-foreground focus:ring-2 focus:ring-secondary"
                          disabled={!currentDatasetId}
                        >
                          <option value="drop">Drop Rows with Missing Values</option>
                          <option value="mean">Fill with Mean (numeric columns)</option>
                          <option value="median">Fill with Median (numeric columns)</option>
                          <option value="mode">Fill with Mode (most frequent value)</option>
                          <option value="constant">Fill with Constant Value</option>
                          <option value="ffill">Forward Fill (use previous value)</option>
                          <option value="bfill">Backward Fill (use next value)</option>
                          <option value="interpolate">Interpolate (numeric columns)</option>
                        </select>
                      </div>

                      {/* Constant Value Input */}
                      {missingStrategy === 'constant' && (
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">
                            Constant Value
                          </label>
                          <Input
                            value={constantValue}
                            onChange={(e) => setConstantValue(e.target.value)}
                            placeholder="Enter value to fill missing data"
                          />
                        </div>
                      )}

                      {/* Column Selection */}
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Apply to Columns (optional - leave empty for all columns)
                        </label>
                        <div className="max-h-48 overflow-y-auto p-3 rounded-lg border border-border bg-muted/10">
                          <div className="space-y-2">
                            {dataPreview.columns.map((col) => {
                              const hasMissing = datasetInfo?.missing_values?.[col] > 0
                              return (
                                <label
                                  key={col}
                                  className="flex items-center gap-2 cursor-pointer hover:bg-muted/20 p-2 rounded transition-colors"
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedColumns.includes(col)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedColumns([...selectedColumns, col])
                                      } else {
                                        setSelectedColumns(selectedColumns.filter(c => c !== col))
                                      }
                                    }}
                                    className="w-4 h-4 rounded border-border text-secondary focus:ring-2 focus:ring-secondary"
                                  />
                                  <span className="text-sm text-foreground flex-1">{col}</span>
                                  {hasMissing && (
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/20 text-destructive">
                                      {datasetInfo.missing_values[col]} missing
                                    </span>
                                  )}
                                </label>
                              )
                            })}
                          </div>
                        </div>
                        {selectedColumns.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {selectedColumns.map((col) => (
                              <span
                                key={col}
                                className="px-2 py-1 rounded-full bg-secondary/20 text-secondary text-xs flex items-center gap-1"
                              >
                                {col}
                                <button
                                  onClick={() => setSelectedColumns(selectedColumns.filter(c => c !== col))}
                                  className="hover:text-destructive"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                            <button
                              onClick={() => setSelectedColumns([])}
                              className="px-2 py-1 rounded-full bg-destructive/20 text-destructive text-xs hover:bg-destructive/30"
                            >
                              Clear All
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Apply Button */}
                      <Button
                        onClick={handleApplyMissingStrategy}
                        disabled={!currentDatasetId || loading || (missingStrategy === 'constant' && !constantValue)}
                        loading={loading}
                        className="cursor-target w-full"
                        variant="neon"
                      >
                        <Sparkles className="w-5 h-5" />
                        Apply Missing Values Strategy
                      </Button>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-secondary">Duplicates</h3>
                    <Button
                      onClick={handleRemoveDuplicates}
                      disabled={!currentDatasetId || loading}
                      variant="accent"
                      className="cursor-target"
                    >
                      Remove Duplicates
                    </Button>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-accent">Filter Data</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <select
                        value={filterColumn}
                        onChange={(e) => setFilterColumn(e.target.value)}
                        className="px-4 py-2.5 rounded-lg bg-input border border-border text-foreground focus:ring-2 focus:ring-primary"
                        disabled={!currentDatasetId}
                      >
                        <option value="">Select Column</option>
                        {dataPreview.columns.map((col) => (
                          <option key={col} value={col}>{col}</option>
                        ))}
                      </select>
                      <select
                        value={filterOperator}
                        onChange={(e) => setFilterOperator(e.target.value)}
                        className="px-4 py-2.5 rounded-lg bg-input border border-border text-foreground focus:ring-2 focus:ring-primary"
                      >
                        <option value="equals">Equals</option>
                        <option value="not_equals">Not Equals</option>
                        <option value="contains">Contains</option>
                        <option value="greater_than">Greater Than</option>
                        <option value="less_than">Less Than</option>
                      </select>
                      <Input
                        value={filterValue}
                        onChange={(e) => setFilterValue(e.target.value)}
                        placeholder="Filter value"
                      />
                    </div>
                    <Button
                      onClick={handleFilter}
                      disabled={!currentDatasetId || loading}
                      className="cursor-target mt-4"
                    >
                      Apply Filter
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'query' && (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle neon>Natural Language Query</CardTitle>
              <CardDescription>Ask questions about your data in plain English</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Query Input */}
                <div className="flex gap-3">
                  <Input
                    value={nlQuery}
                    onChange={(e) => setNlQuery(e.target.value)}
                    placeholder="e.g., show me rows where age is greater than 30"
                    onKeyPress={(e) => e.key === 'Enter' && handleNLQuery()}
                    disabled={!currentDatasetId}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleNLQuery}
                    disabled={!currentDatasetId || !nlQuery.trim() || loading}
                    loading={loading}
                    className="cursor-target"
                  >
                    <Search className="w-5 h-5" />
                    Query
                  </Button>
                </div>

                {/* Query Result */}
                {nlResult && (
                  <div className="space-y-4">
                    <div className="p-4 neon-border rounded-lg bg-primary/5">
                      <p className="text-sm text-muted-foreground mb-2">Interpretation:</p>
                      <p className="text-foreground">{nlResult.interpretation}</p>
                      {nlResult.rows !== undefined && (
                        <p className="text-sm text-primary mt-2">{nlResult.rows} rows affected</p>
                      )}
                    </div>

                    {/* Query Results Table */}
                    {dataPreview.data && dataPreview.data.length > 0 && (
                      <Card className="glass-card">
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle neon>Query Results</CardTitle>
                              <CardDescription>
                                Showing {Math.min(50, dataPreview.data.length)} of {dataPreview.data.length} rows
                              </CardDescription>
                            </div>
                            <Button
                              onClick={() => setActiveTab('data')}
                              variant="ghost"
                              size="sm"
                              className="cursor-target"
                            >
                              View All Data
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="overflow-x-auto rounded-lg">
                            <table className="w-full data-grid">
                              <thead>
                                <tr>
                                  <th className="px-4 py-3 text-left">#</th>
                                  {dataPreview.columns.map((col) => (
                                    <th key={col} className="px-4 py-3 text-left">{col}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {dataPreview.data.slice(0, 50).map((row, idx) => (
                                  <tr key={idx}>
                                    <td className="px-4 py-3 text-muted-foreground">{idx + 1}</td>
                                    {dataPreview.columns.map((col) => (
                                      <td key={col} className="px-4 py-3">
                                        {row[col] !== null && row[col] !== undefined
                                          ? typeof row[col] === 'number'
                                            ? formatNumber(row[col])
                                            : String(row[col])
                                          : <span className="italic text-muted-foreground">(empty)</span>}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}

                {/* Dynamic Examples Section */}
                {dataPreview.columns.length > 0 && (
                  <div className="p-6 rounded-xl neon-border-pink bg-accent/5">
                    <h3 className="text-lg font-bold text-gradient mb-3 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-accent" />
                      Query Examples (Click to use)
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Try these queries with your current dataset columns
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {(() => {
                        const numericCols = dataPreview.columns.filter((col) => {
                          const sampleValues = dataPreview.data
                            .slice(0, 5)
                            .map(row => row[col])
                            .filter(val => val !== null && val !== undefined)
                          return sampleValues.some(val => typeof val === 'number')
                        })
                        const textCols = dataPreview.columns.filter((col) => {
                          const sampleValues = dataPreview.data
                            .slice(0, 5)
                            .map(row => row[col])
                            .filter(val => val !== null && val !== undefined)
                          return sampleValues.some(val => typeof val === 'string')
                        })
                        const firstCol = dataPreview.columns[0]
                        const secondCol = dataPreview.columns[1] || firstCol
                        const numCol = numericCols[0] || firstCol
                        const textCol = textCols[0] || firstCol

                        const examples = [
                          `show me all rows where ${numCol} is greater than 10`,
                          `filter rows where ${textCol} contains "test"`,
                          `show rows where ${firstCol} equals "value"`,
                          `display rows where ${numCol} is less than 100`,
                          `get rows where ${secondCol} is not null`,
                          `filter by ${textCol} starting with "A"`,
                          `show me top 10 rows sorted by ${numCol}`,
                          `find rows where ${numCol} is between 5 and 50`,
                        ]

                        return examples.map((example, idx) => (
                          <button
                            key={idx}
                            onClick={() => setNlQuery(example)}
                            className="p-3 rounded-lg border border-border bg-card/50 hover:bg-accent/10 hover:border-accent transition-all text-left group cursor-target"
                          >
                            <div className="flex items-start gap-2">
                              <Search className="w-4 h-4 text-accent mt-0.5 opacity-60 group-hover:opacity-100" />
                              <span className="text-sm text-foreground group-hover:text-accent transition-colors">
                                {example}
                              </span>
                            </div>
                          </button>
                        ))
                      })()}
                    </div>
                    <div className="mt-4 p-3 rounded-lg bg-muted/20 border border-border">
                      <p className="text-xs text-muted-foreground">
                        <strong className="text-foreground">Tip:</strong> You can use natural language to query your data.
                        Supported operations include: filter, show, display, get, find, where, equals, contains, greater than, less than, between, and more.
                      </p>
                    </div>
                  </div>
                )}

                {/* No Dataset Warning */}
                {!currentDatasetId && (
                  <div className="p-6 rounded-lg border border-border bg-muted/10 text-center">
                    <Database className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">
                      Upload a dataset first to use natural language queries
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'export' && (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle neon>Export Data</CardTitle>
              <CardDescription>Download your processed dataset</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {['csv', 'excel', 'json', 'parquet'].map((format) => (
                  <Button
                    key={format}
                    onClick={() => handleExport(format)}
                    disabled={!currentDatasetId || loading}
                    variant={format === 'csv' ? 'neon' : 'secondary'}
                    className="cursor-target"
                  >
                    <Download className="w-5 h-5" />
                    {format.toUpperCase()}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export default App
