import axios from 'axios'

// Use environment variable or fallback to proxy
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Upload file
export const uploadFile = async (file) => {
  const formData = new FormData()
  formData.append('file', file)

  const response = await api.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data
}

// Get dataset with pagination
export const getDataset = async (datasetId, limit = 100, offset = 0) => {
  const response = await api.get(`/datasets/${datasetId}`, {
    params: { limit, offset },
  })
  return response.data
}

// Get dataset info
export const getDatasetInfo = async (datasetId) => {
  const response = await api.get(`/datasets/${datasetId}/info`)
  return response.data
}

// List all datasets
export const listDatasets = async () => {
  const response = await api.get('/datasets')
  return response.data
}

// Delete dataset
export const deleteDataset = async (datasetId) => {
  const response = await api.delete(`/datasets/${datasetId}`)
  return response.data
}

// Reset dataset to original state
export const resetDataset = async (datasetId) => {
  const response = await api.post(`/datasets/${datasetId}/reset`)
  return response.data
}

// Delete specific rows by indices
export const deleteRows = async (datasetId, rowIndices) => {
  const response = await api.post('/datasets/delete-rows', {
    dataset_id: datasetId,
    row_indices: rowIndices,
  })
  return response.data
}

// Cleaning operations
export const handleMissingValues = async (datasetId, strategy, columns = null, constantValue = null) => {
  const response = await api.post('/clean/missing', {
    dataset_id: datasetId,
    strategy,
    columns,
    constant_value: constantValue,
  })
  return response.data
}

export const removeDuplicates = async (datasetId, keep = 'first', columns = null) => {
  const response = await api.post('/clean/duplicates', {
    dataset_id: datasetId,
    keep,
    columns,
  })
  return response.data
}

export const cleanText = async (datasetId, columns, operation, value = null, replacement = null) => {
  const response = await api.post('/clean/text', {
    dataset_id: datasetId,
    columns,
    operation,
    value,
    replacement,
  })
  return response.data
}

export const handleOutliers = async (datasetId, method, columns, action) => {
  const response = await api.post('/clean/outliers', {
    dataset_id: datasetId,
    method,
    columns,
    action,
  })
  return response.data
}

// Transformation operations
export const filterData = async (datasetId, conditions) => {
  const response = await api.post('/transform/filter', {
    dataset_id: datasetId,
    conditions,
  })
  return response.data
}

export const aggregateData = async (datasetId, groupBy, aggregations) => {
  const response = await api.post('/transform/aggregate', {
    dataset_id: datasetId,
    group_by: groupBy,
    aggregations,
  })
  return response.data
}

export const pivotData = async (datasetId, index, columns, values, aggfunc = 'sum') => {
  const response = await api.post('/transform/pivot', {
    dataset_id: datasetId,
    index,
    columns,
    values,
    aggfunc,
  })
  return response.data
}

export const transformColumns = async (datasetId, operation, params) => {
  const response = await api.post('/transform/columns', {
    dataset_id: datasetId,
    operation,
    params,
  })
  return response.data
}

// Analysis operations
export const getStatistics = async (datasetId, columns = null) => {
  const response = await api.get(`/analyze/statistics/${datasetId}`, {
    params: columns ? { columns: columns.join(',') } : {},
  })
  return response.data
}

export const getCorrelation = async (datasetId) => {
  const response = await api.get(`/analyze/correlation/${datasetId}`)
  return response.data
}

export const getSummary = async (datasetId) => {
  const response = await api.get(`/analyze/summary/${datasetId}`)
  return response.data
}

// Natural language query
export const executeNLQuery = async (datasetId, query) => {
  const response = await api.post('/query/nl', {
    dataset_id: datasetId,
    query,
  })
  return response.data
}

// Export data
export const exportData = async (datasetId, format) => {
  const response = await api.get(`/export/${datasetId}/${format}`, {
    responseType: 'blob',
  })
  return response.data
}

// AI Assistant
export const askAIAssistant = async (message, datasetId = null) => {
  const response = await api.post('/ai/assistant', {
    message,
    dataset_id: datasetId,
  })
  return response.data
}

export default api
