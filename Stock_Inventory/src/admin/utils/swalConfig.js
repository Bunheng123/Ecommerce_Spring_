/**
 * Centralized SweetAlert2 configuration for the admin panel.
 *
 * Styled to match the flat, black-and-white design system used throughout
 * the admin UI: square corners, white background, black text, no colored
 * fills, minimal shadow.
 *
 * Usage:
 *   import { Toast, ConfirmDialog, AlertDialog } from '../utils/swalConfig';
 *
 *   // Success / warning toast (top-right, auto-dismisses)
 *   Toast.fire({ title: 'User created successfully' });
 *   Toast.fire({ icon: 'warning', title: 'Photo upload failed' });
 *
 *   // Destructive confirmation dialog (returns result)
 *   const result = await ConfirmDialog.fire({
 *     title: 'Delete User?',
 *     text: 'This cannot be undone.',
 *   });
 *   if (result.isConfirmed) { ... }
 *
 *   // Error / info alert dialog
 *   AlertDialog.fire({ title: 'Delete Failed', text: 'User not found.' });
 */

import Swal from 'sweetalert2';

// ─── Shared base styles ────────────────────────────────────────────────────

const BASE_CUSTOM_CLASS = {
  popup:         'rounded-xl border border-neutral-200 shadow-md font-sans',
  title:         'text-sm font-black uppercase tracking-wider text-neutral-900 pt-2',
  htmlContainer: 'text-xs text-neutral-600 font-medium',
  confirmButton: 'h-9 px-5 bg-neutral-900 text-white text-[11px] font-black uppercase tracking-wider rounded-xl hover:bg-neutral-800 transition-colors cursor-pointer focus:outline-none',
  cancelButton:  'h-9 px-5 bg-white text-neutral-900 border border-neutral-300 text-[11px] font-black uppercase tracking-wider rounded-xl hover:bg-neutral-50 hover:border-neutral-900 transition-colors cursor-pointer focus:outline-none',
  actions:       'gap-2 mt-1',
};

const BASE_OPTIONS = {
  customClass:    BASE_CUSTOM_CLASS,
  buttonsStyling: false,   // required — lets our classes control colors, not SweetAlert
  background:     '#ffffff',
  color:          '#171717',
};

// ─── Toast ─────────────────────────────────────────────────────────────────
// Non-blocking, top-right, auto-dismisses after 3 s.
// Use for: create/edit/delete success, photo warnings.
export const Toast = Swal.mixin({
  ...BASE_OPTIONS,
  toast:              true,
  position:           'top-end',
  showConfirmButton:  false,
  timer:              3000,
  timerProgressBar:   true,
  customClass: {
    ...BASE_CUSTOM_CLASS,
    popup:             'rounded-xl border border-neutral-200 shadow-lg font-sans text-xs font-bold text-neutral-900',
    timerProgressBar:  'bg-neutral-900',
  },
});

// ─── Confirmation dialog ────────────────────────────────────────────────────
// Requires explicit confirm click; shows Cancel + Confirm.
// Use for: delete user, any irreversible action.
export const ConfirmDialog = Swal.mixin({
  ...BASE_OPTIONS,
  icon:              undefined,
  showCancelButton:  true,
  confirmButtonText: 'Confirm',
  cancelButtonText:  'Cancel',
  reverseButtons:    true,
  focusCancel:       true,
});

// ─── Alert dialog ───────────────────────────────────────────────────────────
// Single OK button. No colored icon fill.
// Use for: validation errors, session expired, prohibited actions.
export const AlertDialog = Swal.mixin({
  ...BASE_OPTIONS,
  icon:              undefined,
  confirmButtonText: 'OK',
});
