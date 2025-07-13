import React from 'react';
import { Grid } from '@mui/material';
import StreamCard from './StreamCard';

interface Stream {
  id: string;
  title: string;
  scheduledStartTime: string;
  status: 'scheduled' | 'live' | 'ended';
}

interface StreamListProps {
  streams: Stream[];
  onEdit: (stream: Stream) => void;
  onDelete: (streamId: string) => void;
}

const StreamList: React.FC<StreamListProps> = ({ streams, onEdit, onDelete }) => {
  return (
    <Grid container spacing={2}>
      {streams.map((stream) => (
        <Grid item xs={12} sm={6} md={4} key={stream.id}>
          <StreamCard
            stream={stream}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </Grid>
      ))}
    </Grid>
  );
};

export default StreamList; 