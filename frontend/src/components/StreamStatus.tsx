import React from 'react';
import { Chip } from '@mui/material';

interface StreamStatusProps {
  status: 'scheduled' | 'live' | 'ended';
}

const StreamStatus: React.FC<StreamStatusProps> = ({ status }) => {
  const getStatusColor = (status: StreamStatusProps['status']) => {
    switch (status) {
      case 'live':
        return 'error';
      case 'scheduled':
        return 'primary';
      default:
        return 'default';
    }
  };

  return (
    <Chip
      label={status.charAt(0).toUpperCase() + status.slice(1)}
      color={getStatusColor(status)}
      size="small"
    />
  );
};

export default StreamStatus; 