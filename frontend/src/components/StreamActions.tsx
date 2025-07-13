import React from 'react';
import {
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';

interface Stream {
  id: string;
  title: string;
  scheduledStartTime: string;
  status: 'scheduled' | 'live' | 'ended';
}

interface StreamActionsProps {
  stream: Stream;
  onEdit: (stream: Stream) => void;
  onDelete: (streamId: string) => void;
}

const StreamActions: React.FC<StreamActionsProps> = ({ stream, onEdit, onDelete }) => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEdit = () => {
    onEdit(stream);
    handleMenuClose();
  };

  const handleDelete = () => {
    onDelete(stream.id);
    handleMenuClose();
  };

  return (
    <>
      <IconButton onClick={handleMenuOpen}>
        <MoreVertIcon />
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEdit}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDelete}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
};

export default StreamActions; 