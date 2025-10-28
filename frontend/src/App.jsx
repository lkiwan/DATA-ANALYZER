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
  Sparkles,
  Code,
  Bot,
  Send
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

  // Code editor state
  const [customCode, setCustomCode] = useState('')
  const [codeLanguage, setCodeLanguage] = useState('python')
  const [codeOutput, setCodeOutput] = useState(null)
  const [codeError, setCodeError] = useState(null)

  // AI Assistant state
  const [aiMessages, setAiMessages] = useState([])
  const [aiInput, setAiInput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)

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
        'string': 'string',
        'integer': 'int',
        'int': 'int',
        'int64': 'int64',
        'int32': 'int32',
        'int16': 'int16',
        'int8': 'int8',
        'uint64': 'uint64',
        'uint32': 'uint32',
        'uint16': 'uint16',
        'uint8': 'uint8',
        'float': 'float',
        'float64': 'float64',
        'float32': 'float32',
        'numeric': 'numeric',
        'boolean': 'bool',
        'bool': 'bool',
        'datetime': 'datetime',
        'datetime64': 'datetime64'
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

  const handleAIMessage = async () => {
    if (!aiInput.trim()) return

    const userMessage = { role: 'user', content: aiInput }
    setAiMessages(prev => [...prev, userMessage])
    setAiInput('')
    setAiLoading(true)

    try {
      const response = await api.askAIAssistant(aiInput, currentDatasetId)
      console.log('AI Response:', response)

      if (!response || !response.message) {
        throw new Error('Invalid response from AI')
      }

      const aiMessage = {
        role: 'assistant',
        content: response.message,
        code: response.code
      }
      setAiMessages(prev => [...prev, aiMessage])
      toast.success('AI responded!', { icon: '🤖' })
    } catch (err) {
      console.error('AI Error:', err)
      toast.error('AI Assistant failed: ' + err.message)
      // Add error message to chat
      setAiMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error: ${err.message}. Please try again.`
      }])
    } finally {
      setAiLoading(false)
    }
  }

  const handleRunAICode = (code) => {
    setCustomCode(code)
    setActiveTab('code')
    toast.success('Code sent to Code Editor!', { icon: '📝' })
  }

  const handleExecuteCode = async () => {
    if (!currentDatasetId || !customCode.trim()) {
      toast.error('Please enter code to execute')
      return
    }

    try {
      setLoading(true)
      setCodeOutput(null)
      setCodeError(null)

      const response = await fetch('http://localhost:8000/api/execute/code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dataset_id: currentDatasetId,
          code: customCode,
          language: codeLanguage
        })
      })

      const result = await response.json()

      if (result.success) {
        setCodeOutput(result.output || 'Code executed successfully!')
        await loadDataset(currentDatasetId)
        setActiveTab('data')  // Switch to Data tab to show results
        toast.success('Code executed successfully! Check the Data tab.', { icon: '⚡' })
      } else {
        setCodeError(result.error)
        toast.error('Code execution failed')
      }
    } catch (err) {
      setCodeError(err.message)
      toast.error('Failed to execute code')
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
    { id: 'ai', label: 'AI Assistant', icon: Bot },
    { id: 'code', label: 'Code', icon: Code },
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
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div>
              <h1 className="text-5xl font-bold text-gradient mb-3 animate-float">
                DATA ANALYZER
              </h1>
              <p className="text-muted-foreground text-lg">
                Ultra-professional data manipulation platform
              </p>
            </div>
            {currentDatasetId && (
              <Button
                onClick={async () => {
                  if (window.confirm('Are you sure you want to reset all changes? This will restore the original uploaded data.')) {
                    try {
                      setLoading(true)
                      // Reset dataset to original state on backend
                      await api.resetDataset(currentDatasetId)
                      // Reload the dataset to get the reset data
                      await loadDataset(currentDatasetId)
                      setNlResult(null)
                      toast.success('Data restored to original state', { icon: '🔄' })
                    } catch (err) {
                      toast.error('Failed to reset data')
                      setError(err.message)
                    } finally {
                      setLoading(false)
                    }
                  }
                }}
                variant="ghost"
                className="cursor-target flex items-center gap-2 hover:bg-warning/20 hover:text-warning transition-all"
                disabled={loading}
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                Reset Changes
              </Button>
            )}
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
                                  <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 rounded-lg border-2 border-accent bg-background shadow-2xl z-[9999] p-3 animate-in fade-in zoom-in-95 duration-200 max-h-[70vh] overflow-y-auto">
                                    <div className="flex items-center justify-between mb-3">
                                      <p className="text-xs font-bold text-accent uppercase tracking-wide">Convert to:</p>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setTypeChangeColumn(null)
                                        }}
                                        className="cursor-target text-muted-foreground hover:text-accent transition-colors text-sm"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                    <div className="space-y-2">
                                      {/* Common Types */}
                                      <div>
                                        <p className="text-[10px] font-semibold text-muted-foreground mb-1 uppercase">Common</p>
                                        <div className="space-y-0.5">
                                          {['text', 'numeric', 'integer', 'float', 'boolean', 'datetime'].map(targetType => (
                                            <button
                                              key={targetType}
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                handleChangeColumnType(col, targetType)
                                              }}
                                              className="cursor-target w-full text-left px-2 py-1.5 text-xs font-medium rounded hover:bg-accent/20 hover:text-accent transition-all border border-border hover:border-accent"
                                            >
                                              {targetType.charAt(0).toUpperCase() + targetType.slice(1)}
                                            </button>
                                          ))}
                                        </div>
                                      </div>

                                      {/* Integer Types */}
                                      <div>
                                        <p className="text-[10px] font-semibold text-muted-foreground mb-1 uppercase">Integer</p>
                                        <div className="grid grid-cols-2 gap-0.5">
                                          {['int8', 'int16', 'int32', 'int64'].map(targetType => (
                                            <button
                                              key={targetType}
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                handleChangeColumnType(col, targetType)
                                              }}
                                              className="cursor-target text-left px-2 py-1.5 text-[10px] font-medium rounded hover:bg-accent/20 hover:text-accent transition-all border border-border hover:border-accent"
                                            >
                                              {targetType}
                                            </button>
                                          ))}
                                        </div>
                                      </div>

                                      {/* Unsigned Integer Types */}
                                      <div>
                                        <p className="text-[10px] font-semibold text-muted-foreground mb-1 uppercase">Unsigned</p>
                                        <div className="grid grid-cols-2 gap-0.5">
                                          {['uint8', 'uint16', 'uint32', 'uint64'].map(targetType => (
                                            <button
                                              key={targetType}
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                handleChangeColumnType(col, targetType)
                                              }}
                                              className="cursor-target text-left px-2 py-1.5 text-[10px] font-medium rounded hover:bg-accent/20 hover:text-accent transition-all border border-border hover:border-accent"
                                            >
                                              {targetType}
                                            </button>
                                          ))}
                                        </div>
                                      </div>

                                      {/* Float Types */}
                                      <div>
                                        <p className="text-[10px] font-semibold text-muted-foreground mb-1 uppercase">Float</p>
                                        <div className="grid grid-cols-2 gap-0.5">
                                          {['float32', 'float64'].map(targetType => (
                                            <button
                                              key={targetType}
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                handleChangeColumnType(col, targetType)
                                              }}
                                              className="cursor-target text-left px-2 py-1.5 text-[10px] font-medium rounded hover:bg-accent/20 hover:text-accent transition-all border border-border hover:border-accent"
                                            >
                                              {targetType}
                                            </button>
                                          ))}
                                        </div>
                                      </div>
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

        {activeTab === 'ai' && (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle neon>AI Assistant</CardTitle>
              <CardDescription>Ask me anything about your data - I'll generate code for you!</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">

                {/* Chat Messages */}
                <div className="h-96 overflow-y-auto p-4 rounded-lg bg-muted/10 border border-border">
                  {aiMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <Bot className="w-16 h-16 text-primary mb-4 opacity-50" />
                      <p className="text-muted-foreground mb-2">Hi! I'm your AI coding assistant.</p>
                      <p className="text-sm text-muted-foreground">Ask me things like:</p>
                      <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                        <li>"How do I filter my data?"</li>
                        <li>"Remove duplicate rows"</li>
                        <li>"Handle missing values"</li>
                        <li>"Sort by a column"</li>
                      </ul>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {aiMessages.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] rounded-lg p-4 ${
                            msg.role === 'user'
                              ? 'bg-primary/20 text-foreground'
                              : 'bg-accent/20 text-foreground'
                          }`}>
                            {msg.role === 'assistant' && <Bot className="w-5 h-5 inline-block mr-2 text-accent" />}
                            <div className="whitespace-pre-wrap">{msg.content}</div>

                            {msg.code && (
                              <div className="mt-3">
                                <pre className="text-xs bg-background/50 p-3 rounded border border-border overflow-x-auto font-mono">
                                  {msg.code}
                                </pre>
                                <Button
                                  onClick={() => handleRunAICode(msg.code)}
                                  variant="neon"
                                  size="sm"
                                  className="cursor-target mt-2"
                                >
                                  <Code className="w-4 h-4 mr-2" />
                                  Run it
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      {aiLoading && (
                        <div className="flex justify-start">
                          <div className="bg-accent/20 rounded-lg p-4">
                            <Bot className="w-5 h-5 inline-block mr-2 text-accent animate-pulse" />
                            <span className="text-muted-foreground">Thinking...</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Input */}
                <div className="flex gap-3">
                  <Input
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleAIMessage()}
                    placeholder="Ask me anything about your data... (e.g., 'How do I remove duplicates?')"
                    className="flex-1"
                    disabled={aiLoading}
                  />
                  <Button
                    onClick={handleAIMessage}
                    disabled={!aiInput.trim() || aiLoading}
                    variant="neon"
                    className="cursor-target"
                  >
                    <Send className="w-5 h-5" />
                  </Button>
                </div>

                {/* Suggestions */}
                {aiMessages.length === 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      'Filter my data',
                      'Remove duplicates',
                      'Handle missing values',
                      'Sort by column',
                      'Group and aggregate',
                      'Remove outliers'
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => {
                          setAiInput(suggestion)
                          setTimeout(() => handleAIMessage(), 100)
                        }}
                        className="cursor-target text-left px-4 py-2 rounded-lg border border-border bg-card/50 hover:bg-accent/10 hover:border-accent transition-all text-sm"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'code' && (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle neon>Python Code Editor</CardTitle>
              <CardDescription>Execute custom Python code to transform your data</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">

                {/* Code Editor */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Write Your Code
                  </label>
                  <textarea
                    value={customCode}
                    onChange={(e) => setCustomCode(e.target.value)}
                    placeholder="# Write your Python code here&#10;# Available variables:&#10;#   df - Your dataset (pandas DataFrame)&#10;#   pd - pandas module&#10;#   np - numpy module&#10;&#10;# Example:&#10;# df['new_column'] = df['existing_column'] * 2&#10;# print(df.head())"
                    className="w-full h-96 px-4 py-3 rounded-lg bg-input border border-border text-foreground font-mono text-sm focus:ring-2 focus:ring-primary resize-none"
                    disabled={!currentDatasetId}
                  />
                </div>

                {/* Execute Button */}
                <div className="flex gap-3">
                  <Button
                    onClick={handleExecuteCode}
                    disabled={!currentDatasetId || !customCode.trim() || loading}
                    loading={loading}
                    variant="neon"
                    className="cursor-target"
                  >
                    <Code className="w-5 h-5" />
                    Execute Code
                  </Button>
                  <Button
                    onClick={() => {
                      setCustomCode('')
                      setCodeOutput(null)
                      setCodeError(null)
                    }}
                    disabled={!customCode && !codeOutput && !codeError}
                    variant="ghost"
                    className="cursor-target"
                  >
                    Clear
                  </Button>
                </div>

                {/* Output Display */}
                {codeOutput && (
                  <div className="p-4 rounded-lg neon-border bg-primary/5">
                    <h4 className="text-sm font-semibold text-primary mb-2">Output:</h4>
                    <pre className="text-sm text-foreground whitespace-pre-wrap font-mono">{codeOutput}</pre>
                  </div>
                )}

                {/* Error Display */}
                {codeError && (
                  <div className="p-4 rounded-lg border border-destructive bg-destructive/5">
                    <h4 className="text-sm font-semibold text-destructive mb-2">Error:</h4>
                    <pre className="text-sm text-destructive whitespace-pre-wrap font-mono">{codeError}</pre>
                  </div>
                )}

                {/* Example Code Snippets */}
                <div className="p-6 rounded-xl neon-border-pink bg-accent/5">
                  <h3 className="text-lg font-bold text-gradient mb-3 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-accent" />
                    Example Code Snippets (Click to use)
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Common data transformation examples with your columns
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {(() => {
                      // Get actual column names from the dataset
                      const columns = dataPreview.data && dataPreview.data.length > 0 ? Object.keys(dataPreview.data[0]) : []

                      // Find numeric and text columns
                      let numericCols = []
                      let textCols = []

                      if (dataPreview.data && dataPreview.data.length > 0) {
                        numericCols = columns.filter(col => {
                          const sample = dataPreview.data[0][col]
                          return typeof sample === 'number' || !isNaN(Number(sample))
                        })
                        textCols = columns.filter(col => {
                          const sample = dataPreview.data[0][col]
                          return typeof sample === 'string' && isNaN(Number(sample))
                        })
                      }

                      // Select appropriate columns for examples
                      const col1 = numericCols[0] || columns[0] || 'column1'
                      const col2 = numericCols[1] || columns[1] || 'column2'
                      const numCol = numericCols[0] || columns[0] || 'column'
                      const catCol = textCols[0] || columns[0] || 'category'
                      const valCol = numericCols[0] || columns[0] || 'value'

                      return [
                        {
                          title: 'Add a calculated column',
                          code: `# Add a new column based on calculation\ndf['new_column'] = df['${col1}'] + df['${col2}']\nprint(df.head())`
                        },
                        {
                          title: 'Filter rows conditionally',
                          code: `# Filter rows based on condition\ndf = df[df['${numCol}'] > 100]\nprint(f'Filtered to {len(df)} rows')`
                        },
                        {
                          title: 'Remove outliers',
                          code: `# Remove outliers using IQR method\nQ1 = df['${numCol}'].quantile(0.25)\nQ3 = df['${numCol}'].quantile(0.75)\nIQR = Q3 - Q1\ndf = df[(df['${numCol}'] >= Q1 - 1.5*IQR) & (df['${numCol}'] <= Q3 + 1.5*IQR)]\nprint(f'Removed outliers, {len(df)} rows remaining')`
                        },
                        {
                          title: 'Normalize a column',
                          code: `# Normalize column to 0-1 range\ndf['normalized'] = (df['${numCol}'] - df['${numCol}'].min()) / (df['${numCol}'].max() - df['${numCol}'].min())\nprint(df[['${numCol}', 'normalized']].head())`
                        },
                        {
                          title: 'Group and aggregate',
                          code: `# Group by category and calculate mean\ngrouped = df.groupby('${catCol}')['${valCol}'].mean()\nprint(grouped)`
                        },
                        {
                          title: 'Handle missing values custom',
                          code: `# Fill missing with column mean\ndf['${numCol}'].fillna(df['${numCol}'].mean(), inplace=True)\nprint(f'Missing values: {df.isnull().sum().sum()}')`
                        },
                      ]
                    })().map((example, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCustomCode(example.code)}
                        className="p-3 rounded-lg border border-border bg-card/50 hover:bg-accent/10 hover:border-accent transition-all text-left group cursor-target"
                        disabled={!currentDatasetId}
                      >
                        <div className="flex items-start gap-2">
                          <Code className="w-4 h-4 text-accent mt-0.5 opacity-60 group-hover:opacity-100" />
                          <div className="flex-1">
                            <span className="text-sm font-semibold text-foreground group-hover:text-accent transition-colors block mb-1">
                              {example.title}
                            </span>
                            <span className="text-xs text-muted-foreground font-mono line-clamp-2">
                              {example.code.split('\n')[1]}
                            </span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="mt-4 p-3 rounded-lg bg-muted/20 border border-border">
                    <p className="text-xs text-muted-foreground">
                      <strong className="text-foreground">Security:</strong> Code execution is sandboxed. Only safe operations are allowed.
                      File I/O, imports, and dangerous operations are restricted.
                    </p>
                  </div>
                </div>

                {/* No Dataset Warning */}
                {!currentDatasetId && (
                  <div className="p-6 rounded-lg border border-border bg-muted/10 text-center">
                    <Database className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">
                      Upload a dataset first to use the code editor
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
