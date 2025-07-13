import React from 'react';
import { Typography } from '@mui/material';

interface StreamTitleProps {
  title: string;
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'subtitle1' | 'subtitle2' | 'body1' | 'body2';
}

const StreamTitle: React.FC<StreamTitleProps> = ({ title, variant = 'h6' }) => {
  return (
    <Typography variant={variant} component="div" gutterBottom>
      {title}
    </Typography>
  );
};

export default StreamTitle; 