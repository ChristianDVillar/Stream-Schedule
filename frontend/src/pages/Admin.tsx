import React, { useState } from 'react';
import {
  Box,
  Tabs,
  Tab,
  Paper,
  Typography,
  Container
} from '@mui/material';
import Calendar from '../components/Calendar';
import AdminLogs from '../components/AdminLogs';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `admin-tab-${index}`,
    'aria-controls': `admin-tabpanel-${index}`,
  };
}

const Admin: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleAddContent = () => {
    // Navigate to content creation
    console.log('Navigate to add content');
  };

  const handleEditContent = (content: any) => {
    // Navigate to content editing
    console.log('Edit content:', content);
  };

  const handleViewContent = (content: any) => {
    // Show content details
    console.log('View content:', content);
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Admin Dashboard
        </Typography>
        
        <Paper sx={{ width: '100%' }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              aria-label="admin tabs"
            >
              <Tab label="Calendar View" {...a11yProps(0)} />
              <Tab label="System Logs" {...a11yProps(1)} />
            </Tabs>
          </Box>
          
          <TabPanel value={tabValue} index={0}>
            <Calendar
              onAddContent={handleAddContent}
              onEditContent={handleEditContent}
              onViewContent={handleViewContent}
            />
          </TabPanel>
          
          <TabPanel value={tabValue} index={1}>
            <AdminLogs />
          </TabPanel>
        </Paper>
      </Box>
    </Container>
  );
};

export default Admin; 