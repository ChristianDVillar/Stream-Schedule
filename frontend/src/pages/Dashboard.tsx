import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Button,
  Box,
  Avatar,
  Divider,
} from '@mui/material';
import { FaTwitch, FaSignOutAlt } from 'react-icons/fa';
import { config } from '../config/config';
import axios from 'axios';

interface Stream {
  id: string;
  title: string;
  scheduledStartTime: string;
  status: 'scheduled' | 'live' | 'ended';
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [streams, setStreams] = useState<Stream[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStreams();
  }, []);

  const fetchStreams = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${config.apiUrl}/api/streams`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStreams(response.data);
    } catch (error) {
      console.error('Error fetching streams:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) {
    return null;
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Grid container spacing={3}>
          {/* Profile Section */}
          <Grid item xs={12} md={4}>
            <Paper elevation={3} sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar
                  src={user.profileImageUrl}
                  alt={user.displayName}
                  sx={{ width: 64, height: 64, mr: 2 }}
                />
                <Box>
                  <Typography variant="h6">{user.displayName}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    @{user.username}
                  </Typography>
                </Box>
              </Box>
              <Divider sx={{ my: 2 }} />
              <Button
                fullWidth
                variant="outlined"
                color="secondary"
                startIcon={<span><FaSignOutAlt /></span>}
                onClick={handleLogout}
              >
                Logout
              </Button>
            </Paper>
          </Grid>

          {/* Streams Section */}
          <Grid item xs={12} md={8}>
            <Paper elevation={3} sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6">Your Streams</Typography>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<span><FaTwitch /></span>}
                  onClick={() => window.open('https://dashboard.twitch.tv/stream-manager', '_blank')}
                >
                  Go to Twitch Dashboard
                </Button>
              </Box>
              
              {isLoading ? (
                <Typography>Loading streams...</Typography>
              ) : streams.length === 0 ? (
                <Typography color="text.secondary">
                  No scheduled streams found. Schedule your next stream on Twitch!
                </Typography>
              ) : (
                <Grid container spacing={2}>
                  {streams.map((stream) => (
                    <Grid item xs={12} key={stream.id}>
                      <Paper variant="outlined" sx={{ p: 2 }}>
                        <Typography variant="subtitle1">{stream.title}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Scheduled for: {new Date(stream.scheduledStartTime).toLocaleString()}
                        </Typography>
                        <Typography
                          variant="body2"
                          color={
                            stream.status === 'live'
                              ? 'error'
                              : stream.status === 'scheduled'
                              ? 'primary'
                              : 'text.secondary'
                          }
                        >
                          Status: {stream.status.charAt(0).toUpperCase() + stream.status.slice(1)}
                        </Typography>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default Dashboard; 