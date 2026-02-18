/**
 * Dialog for editing user relationship data.
 * @module pages/Servers/EditRelationshipDialog
 */
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
import type { Relationship } from '@types';

/**
 * Props for EditRelationshipDialog.
 */
interface EditRelationshipDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** User ID to edit */
  userId: string;
  /** Existing relationship data */
  data?: Relationship;
  /** Callback when dialog is closed */
  onClose: () => void;
  /** Callback when relationship is saved */
  onSave: (userId: string, data: Relationship) => void;
}

/**
 * Dialog component for editing user relationship data.
 * @param props - Component props
 * @returns Rendered dialog component
 */
function EditRelationshipDialog({ userId, data, open, onClose, onSave }: EditRelationshipDialogProps) {
  const [editData, setEditData] = useState<Relationship>(data || { attitude: '', behavior: [], ignored: false });

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
