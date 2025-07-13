import React from 'react';
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

interface Stream {
  id: string;
  title: string;
  scheduledStartTime: string;
  status: 'scheduled' | 'live' | 'ended';
}

interface StreamFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (stream: Omit<Stream, 'id' | 'status'>) => void;
  initialValues?: Partial<Stream>;
}

const StreamForm: React.FC<StreamFormProps> = ({
  open,
  onClose,
  onSubmit,
  initialValues,
}) => {
  const [title, setTitle] = React.useState(initialValues?.title || '');
  const [scheduledTime, setScheduledTime] = React.useState<Date | null>(
    initialValues?.scheduledStartTime ? new Date(initialValues.scheduledStartTime) : new Date()
  );

  React.useEffect(() => {
    if (initialValues) {
      setTitle(initialValues.title || '');
      setScheduledTime(
        initialValues.scheduledStartTime ? new Date(initialValues.scheduledStartTime) : new Date()
      );
    }
  }, [initialValues]);

  const handleSubmit = () => {
    if (!title || !scheduledTime) return;

    onSubmit({
      title,
      scheduledStartTime: scheduledTime.toISOString(),
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {initialValues ? 'Edit Stream' : 'Schedule New Stream'}
      </DialogTitle>
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
          {initialValues ? 'Save Changes' : 'Schedule'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default StreamForm; 