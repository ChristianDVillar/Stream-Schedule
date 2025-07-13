import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Card,
  CardContent,
  Badge,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material';
import {
  ChevronLeft,
  ChevronRight,
  Add,
  Edit,
  Delete,
  Visibility
} from '@mui/icons-material';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import axios from 'axios';
import { config } from '../config/config';

interface ScheduledContent {
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
}

interface CalendarProps {
  onAddContent?: () => void;
  onEditContent?: (content: ScheduledContent) => void;
  onViewContent?: (content: ScheduledContent) => void;
}

const Calendar: React.FC<CalendarProps> = ({
  onAddContent,
  onEditContent,
  onViewContent
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [scheduledContent, setScheduledContent] = useState<ScheduledContent[]>([]);
  const [selectedContent, setSelectedContent] = useState<ScheduledContent | null>(null);
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchScheduledContent();
  }, [currentDate]);

  const fetchScheduledContent = async () => {
    try {
      const token = localStorage.getItem('token');
      const startDate = startOfMonth(currentDate);
      const endDate = endOfMonth(currentDate);
      
      const response = await axios.get(`${config.apiUrl}/api/content`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          limit: 100
        }
      });
      
      setScheduledContent(response.data.content || []);
    } catch (error) {
      console.error('Error fetching scheduled content:', error);
    } finally {
      setLoading(false);
    }
  };

  const getContentForDate = (date: Date) => {
    return scheduledContent.filter(content => 
      isSameDay(new Date(content.scheduledFor), date)
    );
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

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      scheduled: '#1976d2',
      published: '#2e7d32',
      failed: '#d32f2f',
      cancelled: '#666'
    };
    return colors[status] || '#666';
  };

  const handlePreviousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const handleDateClick = (date: Date) => {
    const contentForDate = getContentForDate(date);
    if (contentForDate.length > 0) {
      setSelectedContent(contentForDate[0]);
    }
  };

  const renderCalendarHeader = () => (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <IconButton onClick={handlePreviousMonth}>
          <ChevronLeft />
        </IconButton>
        <Typography variant="h5" component="h2">
          {format(currentDate, 'MMMM yyyy')}
        </Typography>
        <IconButton onClick={handleNextMonth}>
          <ChevronRight />
        </IconButton>
      </Box>
      
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(e, newMode) => newMode && setViewMode(newMode)}
          size="small"
        >
          <ToggleButton value="month">Month</ToggleButton>
          <ToggleButton value="week">Week</ToggleButton>
        </ToggleButtonGroup>
        
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={onAddContent}
        >
          Schedule Content
        </Button>
      </Box>
    </Box>
  );

  const renderCalendarGrid = () => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    const days = eachDayOfInterval({ start, end });

    // Add padding days to start on Sunday
    const startDay = start.getDay();
    const paddingDays = Array.from({ length: startDay }, (_, i) => null);

    const allDays = [...paddingDays, ...days];

    return (
      <Grid container spacing={1}>
        {/* Day headers */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <Grid item xs key={day}>
            <Paper sx={{ p: 1, textAlign: 'center', bgcolor: 'grey.100' }}>
              <Typography variant="subtitle2" fontWeight="bold">
                {day}
              </Typography>
            </Paper>
          </Grid>
        ))}
        
        {/* Calendar days */}
        {allDays.map((day, index) => (
          <Grid item xs key={index}>
            {day ? (
              <Paper
                sx={{
                  p: 1,
                  minHeight: 120,
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'grey.50' },
                  border: isSameDay(day, new Date()) ? 2 : 1,
                  borderColor: isSameDay(day, new Date()) ? 'primary.main' : 'grey.300'
                }}
                onClick={() => handleDateClick(day)}
              >
                <Typography variant="body2" sx={{ mb: 1 }}>
                  {format(day, 'd')}
                </Typography>
                
                {getContentForDate(day).map((content, contentIndex) => (
                  <Box key={content._id} sx={{ mb: 0.5 }}>
                    <Chip
                      label={`${content.platforms.join(', ')} - ${content.contentType}`}
                      size="small"
                      sx={{
                        fontSize: '0.7rem',
                        height: 20,
                        bgcolor: getPlatformColor(content.platforms[0]),
                        color: 'white',
                        '& .MuiChip-label': { px: 1 }
                      }}
                    />
                    <Chip
                      label={content.status}
                      size="small"
                      sx={{
                        fontSize: '0.6rem',
                        height: 16,
                        bgcolor: getStatusColor(content.status),
                        color: 'white',
                        ml: 0.5,
                        '& .MuiChip-label': { px: 0.5 }
                      }}
                    />
                  </Box>
                ))}
              </Paper>
            ) : (
              <Paper sx={{ p: 1, minHeight: 120, bgcolor: 'grey.50' }} />
            )}
          </Grid>
        ))}
      </Grid>
    );
  };

  const renderContentDialog = () => (
    <Dialog
      open={!!selectedContent}
      onClose={() => setSelectedContent(null)}
      maxWidth="md"
      fullWidth
    >
      {selectedContent && (
        <>
          <DialogTitle>
            Scheduled Content - {format(new Date(selectedContent.scheduledFor), 'PPP')}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6">Platforms</Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                {selectedContent.platforms.map(platform => (
                  <Chip
                    key={platform}
                    label={platform}
                    sx={{ bgcolor: getPlatformColor(platform), color: 'white' }}
                  />
                ))}
              </Box>
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6">Content Type</Typography>
              <Typography variant="body1">{selectedContent.contentType}</Typography>
            </Box>
            
            {selectedContent.content.text && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="h6">Text</Typography>
                <Typography variant="body1">{selectedContent.content.text}</Typography>
              </Box>
            )}
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6">Status</Typography>
              <Chip
                label={selectedContent.status}
                sx={{ bgcolor: getStatusColor(selectedContent.status), color: 'white' }}
              />
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6">Scheduled For</Typography>
              <Typography variant="body1">
                {format(new Date(selectedContent.scheduledFor), 'PPP p')}
              </Typography>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSelectedContent(null)}>Close</Button>
            {onViewContent && (
              <Button
                startIcon={<Visibility />}
                onClick={() => {
                  onViewContent(selectedContent);
                  setSelectedContent(null);
                }}
              >
                View Details
              </Button>
            )}
            {onEditContent && selectedContent.status === 'scheduled' && (
              <Button
                startIcon={<Edit />}
                onClick={() => {
                  onEditContent(selectedContent);
                  setSelectedContent(null);
                }}
              >
                Edit
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
        <Typography>Loading calendar...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3 }}>
        {renderCalendarHeader()}
        {renderCalendarGrid()}
      </Paper>
      {renderContentDialog()}
    </Box>
  );
};

export default Calendar; 