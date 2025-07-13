import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
} from '@mui/material';
import StreamTitle from './StreamTitle';
import StreamTime from './StreamTime';
import StreamStatus from './StreamStatus';
import StreamActions from './StreamActions';

interface Stream {
  id: string;
  title: string;
  scheduledStartTime: string;
  status: 'scheduled' | 'live' | 'ended';
}

interface StreamCardProps {
  stream: Stream;
  onEdit: (stream: Stream) => void;
  onDelete: (streamId: string) => void;
}

const StreamCard: React.FC<StreamCardProps> = ({ stream, onEdit, onDelete }) => {
  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <StreamTitle title={stream.title} />
            <StreamTime startTime={stream.scheduledStartTime} />
            <StreamStatus status={stream.status} />
          </Box>
          <StreamActions
            stream={stream}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </Box>
      </CardContent>
    </Card>
  );
};

export default StreamCard; 