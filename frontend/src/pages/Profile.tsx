import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';

const Profile: React.FC = () => {
  const { user, logout } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom align="center">
            Profile
          </Typography>
          <List>
            <ListItem>
              <ListItemText
                primary="Username"
                secondary={user.username}
              />
            </ListItem>
            <Divider />
            <ListItem>
              <ListItemText
                primary="Email"
                secondary={user?.email || 'Not available'}
              />
            </ListItem>
          </List>
          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Button
              variant="contained"
              color="secondary"
              onClick={logout}
            >
              Logout
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Profile; 