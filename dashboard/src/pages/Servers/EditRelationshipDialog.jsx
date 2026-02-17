import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  TextField,
  FormControlLabel,
  Checkbox,
  Button,
} from '@mui/material';

/**
 * EditRelationshipDialog component
 * 
 * Note: When using this component, pass a `key` prop equal to `userId` to ensure
 * the form resets when editing different users:
 * <EditRelationshipDialog key={userId} userId={userId} ... />
 */
function EditRelationshipDialog({ open, userId, data, onClose, onSave }) {
  const [editData, setEditData] = useState(data || { attitude: '', behavior: [], ignored: false });

  const handleSave = () => {
    onSave(userId, editData);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle>Edit Relationship</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
          <TextField
            label="Attitude"
            value={editData?.attitude || ''}
            onChange={(e) => setEditData({ ...editData, attitude: e.target.value })}
            fullWidth
            variant="outlined"
          />
          <TextField
            label="Behaviors (comma separated)"
            value={editData?.behavior?.join(', ') || ''}
            onChange={(e) =>
              setEditData({
                ...editData,
                behavior: e.target.value.split(',').map((s) => s.trim()),
              })
            }
            multiline
            rows={3}
            fullWidth
            variant="outlined"
            helperText="Specific behaviors for this user"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={editData?.ignored || false}
                onChange={(e) =>
                  setEditData({ ...editData, ignored: e.target.checked })
                }
                color="primary"
              />
            }
            label="Ignore this user"
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2.5 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button onClick={handleSave} variant="contained" color="primary">
          Save Changes
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default EditRelationshipDialog;
