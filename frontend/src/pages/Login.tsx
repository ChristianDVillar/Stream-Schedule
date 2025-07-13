import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Container,
  Paper,
  Button,
  Typography,
  Box,
  Divider,
} from '@mui/material';
import { FaTwitch } from 'react-icons/fa';
import { config } from '../config/config';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleTwitchLogin = () => {
    window.location.href = `${config.apiUrl}/api/auth/twitch`;
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom align="center">
            Welcome to Streamer Scheduler
          </Typography>
          <Typography variant="body1" align="center" sx={{ mb: 4 }}>
            Connect with your Twitch account to get started
          </Typography>
          
          <Button
            fullWidth
            variant="contained"
            color="secondary"
            startIcon={<span><FaTwitch size={20} /></span>}
            onClick={handleTwitchLogin}
            sx={{
              backgroundColor: '#9146FF',
              '&:hover': {
                backgroundColor: '#7B2CBF',
              },
              py: 1.5,
              mb: 2,
            }}
          >
            Login with Twitch
          </Button>

          <Divider sx={{ my: 3 }}>
            <Typography variant="body2" color="text.secondary">
              or
            </Typography>
          </Divider>

          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Don't have a Twitch account?{' '}
              <Link 
                to="https://www.twitch.tv/signup" 
                target="_blank"
                style={{ 
                  textDecoration: 'none',
                  color: '#9146FF',
                }}
              >
                Create one here
              </Link>
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Login; 