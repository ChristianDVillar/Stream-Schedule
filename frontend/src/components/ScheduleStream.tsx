import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { config } from '../config/config';
import axios from 'axios';

interface ScheduleStreamProps {
  open: boolean;
  onClose: () => void;
  onSchedule: () => void;
}

const ScheduleStream: React.FC<ScheduleStreamProps> = ({ open, onClose, onSchedule }) => {
  const [title, setTitle] = useState('');
  const [scheduledTime, setScheduledTime] = useState<Date | null>(new Date());

  const handleSubmit = async () => {
    if (!title || !scheduledTime) return;

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${config.apiUrl}/api/streams`,
        {
          title,
          scheduledStartTime: scheduledTime.toISOString(),
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      onSchedule();
      onClose();
    } catch (error) {
      console.error('Error scheduling stream:', error);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Schedule New Stream</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <TextField
            fullWidth
            label="Stream Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            margin="normal"
          />
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DateTimePicker
              label="Start Time"
              value={scheduledTime}
              onChange={(newValue: Date | null) => setScheduledTime(newValue)}
              sx={{ mt: 2, width: '100%' }}
            />
          </LocalizationProvider>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="primary"
          disabled={!title || !scheduledTime}
        >
          Schedule
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ScheduleStream; 