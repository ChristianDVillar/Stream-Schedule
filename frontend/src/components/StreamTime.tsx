import React from 'react';
import { Typography } from '@mui/material';
import { format, formatDistanceToNow } from 'date-fns';

interface StreamTimeProps {
  startTime: string;
  showRelative?: boolean;
}

const StreamTime: React.FC<StreamTimeProps> = ({ startTime, showRelative = false }) => {
  const date = new Date(startTime);

  return (
    <Typography variant="body2" color="text.secondary">
      {showRelative
        ? formatDistanceToNow(date, { addSuffix: true })
        : format(date, 'PPp')}
    </Typography>
  );
};

export default StreamTime; 