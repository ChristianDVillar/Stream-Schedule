import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  IconButton,
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import DeleteIcon from '@mui/icons-material/Delete';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { useAuth } from '../contexts/AuthContext';

interface InstagramPostProps {
  onSchedule: (post: any) => void;
}

export const InstagramPost: React.FC<InstagramPostProps> = ({ onSchedule }) => {
  const { user } = useAuth();
  const [caption, setCaption] = useState('');
  const [mediaType, setMediaType] = useState<'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM'>('IMAGE');
  const [scheduledTime, setScheduledTime] = useState<Date | null>(null);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  const handleMediaChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const files = Array.from(event.target.files);
      setMediaFiles(files);
      
      // Create previews
      const newPreviews = files.map(file => URL.createObjectURL(file));
      setPreviews(newPreviews);
    }
  };

  const handleRemoveMedia = (index: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!mediaFiles.length || !scheduledTime) return;

    const formData = new FormData();
    formData.append('caption', caption);
    formData.append('mediaType', mediaType);
    formData.append('scheduledTime', scheduledTime.toISOString());
    mediaFiles.forEach((file, index) => {
      formData.append(`media${index}`, file);
    });

    try {
      const response = await fetch('/api/content/instagram', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to schedule post');

      const data = await response.json();
      onSchedule(data);
      
      // Reset form
      setCaption('');
      setMediaType('IMAGE');
      setScheduledTime(null);
      setMediaFiles([]);
      setPreviews([]);
    } catch (error) {
      console.error('Error scheduling Instagram post:', error);
    }
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Schedule Instagram Post
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Media Type</InputLabel>
              <Select
                value={mediaType}
                label="Media Type"
                onChange={(e) => setMediaType(e.target.value as any)}
              >
                <MenuItem value="IMAGE">Image</MenuItem>
                <MenuItem value="VIDEO">Video</MenuItem>
                <MenuItem value="CAROUSEL_ALBUM">Carousel</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />
          </Grid>

          <Grid item xs={12}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DateTimePicker
                label="Schedule Time"
                value={scheduledTime}
                onChange={(newValue: Date | null) => setScheduledTime(newValue)}
              />
            </LocalizationProvider>
          </Grid>

          <Grid item xs={12}>
            <Button
              component="label"
              variant="outlined"
              startIcon={<CloudUploadIcon />}
            >
              Upload Media
              <input
                type="file"
                hidden
                multiple
                accept={mediaType === 'VIDEO' ? 'video/*' : 'image/*'}
                onChange={handleMediaChange}
              />
            </Button>
          </Grid>

          {previews.length > 0 && (
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                {previews.map((preview, index) => (
                  <Box
                    key={index}
                    sx={{
                      position: 'relative',
                      width: 150,
                      height: 150,
                    }}
                  >
                    {mediaType === 'VIDEO' ? (
                      <video
                        src={preview}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    )}
                    <IconButton
                      sx={{
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        '&:hover': {
                          backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        },
                      }}
                      onClick={() => handleRemoveMedia(index)}
                    >
                      <DeleteIcon sx={{ color: 'white' }} />
                    </IconButton>
                  </Box>
                ))}
              </Box>
            </Grid>
          )}

          <Grid item xs={12}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSubmit}
              disabled={!mediaFiles.length || !scheduledTime}
            >
              Schedule Post
            </Button>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}; 