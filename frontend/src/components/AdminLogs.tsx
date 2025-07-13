import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  Button,
  Card,
  CardContent,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Badge
} from '@mui/material';
import {
  Refresh,
  Visibility,
  Retry,
  Warning,
  CheckCircle,
  Error,
  Schedule,
  TrendingUp
} from '@mui/icons-material';
import { format } from 'date-fns';
import axios from 'axios';
import { config } from '../config/config';

interface LogEntry {
  _id: string;
  platforms: string[];
  contentType: string;
  content: {
    text?: string;
    media?: any[];
  };
  scheduledFor: string;
  status: 'scheduled' | 'published' | 'failed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  errorMessage?: string;
  retryCount?: number;
  userId?: {
    username: string;
    email: string;
  };
}

interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

interface SystemHealth {
  status: string;
  timestamp: string;
  queue: QueueStats;
  content: {
    failed: number;
    pending: number;
  };
}

const AdminLogs: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [failedContent, setFailedContent] = useState<LogEntry[]>([]);
  const [queueStats, setQueueStats] = useState<QueueStats | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filters, setFilters] = useState({
    status: '',
    platform: '',
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [page, rowsPerPage, filters]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [logsRes, failedRes, statsRes, healthRes] = await Promise.all([
        axios.get(`${config.apiUrl}/api/admin/logs`, {
          headers,
          params: {
            page: page + 1,
            limit: rowsPerPage,
            ...filters
          }
        }),
        axios.get(`${config.apiUrl}/api/admin/failed-content`, { headers }),
        axios.get(`${config.apiUrl}/api/admin/stats/queue`, { headers }),
        axios.get(`${config.apiUrl}/api/admin/health`, { headers })
      ]);

      setLogs(logsRes.data.content || []);
      setFailedContent(failedRes.data || []);
      setQueueStats(statsRes.data || null);
      setSystemHealth(healthRes.data || null);
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async (contentId: string) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${config.apiUrl}/api/admin/retry/${contentId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Error retrying content:', error);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      scheduled: '#1976d2',
      published: '#2e7d32',
      failed: '#d32f2f',
      cancelled: '#666'
    };
    return colors[status] || '#666';
  };

  const getPlatformColor = (platform: string) => {
    const colors: { [key: string]: string } = {
      twitch: '#9146FF',
      twitter: '#1DA1F2',
      instagram: '#E4405F',
      discord: '#5865F2'
    };
    return colors[platform] || '#666';
  };

  const renderSystemHealth = () => (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography color="textSecondary" gutterBottom>
                  System Status
                </Typography>
                <Typography variant="h6">
                  {systemHealth?.status === 'healthy' ? 'Healthy' : 'Issues Detected'}
                </Typography>
              </Box>
              {systemHealth?.status === 'healthy' ? (
                <CheckCircle color="success" />
              ) : (
                <Error color="error" />
              )}
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography color="textSecondary" gutterBottom>
                  Failed Content
                </Typography>
                <Typography variant="h6">
                  {systemHealth?.content.failed || 0}
                </Typography>
              </Box>
              <Badge badgeContent={systemHealth?.content.failed || 0} color="error">
                <Warning color="error" />
              </Badge>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography color="textSecondary" gutterBottom>
                  Pending Content
                </Typography>
                <Typography variant="h6">
                  {systemHealth?.content.pending || 0}
                </Typography>
              </Box>
              <Schedule color="primary" />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography color="textSecondary" gutterBottom>
                  Queue Active
                </Typography>
                <Typography variant="h6">
                  {queueStats?.active || 0}
                </Typography>
              </Box>
              <TrendingUp color="success" />
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderFilters = () => (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>Filters</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={3}>
          <FormControl fullWidth size="small">
            <InputLabel>Status</InputLabel>
            <Select
              value={filters.status}
              label="Status"
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="scheduled">Scheduled</MenuItem>
              <MenuItem value="published">Published</MenuItem>
              <MenuItem value="failed">Failed</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <FormControl fullWidth size="small">
            <InputLabel>Platform</InputLabel>
            <Select
              value={filters.platform}
              label="Platform"
              onChange={(e) => setFilters({ ...filters, platform: e.target.value })}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="twitch">Twitch</MenuItem>
              <MenuItem value="twitter">Twitter</MenuItem>
              <MenuItem value="instagram">Instagram</MenuItem>
              <MenuItem value="discord">Discord</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <TextField
            fullWidth
            size="small"
            type="date"
            label="Start Date"
            value={filters.startDate}
            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        
        <Grid item xs={12} md={3}>
          <TextField
            fullWidth
            size="small"
            type="date"
            label="End Date"
            value={filters.endDate}
            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
      </Grid>
    </Paper>
  );

  const renderLogsTable = () => (
    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
      <TableContainer>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>User</TableCell>
              <TableCell>Platforms</TableCell>
              <TableCell>Content Type</TableCell>
              <TableCell>Scheduled For</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log._id} hover>
                <TableCell>
                  {log.userId?.username || 'Unknown'}
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    {log.platforms.map(platform => (
                      <Chip
                        key={platform}
                        label={platform}
                        size="small"
                        sx={{ bgcolor: getPlatformColor(platform), color: 'white' }}
                      />
                    ))}
                  </Box>
                </TableCell>
                <TableCell>{log.contentType}</TableCell>
                <TableCell>
                  {format(new Date(log.scheduledFor), 'MMM dd, yyyy HH:mm')}
                </TableCell>
                <TableCell>
                  <Chip
                    label={log.status}
                    size="small"
                    sx={{ bgcolor: getStatusColor(log.status), color: 'white' }}
                  />
                </TableCell>
                <TableCell>
                  {format(new Date(log.createdAt), 'MMM dd, yyyy')}
                </TableCell>
                <TableCell>
                  <IconButton
                    size="small"
                    onClick={() => setSelectedLog(log)}
                  >
                    <Visibility />
                  </IconButton>
                  {log.status === 'failed' && (
                    <IconButton
                      size="small"
                      onClick={() => handleRetry(log._id)}
                      color="primary"
                    >
                      <Retry />
                    </IconButton>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      
      <TablePagination
        rowsPerPageOptions={[10, 25, 50]}
        component="div"
        count={-1} // We don't have total count from the API
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={(e, newPage) => setPage(newPage)}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
      />
    </Paper>
  );

  const renderLogDialog = () => (
    <Dialog
      open={!!selectedLog}
      onClose={() => setSelectedLog(null)}
      maxWidth="md"
      fullWidth
    >
      {selectedLog && (
        <>
          <DialogTitle>
            Content Details - {selectedLog.userId?.username || 'Unknown User'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="textSecondary">Platforms</Typography>
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  {selectedLog.platforms.map(platform => (
                    <Chip
                      key={platform}
                      label={platform}
                      sx={{ bgcolor: getPlatformColor(platform), color: 'white' }}
                    />
                  ))}
                </Box>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="textSecondary">Status</Typography>
                <Chip
                  label={selectedLog.status}
                  sx={{ bgcolor: getStatusColor(selectedLog.status), color: 'white' }}
                />
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="textSecondary">Content Type</Typography>
                <Typography variant="body1">{selectedLog.contentType}</Typography>
              </Grid>
              
              {selectedLog.content.text && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="textSecondary">Text Content</Typography>
                  <Typography variant="body1">{selectedLog.content.text}</Typography>
                </Grid>
              )}
              
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="textSecondary">Scheduled For</Typography>
                <Typography variant="body1">
                  {format(new Date(selectedLog.scheduledFor), 'PPP p')}
                </Typography>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="textSecondary">Created</Typography>
                <Typography variant="body1">
                  {format(new Date(selectedLog.createdAt), 'PPP p')}
                </Typography>
              </Grid>
              
              {selectedLog.errorMessage && (
                <Grid item xs={12}>
                  <Alert severity="error">
                    <Typography variant="subtitle2">Error Message</Typography>
                    <Typography variant="body2">{selectedLog.errorMessage}</Typography>
                  </Alert>
                </Grid>
              )}
              
              {selectedLog.retryCount !== undefined && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="textSecondary">Retry Count</Typography>
                  <Typography variant="body1">{selectedLog.retryCount}</Typography>
                </Grid>
              )}
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSelectedLog(null)}>Close</Button>
            {selectedLog.status === 'failed' && (
              <Button
                startIcon={<Retry />}
                onClick={() => {
                  handleRetry(selectedLog._id);
                  setSelectedLog(null);
                }}
              >
                Retry
              </Button>
            )}
          </DialogActions>
        </>
      )}
    </Dialog>
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Admin Logs & Monitoring</Typography>
        <Button
          startIcon={<Refresh />}
          onClick={fetchData}
          variant="outlined"
        >
          Refresh
        </Button>
      </Box>

      {renderSystemHealth()}
      {renderFilters()}
      {renderLogsTable()}
      {renderLogDialog()}
    </Box>
  );
};

export default AdminLogs; 