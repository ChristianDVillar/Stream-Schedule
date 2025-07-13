import React, { useState, useEffect } from 'react';
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
  Chip,
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import DeleteIcon from '@mui/icons-material/Delete';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { useAuth } from '../contexts/AuthContext';

interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
}

interface DiscordChannel {
  id: string;
  name: string;
  type: number;
}

interface DiscordPostProps {
  onSchedule: (post: any) => void;
}

export const DiscordPost: React.FC<DiscordPostProps> = ({ onSchedule }) => {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [scheduledTime, setScheduledTime] = useState<Date | null>(null);
  const [selectedGuild, setSelectedGuild] = useState<string>('');
  const [selectedChannel, setSelectedChannel] = useState<string>('');
  const [guilds, setGuilds] = useState<DiscordGuild[]>([]);
  const [channels, setChannels] = useState<DiscordChannel[]>([]);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isEvent, setIsEvent] = useState(false);
  const [eventDetails, setEventDetails] = useState({
    name: '',
    description: '',
    location: '',
  });

  useEffect(() => {
    // Fetch user's Discord guilds
    const fetchGuilds = async () => {
      try {
        const response = await fetch('/api/discord/guilds');
        if (response.ok) {
          const data = await response.json();
          setGuilds(data);
        }
      } catch (error) {
        console.error('Error fetching Discord guilds:', error);
      }
    };

    fetchGuilds();
  }, []);

  useEffect(() => {
    // Fetch channels for selected guild
    const fetchChannels = async () => {
      if (!selectedGuild) return;

      try {
        const response = await fetch(`/api/discord/guilds/${selectedGuild}/channels`);
        if (response.ok) {
          const data = await response.json();
          setChannels(data);
        }
      } catch (error) {
        console.error('Error fetching Discord channels:', error);
      }
    };

    fetchChannels();
  }, [selectedGuild]);

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
    if (!scheduledTime || (!content && !isEvent) || !selectedChannel) return;

    const formData = new FormData();
    formData.append('content', content);
    formData.append('scheduledTime', scheduledTime.toISOString());
    formData.append('channelId', selectedChannel);
    formData.append('isEvent', String(isEvent));
    
    if (isEvent) {
      formData.append('eventName', eventDetails.name);
      formData.append('eventDescription', eventDetails.description);
      formData.append('eventLocation', eventDetails.location);
    }

    mediaFiles.forEach((file, index) => {
      formData.append(`media${index}`, file);
    });

    try {
      const response = await fetch('/api/content/discord', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to schedule post');

      const data = await response.json();
      onSchedule(data);
      
      // Reset form
      setContent('');
      setScheduledTime(null);
      setSelectedGuild('');
      setSelectedChannel('');
      setMediaFiles([]);
      setPreviews([]);
      setIsEvent(false);
      setEventDetails({ name: '', description: '', location: '' });
    } catch (error) {
      console.error('Error scheduling Discord post:', error);
    }
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Schedule Discord {isEvent ? 'Event' : 'Message'}
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Server</InputLabel>
              <Select
                value={selectedGuild}
                label="Server"
                onChange={(e) => setSelectedGuild(e.target.value)}
              >
                {guilds.map((guild) => (
                  <MenuItem key={guild.id} value={guild.id}>
                    {guild.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Channel</InputLabel>
              <Select
                value={selectedChannel}
                label="Channel"
                onChange={(e) => setSelectedChannel(e.target.value)}
                disabled={!selectedGuild}
              >
                {channels.map((channel) => (
                  <MenuItem key={channel.id} value={channel.id}>
                    #{channel.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <Chip
              label={isEvent ? 'Switch to Message' : 'Switch to Event'}
              onClick={() => setIsEvent(!isEvent)}
              color={isEvent ? 'primary' : 'default'}
            />
          </Grid>

          {isEvent ? (
            <>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Event Name"
                  value={eventDetails.name}
                  onChange={(e) => setEventDetails(prev => ({ ...prev, name: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Event Description"
                  value={eventDetails.description}
                  onChange={(e) => setEventDetails(prev => ({ ...prev, description: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Event Location"
                  value={eventDetails.location}
                  onChange={(e) => setEventDetails(prev => ({ ...prev, location: e.target.value }))}
                />
              </Grid>
            </>
          ) : (
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Message Content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </Grid>
          )}

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
                accept="image/*,video/*"
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
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
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
              disabled={
                !scheduledTime ||
                !selectedChannel ||
                (!content && !isEvent) ||
                (isEvent && !eventDetails.name)
              }
            >
              Schedule {isEvent ? 'Event' : 'Message'}
            </Button>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}; 